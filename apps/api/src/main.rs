mod auth;
mod error;
mod importers;
mod models;
mod routes;

use std::net::SocketAddr;
use std::time::Duration;

use axum::{
    extract::State,
    http::StatusCode,
    middleware,
    routing::{get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::postgres::{PgPool, PgPoolOptions};
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};
use ts_rs::TS;

/// Estado compartilhado da aplicação, injetado nos handlers via `State`.
#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct HealthResponse {
    pub status: String,
    pub database: String,
}

/// Verifica a API e a conectividade com o Postgres (`SELECT 1`).
/// Retorna 200 quando o banco responde e 503 caso contrário.
async fn health_check(State(state): State<AppState>) -> (StatusCode, Json<HealthResponse>) {
    match sqlx::query("SELECT 1").execute(&state.pool).await {
        Ok(_) => (
            StatusCode::OK,
            Json(HealthResponse {
                status: "ok".to_string(),
                database: "connected".to_string(),
            }),
        ),
        Err(err) => {
            tracing::warn!("Health check: falha ao consultar o Postgres ({err})");
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(HealthResponse {
                    status: "degraded".to_string(),
                    database: "disconnected".to_string(),
                }),
            )
        }
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 1. Carregar .env via dotenvy
    dotenvy::dotenv().ok();

    // 2. Inicializar tracing_subscriber com EnvFilter
    tracing_subscriber::registry()
        .with(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,baixometro_api=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Inicializando Baixômetro API...");

    // 3. Conectar ao Postgres com PgPoolOptions (max_connections=20, acquire_timeout=5s)
    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        "postgres://baixometro:baixometro_dev@postgres:5432/baixometro".to_string()
    });

    tracing::info!("Conectando ao PostgreSQL em: {}", database_url);
    let pool_options = PgPoolOptions::new()
        .max_connections(20)
        .acquire_timeout(Duration::from_secs(5));

    let pool = match pool_options.clone().connect(&database_url).await {
        Ok(pool) => {
            tracing::info!("Conectado ao PostgreSQL com sucesso");
            pool
        }
        Err(err) => {
            // Mantém a API de pé: o pool lazy reconecta quando o banco voltar,
            // e o /health reporta "disconnected" enquanto isso.
            tracing::warn!(
                "Aviso: Falha temporária ao conectar no Postgres ({err}). Continuando com pool lazy..."
            );
            pool_options.connect_lazy(&database_url)?
        }
    };

    // 4. Rodar migrations no boot
    match sqlx::migrate!("../../infra/migrations").run(&pool).await {
        Ok(()) => {
            tracing::info!("Migrations aplicadas com sucesso");
        }
        Err(err) => {
            tracing::error!("Falha ao executar migrations no boot: {err}");
        }
    }

    let state = AppState { pool };

    // 5. Registrar rotas públicas (/health, /auth/*) e rotas protegidas por JWT
    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route("/auth/register", post(auth::register))
        .route("/auth/login", post(auth::login));

    let protected_routes = Router::new()
        .route(
            "/categories",
            get(routes::categories::list_categories).post(routes::categories::create_category),
        )
        .route(
            "/categories/{id}",
            put(routes::categories::update_category).delete(routes::categories::delete_category),
        )
        .route(
            "/receipts",
            get(routes::receipts::list_receipts).post(routes::receipts::create_receipt),
        )
        .route("/receipts/import", post(routes::receipts::import_receipt))
        .route(
            "/receipts/import/xml",
            post(routes::receipts::import_receipt_xml),
        )
        .route("/receipts/{id}", get(routes::receipts::get_receipt))
        .route("/products", get(routes::products::list_products))
        .route("/products/merge", post(routes::products::merge_products))
        .route(
            "/products/{id}",
            put(routes::products::update_product).delete(routes::products::delete_product),
        )
        .route(
            "/products/{id}/history",
            get(routes::products::get_product_history),
        )
        .route("/alerts", get(routes::alerts::list_price_alerts))
        .route(
            "/dashboard/summary",
            get(routes::dashboard::get_dashboard_summary),
        )
        .route_layer(middleware::from_fn(auth::auth_middleware));

    let app = public_routes
        .merge(protected_routes)
        .with_state(state)
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive());

    // 6. Escutar em 0.0.0.0:3000 (ou API_PORT / PORT configurado em PaaS)
    let port = std::env::var("API_PORT")
        .or_else(|_| std::env::var("PORT"))
        .unwrap_or_else(|_| "3000".to_string())
        .parse::<u16>()
        .unwrap_or(3000);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("Baixômetro API escutando em http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn export_ts_bindings() {
        HealthResponse::export().expect("Falha ao exportar HealthResponse com ts-rs");
    }
}
