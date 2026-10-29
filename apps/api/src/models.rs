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
pub struct User {
    pub id: Uuid,
    pub name: String,
    pub email: String,
    #[sqlx(default)]
    #[serde(default)]
    pub share_data: bool,
    pub created_at: DateTime<Utc>,
}

// ---------------------------------------------------------------------------
// Autenticação (Fase 11)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export)]
pub struct RegisterRequest {
    pub name: String,
    pub email: String,
    pub password: String,
}

#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct AuthResponse {
    pub token: String,
    pub user: User,
}

#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export)]
pub struct UpdateUserSettingsRequest {
    pub share_data: bool,
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

/// Catálogo de produtos. Alimentado a partir de itens com GTIN ou aliases.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, TS)]
#[ts(export)]
pub struct Product {
    pub id: Uuid,
    pub gtin: Option<String>,
    pub name: String,
    pub brand: Option<String>,
    pub created_at: DateTime<Utc>,
    #[sqlx(default)]
    #[serde(default)]
    #[ts(type = "number")]
    pub observation_count: i64,
}

/// Alias que associa uma descrição bruta de item de nota a um `Product` canônico.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, TS)]
#[ts(export)]
#[allow(dead_code)]
pub struct ProductAlias {
    pub id: Uuid,
    pub product_id: Uuid,
    pub raw_description: String,
    pub created_at: DateTime<Utc>,
}

/// Observação histórica de preço vinculada a um produto, mercado e item de nota.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, TS)]
#[ts(export)]
#[allow(dead_code)]
pub struct PriceObservation {
    pub id: Uuid,
    pub product_id: Uuid,
    pub store_id: Uuid,
    pub receipt_item_id: Uuid,
    #[ts(type = "number")]
    pub unit_price: Decimal,
    #[ts(type = "number | null")]
    pub unit_price_per_kg_l: Option<Decimal>,
    pub observed_at: DateTime<Utc>,
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

#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export)]
pub struct UpdateCategory {
    pub name: String,
    #[serde(default)]
    #[ts(optional)]
    pub color: Option<String>,
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
    /// Vínculo manual opcional com um produto existente.
    #[serde(default)]
    #[ts(optional)]
    pub product_id: Option<Uuid>,
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
    /// Quando `true` (apenas no passo de revisão pós-importação), substitui a nota recém-importada.
    #[serde(default)]
    #[ts(optional)]
    pub replace_existing: Option<bool>,
    pub items: Vec<CreateReceiptItem>,
}

/// Payload do `POST /receipts/import`.
#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export)]
pub struct ImportReceiptRequest {
    /// Pode ser a chave de 44 dígitos ou a URL completa lida do QR Code da NFC-e.
    pub access_key: String,
    /// URL completa do QR Code da SEFAZ (opcional).
    #[serde(default)]
    #[ts(optional)]
    pub qr_url: Option<String>,
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

/// Ponto da evolução mensal real de gastos no Dashboard.
#[derive(Debug, Clone, Serialize, FromRow, TS)]
#[ts(export)]
pub struct MonthlySpendingPoint {
    /// Rótulo abreviado do mês (ex.: `Out/26`).
    pub month: String,
    #[ts(type = "number")]
    pub total: Decimal,
}

/// Resposta do `GET /dashboard/summary` (suporta filtro de período via query `?period=month|3m|year`).
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export)]
pub struct DashboardSummary {
    pub period: String,
    pub month_start: DateTime<Utc>,
    #[ts(type = "number")]
    pub total_month: Decimal,
    #[ts(type = "number")]
    pub receipt_count: i64,
    /// Economia (positivo) ou gasto acima da média dos últimos 30 dias (negativo).
    #[ts(type = "number")]
    pub savings_amount: Decimal,
    pub by_category: Vec<CategorySpending>,
    pub by_store: Vec<StoreSpending>,
    pub monthly_spending: Vec<MonthlySpendingPoint>,
}

/// Alerta de alta de preço (> 10% acima da média dos últimos 30 dias).
#[derive(Debug, Clone, Serialize, FromRow, TS)]
#[ts(export)]
pub struct PriceAlert {
    pub product_id: Uuid,
    pub product_name: String,
    pub store_name: String,
    #[ts(type = "number")]
    pub previous_avg_price: Decimal,
    #[ts(type = "number")]
    pub current_price: Decimal,
    #[ts(type = "number")]
    pub variation_pct: Decimal,
    pub observed_at: DateTime<Utc>,
}

// ---------------------------------------------------------------------------
// Produtos e Histórico de Preços (Fase 3)
// ---------------------------------------------------------------------------

/// Ponto da série histórica de preços de um produto em um mercado.
#[derive(Debug, Clone, Serialize, FromRow, TS)]
#[ts(export)]
pub struct PriceHistoryPoint {
    pub observation_id: Uuid,
    pub store_id: Uuid,
    pub store_name: String,
    #[ts(type = "number")]
    pub unit_price: Decimal,
    #[ts(type = "number | null")]
    pub unit_price_per_kg_l: Option<Decimal>,
    pub observed_at: DateTime<Utc>,
}

/// Resposta do `GET /products/:id/history`.
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export)]
pub struct ProductPriceHistory {
    pub product: Product,
    pub observations: Vec<PriceHistoryPoint>,
}

/// Payload do `PUT /products/:id`.
#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export)]
pub struct UpdateProduct {
    pub name: String,
    #[serde(default)]
    #[ts(optional)]
    pub brand: Option<String>,
    #[serde(default)]
    #[ts(optional)]
    pub gtin: Option<String>,
}

/// Payload do `POST /products/merge`.
#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export)]
pub struct MergeProductsRequest {
    pub source_product_id: Uuid,
    pub target_product_id: Uuid,
}

// ---------------------------------------------------------------------------
// Crowdsourcing de Preços (Fase 12)
// ---------------------------------------------------------------------------

/// Item retornado pela busca pública de preços (`GET /public/prices/search?q=...`).
#[derive(Debug, Clone, Serialize, Deserialize, FromRow, TS)]
#[ts(export)]
pub struct PublicPriceSearchItem {
    pub product_id: Uuid,
    pub product_name: String,
    pub product_brand: Option<String>,
    pub gtin: Option<String>,
    pub store_name: String,
    #[ts(type = "number")]
    pub unit_price: Decimal,
    #[ts(type = "number | null")]
    pub unit_price_per_kg_l: Option<Decimal>,
    pub observed_at: DateTime<Utc>,
}
