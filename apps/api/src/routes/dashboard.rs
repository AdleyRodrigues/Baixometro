use axum::{extract::State, Extension, Json};
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;

use crate::{
    auth::CurrentUser,
    error::AppResult,
    models::{CategorySpending, DashboardSummary, StoreSpending},
    AppState,
};

#[derive(sqlx::FromRow)]
struct MonthTotalsRow {
    month_start: DateTime<Utc>,
    total_month: Decimal,
    receipt_count: i64,
}

/// `GET /dashboard/summary` — Resumo financeiro do mês atual para o usuário autenticado.
pub async fn get_dashboard_summary(
    State(state): State<AppState>,
    Extension(user): Extension<CurrentUser>,
) -> AppResult<Json<DashboardSummary>> {
    let totals = sqlx::query_as::<_, MonthTotalsRow>(
        r#"
        SELECT
            date_trunc('month', now()) AS month_start,
            COALESCE(SUM(total_amount), 0)::NUMERIC(12, 2) AS total_month,
            COUNT(*)::BIGINT AS receipt_count
        FROM receipts
        WHERE user_id = $1
          AND issued_at >= date_trunc('month', now())
          AND issued_at < date_trunc('month', now()) + INTERVAL '1 month'
        "#,
    )
    .bind(user.id)
    .fetch_one(&state.pool)
    .await?;

    let by_category = sqlx::query_as::<_, CategorySpending>(
        r#"
        SELECT
            c.id AS category_id,
            COALESCE(c.name, 'Sem categoria') AS name,
            COALESCE(c.color, '#64748b') AS color,
            COALESCE(c.icon, '📦') AS icon,
            COALESCE(SUM(ri.total_price), 0)::NUMERIC(12, 2) AS total
        FROM receipts r
        INNER JOIN receipt_items ri ON ri.receipt_id = r.id
        LEFT JOIN categories c ON c.id = ri.category_id
        WHERE r.user_id = $1
          AND r.issued_at >= date_trunc('month', now())
          AND r.issued_at < date_trunc('month', now()) + INTERVAL '1 month'
        GROUP BY c.id, c.name, c.color, c.icon
        ORDER BY total DESC
        "#,
    )
    .bind(user.id)
    .fetch_all(&state.pool)
    .await?;

    let by_store = sqlx::query_as::<_, StoreSpending>(
        r#"
        SELECT
            s.id AS store_id,
            s.name,
            COALESCE(SUM(r.total_amount), 0)::NUMERIC(12, 2) AS total,
            COUNT(r.id)::BIGINT AS receipt_count
        FROM receipts r
        INNER JOIN stores s ON s.id = r.store_id
        WHERE r.user_id = $1
          AND r.issued_at >= date_trunc('month', now())
          AND r.issued_at < date_trunc('month', now()) + INTERVAL '1 month'
        GROUP BY s.id, s.name
        ORDER BY total DESC
        "#,
    )
    .bind(user.id)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(DashboardSummary {
        month_start: totals.month_start,
        total_month: totals.total_month,
        receipt_count: totals.receipt_count,
        by_category,
        by_store,
    }))
}
