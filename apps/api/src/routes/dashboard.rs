use axum::{
    extract::{Query, State},
    Extension, Json,
};
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::Deserialize;

use crate::{
    auth::CurrentUser,
    error::AppResult,
    models::{CategorySpending, DashboardSummary, MonthlySpendingPoint, StoreSpending},
    AppState,
};

#[derive(Debug, Deserialize)]
pub struct DashboardQuery {
    /// Período de agregação: `month` (padrão), `3m` (últimos 3 meses) ou `year` (ano atual).
    pub period: Option<String>,
}

#[derive(sqlx::FromRow)]
struct PeriodTotalsRow {
    period_start: DateTime<Utc>,
    total_amount: Decimal,
    receipt_count: i64,
}

#[derive(sqlx::FromRow)]
struct SavingsRow {
    savings_amount: Decimal,
}

/// `GET /dashboard/summary?period=month|3m|year` — Resumo financeiro real para o usuário autenticado.
pub async fn get_dashboard_summary(
    State(state): State<AppState>,
    Extension(user): Extension<CurrentUser>,
    Query(query): Query<DashboardQuery>,
) -> AppResult<Json<DashboardSummary>> {
    let period_key = match query.period.as_deref() {
        Some("3m") => "3m",
        Some("year") => "year",
        _ => "month",
    };

    // Define o início do período em SQL a partir da chave escolhida
    let period_start_expr = match period_key {
        "3m" => "date_trunc('month', now()) - INTERVAL '2 months'",
        "year" => "date_trunc('year', now())",
        _ => "date_trunc('month', now())",
    };

    let totals_sql = format!(
        r#"
        SELECT
            ({period_start_expr}) AS period_start,
            COALESCE(SUM(total_amount), 0)::NUMERIC(12, 2) AS total_amount,
            COUNT(*)::BIGINT AS receipt_count
        FROM receipts
        WHERE user_id = $1
          AND issued_at >= ({period_start_expr})
        "#
    );

    let totals = sqlx::query_as::<_, PeriodTotalsRow>(&totals_sql)
        .bind(user.id)
        .fetch_one(&state.pool)
        .await?;

    // Top 5 categorias por gasto no período
    let by_category_sql = format!(
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
          AND r.issued_at >= ({period_start_expr})
        GROUP BY c.id, c.name, c.color, c.icon
        ORDER BY total DESC
        LIMIT 5
        "#
    );

    let by_category = sqlx::query_as::<_, CategorySpending>(&by_category_sql)
        .bind(user.id)
        .fetch_all(&state.pool)
        .await?;

    // Top 5 mercados por gasto no período
    let by_store_sql = format!(
        r#"
        SELECT
            s.id AS store_id,
            s.name,
            COALESCE(SUM(r.total_amount), 0)::NUMERIC(12, 2) AS total,
            COUNT(r.id)::BIGINT AS receipt_count
        FROM receipts r
        INNER JOIN stores s ON s.id = r.store_id
        WHERE r.user_id = $1
          AND r.issued_at >= ({period_start_expr})
        GROUP BY s.id, s.name
        ORDER BY total DESC
        LIMIT 5
        "#
    );

    let by_store = sqlx::query_as::<_, StoreSpending>(&by_store_sql)
        .bind(user.id)
        .fetch_all(&state.pool)
        .await?;

    // Economia / Desperdício: compara o preço unitário pago em cada item do período com
    // a média de preço do mesmo produto nos últimos 30 dias (`avg_30d - unit_price_pago`).
    // Valor positivo = economia; valor negativo = desperdício (pagou acima da média).
    let savings_sql = format!(
        r#"
        WITH product_avg_30d AS (
            SELECT
                product_id,
                AVG(unit_price)::NUMERIC(12, 4) AS avg_unit_price
            FROM price_observations
            WHERE observed_at >= now() - INTERVAL '30 days'
            GROUP BY product_id
        )
        SELECT
            COALESCE(
                SUM((pa.avg_unit_price - po.unit_price) * ri.quantity),
                0
            )::NUMERIC(12, 2) AS savings_amount
        FROM receipts r
        INNER JOIN receipt_items ri ON ri.receipt_id = r.id
        INNER JOIN price_observations po ON po.receipt_item_id = ri.id
        INNER JOIN product_avg_30d pa ON pa.product_id = po.product_id
        WHERE r.user_id = $1
          AND r.issued_at >= ({period_start_expr})
        "#
    );

    let savings = sqlx::query_as::<_, SavingsRow>(&savings_sql)
        .bind(user.id)
        .fetch_one(&state.pool)
        .await?;

    // Série mensal real dos últimos 6 meses (usando generate_series para garantir todos os meses)
    let monthly_spending = sqlx::query_as::<_, MonthlySpendingPoint>(
        r#"
        WITH months AS (
            SELECT generate_series(
                date_trunc('month', now()) - INTERVAL '5 months',
                date_trunc('month', now()),
                INTERVAL '1 month'
            ) AS m
        )
        SELECT
            to_char(months.m, 'TMMon/YY') AS month,
            COALESCE(SUM(r.total_amount), 0)::NUMERIC(12, 2) AS total
        FROM months
        LEFT JOIN receipts r
            ON r.user_id = $1
           AND date_trunc('month', r.issued_at) = months.m
        GROUP BY months.m
        ORDER BY months.m ASC
        "#,
    )
    .bind(user.id)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(DashboardSummary {
        period: period_key.to_string(),
        month_start: totals.period_start,
        total_month: totals.total_amount,
        receipt_count: totals.receipt_count,
        savings_amount: savings.savings_amount,
        by_category,
        by_store,
        monthly_spending,
    }))
}
