use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;

use crate::models::ReceiptDetail;

/// Detalhes estruturados do erro retornado pela API.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, TS)]
#[ts(export)]
pub struct ErrorDetail {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub details: Option<String>,
}

/// Corpo padrão das respostas de erro da API.
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export)]
pub struct ErrorResponse {
    pub error: ErrorDetail,
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
    /// Payload inválido com código de máquina explícito (400).
    #[allow(dead_code)]
    ValidationWithCode {
        code: &'static str,
        message: String,
        details: Option<String>,
    },
    /// Token JWT ausente, inválido ou credenciais incorretas (401).
    Unauthorized(String),
    /// Não autorizado com código explícito (401).
    #[allow(dead_code)]
    UnauthorizedWithCode { code: &'static str, message: String },
    /// Recurso não encontrado (404).
    NotFound(String),
    /// Recurso não encontrado com código explícito (404).
    #[allow(dead_code)]
    NotFoundWithCode { code: &'static str, message: String },
    /// Violação de unicidade genérica (409).
    Conflict(String),
    /// Conflito com código explícito (409).
    #[allow(dead_code)]
    ConflictWithCode { code: &'static str, message: String },
    /// Nota fiscal duplicada pela chave de acesso de 44 dígitos (409).
    DuplicateReceipt(Box<ReceiptDetail>),
    /// Conteúdo da nota não pôde ser processado (422).
    Unprocessable(String),
    /// Processamento inválido com código explícito (422).
    UnprocessableWithCode {
        code: &'static str,
        message: String,
        details: Option<String>,
    },
    /// Erro inesperado (500). O detalhe vai para o log, não para o cliente.
    Internal(anyhow::Error),
}

impl AppError {
    pub fn sefaz_unavailable(msg: impl Into<String>) -> Self {
        Self::UnprocessableWithCode {
            code: "SEFAZ_UNAVAILABLE",
            message: msg.into(),
            details: None,
        }
    }

    pub fn sefaz_captcha(msg: impl Into<String>) -> Self {
        Self::UnprocessableWithCode {
            code: "SEFAZ_CAPTCHA_REQUIRED",
            message: msg.into(),
            details: None,
        }
    }

    #[allow(dead_code)]
    pub fn sefaz_timeout(msg: impl Into<String>) -> Self {
        Self::UnprocessableWithCode {
            code: "SEFAZ_TIMEOUT",
            message: msg.into(),
            details: None,
        }
    }

    pub fn status_code(&self) -> StatusCode {
        match self {
            Self::Validation(_) | Self::ValidationWithCode { .. } => StatusCode::BAD_REQUEST,
            Self::Unauthorized(_) | Self::UnauthorizedWithCode { .. } => StatusCode::UNAUTHORIZED,
            Self::NotFound(_) | Self::NotFoundWithCode { .. } => StatusCode::NOT_FOUND,
            Self::Conflict(_) | Self::ConflictWithCode { .. } | Self::DuplicateReceipt(_) => {
                StatusCode::CONFLICT
            }
            Self::Unprocessable(_) | Self::UnprocessableWithCode { .. } => {
                StatusCode::UNPROCESSABLE_ENTITY
            }
            Self::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    pub fn code(&self) -> String {
        match self {
            Self::ValidationWithCode { code, .. } => code.to_string(),
            Self::Validation(msg) => {
                let lower = msg.to_lowercase();
                if lower.contains("e-mail") || lower.contains("email") {
                    "AUTH_EMAIL_INVALID".to_string()
                } else if lower.contains("nome") && lower.contains("categoria") {
                    "CATEGORY_NAME_REQUIRED".to_string()
                } else if lower.contains("nome") && lower.contains("produto") {
                    "PRODUCT_NAME_REQUIRED".to_string()
                } else if lower.contains("nome") && lower.contains("supermercado") {
                    "RECEIPT_STORE_NAME_REQUIRED".to_string()
                } else if lower.contains("nome") {
                    "AUTH_NAME_REQUIRED".to_string()
                } else if lower.contains("senha") {
                    "AUTH_PASSWORD_TOO_SHORT".to_string()
                } else if lower.contains("xml") {
                    "RECEIPT_XML_EMPTY".to_string()
                } else if lower.contains("chave") {
                    "SEFAZ_INVALID_KEY".to_string()
                } else if lower.contains("item") {
                    "RECEIPT_NO_ITEMS".to_string()
                } else {
                    "VALIDATION_ERROR".to_string()
                }
            }
            Self::UnauthorizedWithCode { code, .. } => code.to_string(),
            Self::Unauthorized(msg) => {
                let lower = msg.to_lowercase();
                if lower.contains("sessão")
                    || lower.contains("sessao")
                    || lower.contains("expirada")
                {
                    "AUTH_INVALID_TOKEN".to_string()
                } else if lower.contains("incorretos") || lower.contains("senha") {
                    "AUTH_INVALID_CREDENTIALS".to_string()
                } else if lower.contains("cabeçalho") || lower.contains("cabecalho") {
                    "AUTH_MALFORMED_HEADER".to_string()
                } else {
                    "AUTH_UNAUTHORIZED".to_string()
                }
            }
            Self::NotFoundWithCode { code, .. } => code.to_string(),
            Self::NotFound(msg) => {
                let lower = msg.to_lowercase();
                if lower.contains("categoria") {
                    "CATEGORY_NOT_FOUND".to_string()
                } else if lower.contains("origem") {
                    "PRODUCT_SOURCE_NOT_FOUND".to_string()
                } else if lower.contains("destino") {
                    "PRODUCT_TARGET_NOT_FOUND".to_string()
                } else if lower.contains("produto") {
                    "PRODUCT_NOT_FOUND".to_string()
                } else if lower.contains("nota") {
                    "RECEIPT_NOT_FOUND".to_string()
                } else if lower.contains("usuário") || lower.contains("usuario") {
                    "USER_NOT_FOUND".to_string()
                } else {
                    "NOT_FOUND".to_string()
                }
            }
            Self::ConflictWithCode { code, .. } => code.to_string(),
            Self::Conflict(msg) => {
                let lower = msg.to_lowercase();
                if lower.contains("e-mail") || lower.contains("email") {
                    "AUTH_EMAIL_ALREADY_EXISTS".to_string()
                } else if lower.contains("histórico") || lower.contains("historico") {
                    "PRODUCT_IN_USE".to_string()
                } else if lower.contains("nota") {
                    "RECEIPT_DUPLICATE".to_string()
                } else {
                    "CONFLICT".to_string()
                }
            }
            Self::DuplicateReceipt(_) => "RECEIPT_DUPLICATE".to_string(),
            Self::UnprocessableWithCode { code, .. } => code.to_string(),
            Self::Unprocessable(msg) => {
                let lower = msg.to_lowercase();
                if lower.contains("indisponível")
                    || lower.contains("indisponivel")
                    || lower.contains("erro 500")
                    || lower.contains("erro no processamento")
                {
                    "SEFAZ_UNAVAILABLE".to_string()
                } else if lower.contains("captcha") {
                    "SEFAZ_CAPTCHA_REQUIRED".to_string()
                } else if lower.contains("15 segundos") || lower.contains("tempo limite") {
                    "SEFAZ_TIMEOUT".to_string()
                } else if lower.contains("xml") {
                    "RECEIPT_XML_INVALID".to_string()
                } else if lower.contains("chromium") {
                    "SEFAZ_HEADLESS_LAUNCH_ERROR".to_string()
                } else {
                    "UNPROCESSABLE_ENTITY".to_string()
                }
            }
            Self::Internal(_) => "INTERNAL_SERVER_ERROR".to_string(),
        }
    }

    pub fn message(&self) -> String {
        match self {
            Self::Validation(msg) => msg.clone(),
            Self::ValidationWithCode { message, .. } => message.clone(),
            Self::Unauthorized(msg) => msg.clone(),
            Self::UnauthorizedWithCode { message, .. } => message.clone(),
            Self::NotFound(msg) => msg.clone(),
            Self::NotFoundWithCode { message, .. } => message.clone(),
            Self::Conflict(msg) => msg.clone(),
            Self::ConflictWithCode { message, .. } => message.clone(),
            Self::DuplicateReceipt(_) => {
                "Esta nota já foi registrada anteriormente no seu histórico.".to_string()
            }
            Self::Unprocessable(msg) => msg.clone(),
            Self::UnprocessableWithCode { message, .. } => message.clone(),
            Self::Internal(err) => {
                tracing::error!("Erro interno: {err:#}");
                "Erro interno do servidor".to_string()
            }
        }
    }

    pub fn details(&self) -> Option<String> {
        match self {
            Self::ValidationWithCode { details, .. } => details.clone(),
            Self::UnprocessableWithCode { details, .. } => details.clone(),
            _ => None,
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = self.status_code();
        let code = self.code();
        let message = self.message();
        let details = self.details();

        let (existing_id, existing_receipt) = match &self {
            AppError::DuplicateReceipt(detail) => {
                (Some(detail.receipt.id), Some((**detail).clone()))
            }
            _ => (None, None),
        };

        let body = ErrorResponse {
            error: ErrorDetail {
                code,
                message,
                details,
            },
            existing_receipt_id: existing_id,
            existing_receipt,
        };

        (status, Json(body)).into_response()
    }
}

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        if let sqlx::Error::Database(db_err) = &err {
            if db_err.is_unique_violation() {
                return AppError::ConflictWithCode {
                    code: "DB_UNIQUE_VIOLATION",
                    message: "Registro já existe".to_string(),
                };
            }
            if db_err.is_foreign_key_violation() {
                return AppError::ValidationWithCode {
                    code: "DB_FOREIGN_KEY_VIOLATION",
                    message: "Referência inválida (ex.: categoria inexistente)".to_string(),
                    details: None,
                };
            }
            if db_err.is_check_violation() {
                return AppError::ValidationWithCode {
                    code: "DB_CHECK_VIOLATION",
                    message: "Valor fora do intervalo permitido".to_string(),
                    details: None,
                };
            }
        }
        AppError::Internal(err.into())
    }
}

pub type AppResult<T> = Result<T, AppError>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_response_serialization_with_code() {
        let err =
            AppError::sefaz_unavailable("O sistema da SEFAZ está temporariamente indisponível.");
        assert_eq!(err.status_code(), StatusCode::UNPROCESSABLE_ENTITY);
        assert_eq!(err.code(), "SEFAZ_UNAVAILABLE");
        assert_eq!(
            err.message(),
            "O sistema da SEFAZ está temporariamente indisponível."
        );

        let response = ErrorResponse {
            error: ErrorDetail {
                code: err.code(),
                message: err.message(),
                details: Some("HTTP 500 detectado no portal".to_string()),
            },
            existing_receipt_id: None,
            existing_receipt: None,
        };

        let serialized = serde_json::to_string(&response).unwrap();
        assert!(serialized.contains(r#""code":"SEFAZ_UNAVAILABLE""#));
        assert!(serialized
            .contains(r#""message":"O sistema da SEFAZ está temporariamente indisponível.""#));
        assert!(serialized.contains(r#""details":"HTTP 500 detectado no portal""#));
    }

    #[test]
    fn test_app_error_default_codes() {
        assert_eq!(
            AppError::Unauthorized("Sessão inválida ou expirada".into()).code(),
            "AUTH_INVALID_TOKEN"
        );
        assert_eq!(
            AppError::Validation("Informe um e-mail válido".into()).code(),
            "AUTH_EMAIL_INVALID"
        );
        assert_eq!(
            AppError::NotFound("Produto não encontrado".into()).code(),
            "PRODUCT_NOT_FOUND"
        );
        assert_eq!(
            AppError::Conflict("Já existe um usuário cadastrado com este e-mail".into()).code(),
            "AUTH_EMAIL_ALREADY_EXISTS"
        );
        assert_eq!(
            AppError::sefaz_captcha("Desafio do Captcha detectado").code(),
            "SEFAZ_CAPTCHA_REQUIRED"
        );
    }
}
