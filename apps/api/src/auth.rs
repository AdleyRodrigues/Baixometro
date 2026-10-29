//! Autenticação real (Fase 11): Argon2 para hash de senhas + JWT (`jsonwebtoken`).
//!
//! O middleware `auth_middleware` lê o header `Authorization: Bearer <token>`,
//! valida a assinatura e expiração usando `JWT_SECRET` e injeta `CurrentUser`
//! nas extensions da requisição.

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use axum::{
    extract::{Request, State},
    http::{header, StatusCode},
    middleware::Next,
    response::Response,
    Extension, Json,
};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    models::{AuthResponse, LoginRequest, RegisterRequest, UpdateUserSettingsRequest, User},
    AppState,
};

/// Segredo padrão em ambiente de desenvolvimento caso `JWT_SECRET` não esteja definido.
const DEFAULT_DEV_JWT_SECRET: &str = "baixometro_dev_jwt_secret_change_in_prod";

/// Tempo de expiração do JWT em dias.
const JWT_EXPIRATION_DAYS: i64 = 30;

/// Usuário autenticado da requisição corrente, injetado nas extensions pelo `auth_middleware`.
#[derive(Debug, Clone, Copy)]
pub struct CurrentUser {
    pub id: Uuid,
}

/// Claims armazenados no payload do JWT.
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    /// Subject (`user_id` em formato UUID).
    pub sub: String,
    /// Email do usuário.
    pub email: String,
    /// Timestamp Unix de expiração.
    pub exp: usize,
    /// Timestamp Unix de emissão.
    pub iat: usize,
}

#[derive(Debug, FromRow)]
struct UserAuthRow {
    id: Uuid,
    name: String,
    email: String,
    password_hash: String,
    share_data: bool,
    created_at: chrono::DateTime<Utc>,
}

fn jwt_secret() -> String {
    std::env::var("JWT_SECRET").unwrap_or_else(|_| DEFAULT_DEV_JWT_SECRET.to_string())
}

/// Gera o hash Argon2id de uma senha em texto plano.
pub fn hash_password(password: &str) -> AppResult<String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    argon2
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|err| AppError::Internal(anyhow::anyhow!("Falha ao gerar hash Argon2: {err}")))
}

/// Verifica se uma senha em texto plano corresponde ao hash Argon2 salvo.
pub fn verify_password(password: &str, password_hash: &str) -> bool {
    let Ok(parsed_hash) = PasswordHash::new(password_hash) else {
        return false;
    };
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok()
}

/// Cria um token JWT assinado para o usuário informado.
pub fn create_jwt(user_id: Uuid, email: &str) -> AppResult<String> {
    let now = Utc::now();
    let exp = (now + Duration::days(JWT_EXPIRATION_DAYS)).timestamp() as usize;
    let iat = now.timestamp() as usize;

    let claims = Claims {
        sub: user_id.to_string(),
        email: email.to_string(),
        exp,
        iat,
    };

    let secret = jwt_secret();
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|err| AppError::Internal(anyhow::anyhow!("Falha ao assinar JWT: {err}")))
}

/// Valida um token JWT e retorna o `user_id` (`Uuid`).
pub fn verify_jwt(token: &str) -> AppResult<Uuid> {
    let secret = jwt_secret();
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|_| AppError::Unauthorized("Sessão inválida ou expirada".to_string()))?;

    Uuid::parse_str(&token_data.claims.sub).map_err(|_| {
        AppError::Unauthorized("Identificador de usuário inválido no token".to_string())
    })
}

/// Middleware de autenticação real via header `Authorization: Bearer <token>`.
pub async fn auth_middleware(mut req: Request, next: Next) -> Result<Response, AppError> {
    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| AppError::Unauthorized("Token de autenticação não fornecido".to_string()))?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .or_else(|| auth_header.strip_prefix("bearer "))
        .map(str::trim)
        .filter(|t| !t.is_empty())
        .ok_or_else(|| {
            AppError::Unauthorized(
                "Formato de autorização inválido (use Bearer <token>)".to_string(),
            )
        })?;

    let user_id = verify_jwt(token)?;
    req.extensions_mut().insert(CurrentUser { id: user_id });

    Ok(next.run(req).await)
}

/// `POST /auth/register` — Registra um novo usuário com Argon2 e retorna o token JWT.
pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> AppResult<(StatusCode, Json<AuthResponse>)> {
    let name = payload.name.trim();
    if name.is_empty() {
        return Err(AppError::Validation("O nome é obrigatório".to_string()));
    }

    let email = payload.email.trim().to_lowercase();
    if email.is_empty() || !email.contains('@') {
        return Err(AppError::Validation("Informe um e-mail válido".to_string()));
    }

    if payload.password.len() < 6 {
        return Err(AppError::Validation(
            "A senha deve ter pelo menos 6 caracteres".to_string(),
        ));
    }

    // Verifica se o email já está cadastrado
    let existing: Option<(Uuid,)> =
        sqlx::query_as("SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1")
            .bind(&email)
            .fetch_optional(&state.pool)
            .await?;

    if existing.is_some() {
        return Err(AppError::Conflict(
            "Já existe uma conta cadastrada com este e-mail".to_string(),
        ));
    }

    let password_hash = hash_password(&payload.password)?;

    let user = sqlx::query_as::<_, User>(
        r#"
        INSERT INTO users (name, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, name, email, share_data, created_at
        "#,
    )
    .bind(name)
    .bind(&email)
    .bind(&password_hash)
    .fetch_one(&state.pool)
    .await?;

    let token = create_jwt(user.id, &user.email)?;

    Ok((StatusCode::CREATED, Json(AuthResponse { token, user })))
}

/// `POST /auth/login` — Autentica um usuário por e-mail e senha (Argon2) e retorna o token JWT.
pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> AppResult<Json<AuthResponse>> {
    let email = payload.email.trim().to_lowercase();
    if email.is_empty() || payload.password.is_empty() {
        return Err(AppError::Validation(
            "Informe seu e-mail e senha".to_string(),
        ));
    }

    let row = sqlx::query_as::<_, UserAuthRow>(
        r#"
        SELECT id, name, email, password_hash, share_data, created_at
        FROM users
        WHERE LOWER(email) = $1
        LIMIT 1
        "#,
    )
    .bind(&email)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::Unauthorized("E-mail ou senha incorretos".to_string()))?;

    if !verify_password(&payload.password, &row.password_hash) {
        return Err(AppError::Unauthorized(
            "E-mail ou senha incorretos".to_string(),
        ));
    }

    let user = User {
        id: row.id,
        name: row.name,
        email: row.email,
        share_data: row.share_data,
        created_at: row.created_at,
    };

    let token = create_jwt(user.id, &user.email)?;

    Ok(Json(AuthResponse { token, user }))
}

/// `PUT /auth/settings` — Atualiza a preferência de crowdsourcing (`share_data`) do usuário
/// e sincroniza o campo `is_public` nas observações de preço existentes desse usuário.
pub async fn update_user_settings(
    State(state): State<AppState>,
    Extension(current_user): Extension<CurrentUser>,
    Json(payload): Json<UpdateUserSettingsRequest>,
) -> AppResult<Json<User>> {
    let mut tx = state.pool.begin().await?;

    let user = sqlx::query_as::<_, User>(
        r#"
        UPDATE users
        SET share_data = $1
        WHERE id = $2
        RETURNING id, name, email, share_data, created_at
        "#,
    )
    .bind(payload.share_data)
    .bind(current_user.id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| AppError::NotFound("Usuário não encontrado".to_string()))?;

    sqlx::query(
        r#"
        UPDATE price_observations po
        SET is_public = $1
        FROM receipt_items ri
        JOIN receipts r ON r.id = ri.receipt_id
        WHERE po.receipt_item_id = ri.id
          AND r.user_id = $2
        "#,
    )
    .bind(payload.share_data)
    .bind(current_user.id)
    .execute(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(user))
}

#[cfg(test)]
mod tests {
    use super::*;
    use ts_rs::TS;

    #[test]
    fn password_hash_and_verify_roundtrip() {
        let hash = hash_password("senha_super_secreta_123").expect("hash deve funcionar");
        assert!(verify_password("senha_super_secreta_123", &hash));
        assert!(!verify_password("senha_errada", &hash));
    }

    #[test]
    fn jwt_create_and_verify_roundtrip() {
        let user_id = Uuid::new_v4();
        let token = create_jwt(user_id, "teste@baixometro.dev").expect("jwt deve ser criado");
        let decoded_id = verify_jwt(&token).expect("jwt deve ser válido");
        assert_eq!(user_id, decoded_id);
    }

    #[test]
    fn export_auth_ts_bindings() {
        RegisterRequest::export().expect("Falha ao exportar RegisterRequest");
        LoginRequest::export().expect("Falha ao exportar LoginRequest");
        AuthResponse::export().expect("Falha ao exportar AuthResponse");
    }
}
