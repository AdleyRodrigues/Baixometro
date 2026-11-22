//! Rota pública de Crowdsourcing (Fase 12 / 16): busca de produtos e insights comunitários por localização.

use axum::{
    extract::{Query, State},
    Json,
};
use serde::Deserialize;

use crate::{
    error::AppResult,
    models::{CheapestStore, PriceSpikeProduct, PublicCityInsights, PublicPriceSearchItem},
    AppState,
};

#[derive(Debug, Deserialize)]
pub struct PublicPriceSearchQuery {
    #[serde(default)]
    pub q: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct PublicCityInsightsQuery {
    pub city: String,
    pub state: String,
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

/// `GET /public/insights?city={city}&state={state}` — Rota pública (sem autenticação) que retorna:
/// 1. Top 10 Produtos que mais subiram de preço na cidade (comparando último preço com a média de 30 dias).
/// 2. Top 5 mercados com menores médias de preços observados na cidade.
pub async fn get_public_insights(
    State(state): State<AppState>,
    Query(query): Query<PublicCityInsightsQuery>,
) -> AppResult<Json<PublicCityInsights>> {
    let city = query.city.trim();
    let state_uf = query.state.trim();

    if city.is_empty() || state_uf.is_empty() {
        return Err(crate::error::AppError::Validation(
            "Os parâmetros city e state são obrigatórios".to_string(),
        ));
    }

    // 1. Top 10 produtos com maior alta de preço na cidade (último preço vs média dos últimos 30 dias)
    let top_price_spikes = sqlx::query_as::<_, PriceSpikeProduct>(
        r#"
        WITH city_obs AS (
            SELECT
                po.product_id,
                p.name AS product_name,
                s.name AS store_name,
                po.unit_price,
                po.observed_at,
                ROW_NUMBER() OVER (
                    PARTITION BY po.product_id
                    ORDER BY po.observed_at DESC, po.id DESC
                ) AS rn
            FROM price_observations po
            INNER JOIN stores s ON s.id = po.store_id
            INNER JOIN products p ON p.id = po.product_id
            WHERE unaccent(lower(s.city)) = unaccent(lower($1))
              AND lower(s.state) = lower($2)
              AND po.is_public = true
              AND po.observed_at >= now() - INTERVAL '30 days'
        ),
        city_averages AS (
            SELECT
                po.product_id,
                AVG(po.unit_price) AS avg_price
            FROM price_observations po
            INNER JOIN stores s ON s.id = po.store_id
            WHERE unaccent(lower(s.city)) = unaccent(lower($1))
              AND lower(s.state) = lower($2)
              AND po.is_public = true
              AND po.observed_at >= now() - INTERVAL '30 days'
            GROUP BY po.product_id
        )
        SELECT
            co.product_id,
            co.product_name,
            co.unit_price AS current_price,
            ROUND(ca.avg_price, 2) AS average_30d_price,
            ROUND(((co.unit_price - ca.avg_price) / ca.avg_price) * 100, 2) AS percentage_increase,
            co.store_name,
            co.observed_at
        FROM city_obs co
        INNER JOIN city_averages ca ON ca.product_id = co.product_id
        WHERE co.rn = 1
          AND co.unit_price > ca.avg_price
        ORDER BY percentage_increase DESC
        LIMIT 10
        "#,
    )
    .bind(city)
    .bind(state_uf)
    .fetch_all(&state.pool)
    .await?;

    // 2. Top 5 mercados com os preços mais baixos na cidade (menor média de preços observados)
    let cheapest_stores = sqlx::query_as::<_, CheapestStore>(
        r#"
        SELECT
            s.id AS store_id,
            s.name AS store_name,
            ROUND(AVG(po.unit_price), 2) AS average_price,
            COUNT(po.id) AS observation_count
        FROM stores s
        INNER JOIN price_observations po ON po.store_id = s.id
        WHERE unaccent(lower(s.city)) = unaccent(lower($1))
          AND lower(s.state) = lower($2)
          AND po.is_public = true
        GROUP BY s.id, s.name
        ORDER BY average_price ASC, observation_count DESC
        LIMIT 5
        "#,
    )
    .bind(city)
    .bind(state_uf)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(PublicCityInsights {
        city: city.to_uppercase(),
        state: state_uf.to_uppercase(),
        top_price_spikes,
        cheapest_stores,
    }))
}
