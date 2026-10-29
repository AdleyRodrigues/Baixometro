//! Modelos de domínio (linhas do banco) e DTOs de entrada/saída da API.
//!
//! Todos os tipos expostos ao frontend são exportados para
//! `packages/shared-types` via `ts-rs` ao rodar `cargo test`.

use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use ts_rs::TS;
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Entidades (espelham as tabelas)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, TS)]
#[ts(export)]
#[allow(dead_code)] // perfil completo chega nas fases de autenticação
pub struct User {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, TS)]
#[ts(export)]
pub struct Store {
    pub id: Uuid,
    pub name: String,
    pub cnpj: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, TS)]
#[ts(export)]
pub struct Category {
    pub id: Uuid,
    pub name: String,
    pub color: String,
    pub icon: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, TS)]
#[ts(export)]
pub struct Receipt {
    pub id: Uuid,
    pub user_id: Uuid,
    pub store_id: Uuid,
    pub issued_at: DateTime<Utc>,
    #[ts(type = "number")]
    pub total_amount: Decimal,
    pub access_key: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, TS)]
#[ts(export)]
pub struct ReceiptItem {
    pub id: Uuid,
    pub receipt_id: Uuid,
    pub category_id: Option<Uuid>,
    pub description: String,
    #[ts(type = "number")]
    pub quantity: Decimal,
    pub unit: String,
    #[ts(type = "number")]
    pub unit_price: Decimal,
    #[ts(type = "number")]
    pub total_price: Decimal,
    pub gtin: Option<String>,
}

/// Catálogo de produtos. Alimentado a partir de itens com GTIN.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, TS)]
#[ts(export)]
#[allow(dead_code)] // leitura via API chega com o catálogo (fases seguintes)
pub struct Product {
    pub id: Uuid,
    pub gtin: Option<String>,
    pub name: String,
    pub brand: Option<String>,
    pub created_at: DateTime<Utc>,
}

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export)]
pub struct CreateCategory {
    pub name: String,
    /// Cor hexadecimal `#RRGGBB`. Padrão: `#64748b`.
    #[serde(default)]
    #[ts(optional)]
    pub color: Option<String>,
    /// Emoji/ícone. Padrão: 🛒.
    #[serde(default)]
    #[ts(optional)]
    pub icon: Option<String>,
}

// ---------------------------------------------------------------------------
// Notas
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export)]
pub struct CreateReceiptItem {
    pub description: String,
    #[ts(type = "number")]
    pub quantity: Decimal,
    /// Unidade de medida (UN, KG, L...). Padrão: `UN`.
    #[serde(default)]
    #[ts(optional)]
    pub unit: Option<String>,
    #[ts(type = "number")]
    pub unit_price: Decimal,
    #[serde(default)]
    #[ts(optional)]
    pub category_id: Option<Uuid>,
    #[serde(default)]
    #[ts(optional)]
    pub gtin: Option<String>,
}

/// Payload do `POST /receipts`. O mercado é localizado (CNPJ ou nome) ou criado.
/// `total_amount` e `total_price` são calculados no servidor.
#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export)]
pub struct CreateReceipt {
    pub store_name: String,
    #[serde(default)]
    #[ts(optional)]
    pub store_cnpj: Option<String>,
    pub issued_at: DateTime<Utc>,
    #[serde(default)]
    #[ts(optional)]
    pub access_key: Option<String>,
    pub items: Vec<CreateReceiptItem>,
}

/// Payload do `POST /receipts/import`.
#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export)]
pub struct ImportReceiptRequest {
    pub access_key: String,
}

/// Linha do histórico (`GET /receipts`).
#[derive(Debug, Clone, Serialize, FromRow, TS)]
#[ts(export)]
pub struct ReceiptSummary {
    pub id: Uuid,
    pub store_id: Uuid,
    pub store_name: String,
    pub issued_at: DateTime<Utc>,
    #[ts(type = "number")]
    pub total_amount: Decimal,
    #[ts(type = "number")]
    pub item_count: i64,
    pub access_key: Option<String>,
    pub created_at: DateTime<Utc>,
}

/// Nota completa com mercado e itens (resposta do `POST /receipts`).
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export)]
pub struct ReceiptDetail {
    #[serde(flatten)]
    pub receipt: Receipt,
    pub store: Store,
    pub items: Vec<ReceiptItem>,
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, FromRow, TS)]
#[ts(export)]
pub struct CategorySpending {
    /// `null` agrupa os itens sem categoria.
    pub category_id: Option<Uuid>,
    pub name: String,
    pub color: String,
    pub icon: String,
    #[ts(type = "number")]
    pub total: Decimal,
}

#[derive(Debug, Clone, Serialize, FromRow, TS)]
#[ts(export)]
pub struct StoreSpending {
    pub store_id: Uuid,
    pub name: String,
    #[ts(type = "number")]
    pub total: Decimal,
    #[ts(type = "number")]
    pub receipt_count: i64,
}

/// Resposta do `GET /dashboard/summary` (sempre referente ao mês corrente).
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export)]
pub struct DashboardSummary {
    pub month_start: DateTime<Utc>,
    #[ts(type = "number")]
    pub total_month: Decimal,
    #[ts(type = "number")]
    pub receipt_count: i64,
    pub by_category: Vec<CategorySpending>,
    pub by_store: Vec<StoreSpending>,
}
