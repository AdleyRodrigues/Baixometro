//! Autenticação mock da Fase 1.
//!
//! Todas as requisições são atribuídas a um único usuário fixo. Quando a
//! autenticação real chegar, basta trocar o middleware: os handlers continuam
//! extraindo `Extension<CurrentUser>`.

use axum::{extract::Request, middleware::Next, response::Response};
use sqlx::PgPool;
use uuid::Uuid;

pub const MOCK_USER_ID: Uuid = Uuid::from_u128(0x0000_0000_0000_0000_0000_0000_0000_0001);
pub const MOCK_USER_NAME: &str = "Usuário Local";
pub const MOCK_USER_EMAIL: &str = "local@baixometro.dev";

/// Usuário autenticado da requisição corrente.
#[derive(Debug, Clone, Copy)]
pub struct CurrentUser {
    pub id: Uuid,
}

/// Middleware que injeta o usuário mock nas extensions da requisição.
pub async fn mock_auth(mut req: Request, next: Next) -> Response {
    req.extensions_mut()
        .insert(CurrentUser { id: MOCK_USER_ID });
    next.run(req).await
}

/// Garante que o usuário mock exista no banco (idempotente).
pub async fn ensure_mock_user(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query("INSERT INTO users (id, name, email) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING")
        .bind(MOCK_USER_ID)
        .bind(MOCK_USER_NAME)
        .bind(MOCK_USER_EMAIL)
        .execute(pool)
        .await?;
    Ok(())
}
