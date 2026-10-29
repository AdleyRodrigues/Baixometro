use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use ts_rs::TS;
use uuid::Uuid;

use crate::models::ReceiptDetail;

/// Corpo padrão das respostas de erro da API.
#[derive(Debug, Serialize, TS)]
#[ts(export)]
pub struct ErrorResponse {
    pub error: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub existing_receipt_id: Option<Uuid>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub existing_receipt: Option<ReceiptDetail>,
}

/// Erros de domínio/infra convertidos em respostas HTTP.
#[derive(Debug)]
pub enum AppError {
    /// Payload inválido (400).
    Validation(String),
    /// Token JWT ausente, inválido ou credenciais incorretas (401).
    Unauthorized(String),
    /// Recurso não encontrado (404).
    NotFound(String),
    /// Violação de unicidade genérica (409).
    Conflict(String),
    /// Nota fiscal duplicada pela chave de acesso de 44 dígitos (409).
    DuplicateReceipt(Box<ReceiptDetail>),
    /// Conteúdo da nota (HTML da SEFAZ ou XML) não pôde ser lido/processado (422).
    Unprocessable(String),
    /// Erro inesperado (500). O detalhe vai para o log, não para o cliente.
    Internal(anyhow::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        match self {
            AppError::DuplicateReceipt(detail) => {
                let existing_id = detail.receipt.id;
                (
                    StatusCode::CONFLICT,
                    Json(ErrorResponse {
                        error: "Esta nota já foi registrada anteriormente".to_string(),
                        existing_receipt_id: Some(existing_id),
                        existing_receipt: Some(*detail),
                    }),
                )
                    .into_response()
            }
            other => {
                let (status, message) = match other {
                    AppError::Validation(msg) => (StatusCode::BAD_REQUEST, msg),
                    AppError::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, msg),
                    AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
                    AppError::Conflict(msg) => (StatusCode::CONFLICT, msg),
                    AppError::Unprocessable(msg) => (StatusCode::UNPROCESSABLE_ENTITY, msg),
                    AppError::Internal(err) => {
                        tracing::error!("Erro interno: {err:#}");
                        (
                            StatusCode::INTERNAL_SERVER_ERROR,
                            "Erro interno do servidor".to_string(),
                        )
                    }
                    AppError::DuplicateReceipt(_) => unreachable!(),
                };
                (
                    status,
                    Json(ErrorResponse {
                        error: message,
                        existing_receipt_id: None,
                        existing_receipt: None,
                    }),
                )
                    .into_response()
            }
        }
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
