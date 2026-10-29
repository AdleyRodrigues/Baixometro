use axum::{extract::State, Json};

use crate::{error::AppResult, models::PriceAlert, AppState};

/// `GET /alerts` — Lista produtos cuja última observação de preço subiu mais de 10%
/// em relação à média dos últimos 30 dias (ou das observações anteriores nos últimos 30 dias).
pub async fn list_price_alerts(State(state): State<AppState>) -> AppResult<Json<Vec<PriceAlert>>> {
    let alerts = sqlx::query_as::<_, PriceAlert>(
        r#"
        WITH latest_obs AS (
            SELECT DISTINCT ON (po.product_id)
                po.id AS latest_id,
                po.product_id,
                po.store_id,
                po.unit_price AS current_price,
                po.observed_at
            FROM price_observations po
            ORDER BY po.product_id, po.observed_at DESC, po.id DESC
        ),
        baseline_30d AS (
            SELECT
                l.product_id,
                COALESCE(
                    AVG(po.unit_price) FILTER (WHERE po.id <> l.latest_id),
                    AVG(po.unit_price)
                )::NUMERIC(12, 2) AS previous_avg_price
            FROM latest_obs l
            INNER JOIN price_observations po
                ON po.product_id = l.product_id
               AND po.observed_at >= now() - INTERVAL '30 days'
            GROUP BY l.product_id
        )
        SELECT
            p.id AS product_id,
            p.name AS product_name,
            s.name AS store_name,
            b.previous_avg_price,
            l.current_price,
            ROUND(((l.current_price - b.previous_avg_price) / b.previous_avg_price) * 100, 1)::NUMERIC(12, 1) AS variation_pct,
            l.observed_at
        FROM latest_obs l
        INNER JOIN baseline_30d b ON b.product_id = l.product_id
        INNER JOIN products p ON p.id = l.product_id
        INNER JOIN stores s ON s.id = l.store_id
        WHERE b.previous_avg_price > 0
          AND ((l.current_price - b.previous_avg_price) / b.previous_avg_price) > 0.10
        ORDER BY variation_pct DESC
        "#,
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(alerts))
}
