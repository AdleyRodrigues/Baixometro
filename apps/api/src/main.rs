use std::net::SocketAddr;
use std::time::Duration;

use axum::{routing::get, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPoolOptions;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct HealthResponse {
    pub status: String,
}

async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
    })
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
    let pool = PgPoolOptions::new()
        .max_connections(20)
        .acquire_timeout(Duration::from_secs(5))
        .connect(&database_url)
        .await;

    match pool {
        Ok(_) => tracing::info!("Conectado ao PostgreSQL com sucesso"),
        Err(err) => {
            tracing::warn!("Aviso: Falha temporária ao conectar no Postgres ({err}). Continuando inicialização...");
        }
    }

    // 4. Registrar rotas, CORS permissive e TraceLayer
    let app = Router::new()
        .route("/health", get(health_check))
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive());

    // 5. Escutar em 0.0.0.0:3000 (ou API_PORT configurado)
    let port = std::env::var("API_PORT")
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
