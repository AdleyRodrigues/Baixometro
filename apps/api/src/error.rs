use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use ts_rs::TS;

/// Corpo padrão das respostas de erro da API.
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct ErrorResponse {
    pub error: String,
}

/// Erros de domínio/infra convertidos em respostas HTTP.
#[derive(Debug)]
pub enum AppError {
    /// Payload inválido (400).
    Validation(String),
    /// Recurso não encontrado (404).
    NotFound(String),
    /// Violação de unicidade (409).
    Conflict(String),
    /// Erro inesperado (500). O detalhe vai para o log, não para o cliente.
    Internal(anyhow::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::Validation(msg) => (StatusCode::BAD_REQUEST, msg),
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            AppError::Conflict(msg) => (StatusCode::CONFLICT, msg),
            AppError::Internal(err) => {
                tracing::error!("Erro interno: {err:#}");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Erro interno do servidor".to_string(),
                )
            }
        };
        (status, Json(ErrorResponse { error: message })).into_response()
    }
}

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        if let sqlx::Error::Database(db_err) = &err {
            if db_err.is_unique_violation() {
                return AppError::Conflict("Registro já existe".to_string());
            }
            if db_err.is_foreign_key_violation() {
                return AppError::Validation(
                    "Referência inválida (ex.: categoria inexistente)".to_string(),
                );
            }
            if db_err.is_check_violation() {
                return AppError::Validation("Valor fora do intervalo permitido".to_string());
            }
        }
        AppError::Internal(err.into())
    }
}

pub type AppResult<T> = Result<T, AppError>;
