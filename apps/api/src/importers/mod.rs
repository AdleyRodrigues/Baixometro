//! Estrutura de importação de NFC-e via Chave de Acesso.
//!
//! Na Fase 2 utilizamos o `MockImporter` para validar o fluxo ponta a ponta
//! (scanner de QR Code -> API -> banco -> tela de revisão). Nas próximas fases
//! serão adicionadas implementações reais (SEFAZ / scrapers).

use std::str::FromStr;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::error::AppError;

/// Item extraído de uma NFC-e importada.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ImportedItem {
    pub description: String,
    #[ts(type = "number")]
    pub quantity: Decimal,
    pub unit: String,
    #[ts(type = "number")]
    pub unit_price: Decimal,
    pub gtin: Option<String>,
}

/// Dados estruturados de uma NFC-e importada.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ImportedReceipt {
    pub store_name: String,
    pub store_cnpj: Option<String>,
    pub issued_at: DateTime<Utc>,
    pub access_key: String,
    pub items: Vec<ImportedItem>,
}

/// Contrato para serviços capazes de buscar os dados de uma NFC-e pela chave de 44 dígitos.
#[async_trait]
pub trait NfceImporter: Send + Sync {
    async fn fetch_receipt(&self, access_key: &str) -> Result<ImportedReceipt, AppError>;
}

/// Implementação mock para desenvolvimento e testes da Fase 2.
#[derive(Debug, Default, Clone)]
pub struct MockImporter;

#[async_trait]
impl NfceImporter for MockImporter {
    async fn fetch_receipt(&self, access_key: &str) -> Result<ImportedReceipt, AppError> {
        let trimmed = access_key.trim();
        if trimmed.len() != 44 || !trimmed.chars().all(|c| c.is_ascii_digit()) {
            return Err(AppError::Validation(
                "A chave de acesso da NFC-e deve conter exatamente 44 dígitos numéricos"
                    .to_string(),
            ));
        }

        let items = vec![
            ImportedItem {
                description: "Café Torrado e Moído 500g".to_string(),
                quantity: Decimal::from(1),
                unit: "UN".to_string(),
                unit_price: Decimal::from_str("18.90").unwrap_or_default(),
                gtin: Some("7891000100103".to_string()),
            },
            ImportedItem {
                description: "Leite Integral UHT 1L".to_string(),
                quantity: Decimal::from(3),
                unit: "UN".to_string(),
                unit_price: Decimal::from_str("5.49").unwrap_or_default(),
                gtin: Some("7891000200202".to_string()),
            },
        ];

        Ok(ImportedReceipt {
            store_name: "Supermercado Teste".to_string(),
            store_cnpj: Some("12345678000199".to_string()),
            issued_at: Utc::now(),
            access_key: trimmed.to_string(),
            items,
        })
    }
}
