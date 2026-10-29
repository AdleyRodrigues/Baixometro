use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    models::{PriceHistoryPoint, Product, ProductPriceHistory},
    AppState,
};

/// `GET /products` — Lista todos os produtos canônicos ordenados por nome.
pub async fn list_products(State(state): State<AppState>) -> AppResult<Json<Vec<Product>>> {
    let products = sqlx::query_as::<_, Product>(
        "SELECT id, gtin, name, brand, created_at FROM products ORDER BY name ASC",
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(products))
}

/// `GET /products/{id}/history` — Retorna o produto e a série histórica de preços
/// ao longo do tempo (com o mercado de cada observação).
pub async fn get_product_history(
    State(state): State<AppState>,
    Path(product_id): Path<Uuid>,
) -> AppResult<Json<ProductPriceHistory>> {
    let product = sqlx::query_as::<_, Product>(
        "SELECT id, gtin, name, brand, created_at FROM products WHERE id = $1 LIMIT 1",
    )
    .bind(product_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Produto não encontrado".to_string()))?;

    let observations = sqlx::query_as::<_, PriceHistoryPoint>(
        r#"
        SELECT
            po.id AS observation_id,
            po.store_id,
            s.name AS store_name,
            po.unit_price,
            po.unit_price_per_kg_l,
            po.observed_at
        FROM price_observations po
        INNER JOIN stores s ON s.id = po.store_id
        WHERE po.product_id = $1
        ORDER BY po.observed_at ASC, po.id ASC
        "#,
    )
    .bind(product.id)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(ProductPriceHistory {
        product,
        observations,
    }))
}
