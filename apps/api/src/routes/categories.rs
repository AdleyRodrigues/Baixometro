use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    models::{Category, CreateCategory, UpdateCategory},
    AppState,
};

/// `GET /categories` — Lista todas as categorias ordenadas por nome.
pub async fn list_categories(State(state): State<AppState>) -> AppResult<Json<Vec<Category>>> {
    let categories = sqlx::query_as::<_, Category>(
        "SELECT id, name, color, icon FROM categories ORDER BY name ASC",
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(categories))
}

/// `POST /categories` — Cria uma nova categoria.
pub async fn create_category(
    State(state): State<AppState>,
    Json(payload): Json<CreateCategory>,
) -> AppResult<(StatusCode, Json<Category>)> {
    let name = payload.name.trim();
    if name.is_empty() {
        return Err(AppError::Validation(
            "O nome da categoria é obrigatório".to_string(),
        ));
    }

    let color = payload
        .color
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("#64748b");

    let icon = payload
        .icon
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("🛒");

    let category = sqlx::query_as::<_, Category>(
        "INSERT INTO categories (name, color, icon) VALUES ($1, $2, $3) RETURNING id, name, color, icon",
    )
    .bind(name)
    .bind(color)
    .bind(icon)
    .fetch_one(&state.pool)
    .await?;

    Ok((StatusCode::CREATED, Json(category)))
}

/// `PUT /categories/{id}` — Atualiza nome, cor e ícone de uma categoria existente.
pub async fn update_category(
    State(state): State<AppState>,
    Path(category_id): Path<Uuid>,
    Json(payload): Json<UpdateCategory>,
) -> AppResult<Json<Category>> {
    let name = payload.name.trim();
    if name.is_empty() {
        return Err(AppError::Validation(
            "O nome da categoria é obrigatório".to_string(),
        ));
    }

    let color = payload
        .color
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("#64748b");

    let icon = payload
        .icon
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("🛒");

    let category = sqlx::query_as::<_, Category>(
        "UPDATE categories SET name = $2, color = $3, icon = $4 WHERE id = $1 RETURNING id, name, color, icon",
    )
    .bind(category_id)
    .bind(name)
    .bind(color)
    .bind(icon)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Categoria não encontrada".to_string()))?;

    Ok(Json(category))
}

/// `DELETE /categories/{id}` — Remove uma categoria (itens vinculados ficam com `category_id = NULL`).
pub async fn delete_category(
    State(state): State<AppState>,
    Path(category_id): Path<Uuid>,
) -> AppResult<StatusCode> {
    let res = sqlx::query("DELETE FROM categories WHERE id = $1")
        .bind(category_id)
        .execute(&state.pool)
        .await?;

    if res.rows_affected() == 0 {
        return Err(AppError::NotFound("Categoria não encontrada".to_string()));
    }

    Ok(StatusCode::NO_CONTENT)
}
