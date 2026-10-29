//! Rota pública de Crowdsourcing (Fase 12): busca de produtos e menores preços compartilhados.

use axum::{
    extract::{Query, State},
    Json,
};
use serde::Deserialize;

use crate::{error::AppResult, models::PublicPriceSearchItem, AppState};

#[derive(Debug, Deserialize)]
pub struct PublicPriceSearchQuery {
    #[serde(default)]
    pub q: Option<String>,
}

/// `GET /public/prices/search?q={query}` — Rota pública (sem autenticação) que retorna
/// os últimos preços compartilhados anonimamente (`is_public = true`) pela comunidade,
/// ordenados do menor preço unitário para o maior.
pub async fn search_public_prices(
    State(state): State<AppState>,
    Query(query): Query<PublicPriceSearchQuery>,
) -> AppResult<Json<Vec<PublicPriceSearchItem>>> {
    let raw_term = query.q.unwrap_or_default();
    let trimmed = raw_term.trim();

    let items = if trimmed.is_empty() {
        sqlx::query_as::<_, PublicPriceSearchItem>(
            r#"
            WITH latest_per_store AS (
                SELECT DISTINCT ON (po.product_id, po.store_id)
                    po.product_id,
                    p.name AS product_name,
                    p.brand AS product_brand,
                    p.gtin,
                    s.name AS store_name,
                    po.unit_price,
                    po.unit_price_per_kg_l,
                    po.observed_at
                FROM price_observations po
                JOIN products p ON p.id = po.product_id
                JOIN stores s ON s.id = po.store_id
                WHERE po.is_public = true
                ORDER BY po.product_id, po.store_id, po.observed_at DESC
            )
            SELECT
                product_id,
                product_name,
                product_brand,
                gtin,
                store_name,
                unit_price,
                unit_price_per_kg_l,
                observed_at
            FROM latest_per_store
            ORDER BY unit_price ASC, observed_at DESC
            LIMIT 50
            "#,
        )
        .fetch_all(&state.pool)
        .await?
    } else {
        let pattern = format!("%{trimmed}%");
        sqlx::query_as::<_, PublicPriceSearchItem>(
            r#"
            WITH latest_per_store AS (
                SELECT DISTINCT ON (po.product_id, po.store_id)
                    po.product_id,
                    p.name AS product_name,
                    p.brand AS product_brand,
                    p.gtin,
                    s.name AS store_name,
                    po.unit_price,
                    po.unit_price_per_kg_l,
                    po.observed_at
                FROM price_observations po
                JOIN products p ON p.id = po.product_id
                JOIN stores s ON s.id = po.store_id
                WHERE po.is_public = true
                  AND (
                    p.name ILIKE $1
                    OR COALESCE(p.brand, '') ILIKE $1
                    OR COALESCE(p.gtin, '') ILIKE $1
                    OR s.name ILIKE $1
                  )
                ORDER BY po.product_id, po.store_id, po.observed_at DESC
            )
            SELECT
                product_id,
                product_name,
                product_brand,
                gtin,
                store_name,
                unit_price,
                unit_price_per_kg_l,
                observed_at
            FROM latest_per_store
            ORDER BY unit_price ASC, observed_at DESC
            LIMIT 50
            "#,
        )
        .bind(pattern)
        .fetch_all(&state.pool)
        .await?
    };

    Ok(Json(items))
}
