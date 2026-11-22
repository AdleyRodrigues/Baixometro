use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use ts_rs::TS;
use uuid::Uuid;

use super::entities::{Product, Receipt, ReceiptItem, Store, User};

// Autenticação (Fase 11)

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

// Categorias

#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export)]
pub struct CreateCategory {
    pub name: String,
    #[serde(default)]
    #[ts(optional)]
    pub color: Option<String>,
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

// Notas Fiscais

#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export)]
pub struct CreateReceiptItem {
    pub description: String,
    #[ts(type = "number")]
    pub quantity: Decimal,
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
    #[serde(default)]
    #[ts(optional)]
    pub product_id: Option<Uuid>,
}

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
    #[serde(default)]
    #[ts(optional)]
    pub replace_existing: Option<bool>,
    pub items: Vec<CreateReceiptItem>,
}

#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export)]
pub struct ImportReceiptRequest {
    pub access_key: String,
    #[serde(default)]
    #[ts(optional)]
    pub qr_url: Option<String>,
}

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

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export)]
pub struct ReceiptDetail {
    #[serde(flatten)]
    pub receipt: Receipt,
    pub store: Store,
    pub items: Vec<ReceiptItem>,
}

// Dashboard

#[derive(Debug, Clone, Serialize, FromRow, TS)]
#[ts(export)]
pub struct CategorySpending {
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

#[derive(Debug, Clone, Serialize, FromRow, TS)]
#[ts(export)]
pub struct MonthlySpendingPoint {
    pub month: String,
    #[ts(type = "number")]
    pub total: Decimal,
}

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export)]
pub struct DashboardSummary {
    pub period: String,
    pub month_start: DateTime<Utc>,
    #[ts(type = "number")]
    pub total_month: Decimal,
    #[ts(type = "number")]
    pub receipt_count: i64,
    #[ts(type = "number")]
    pub savings_amount: Decimal,
    pub by_category: Vec<CategorySpending>,
    pub by_store: Vec<StoreSpending>,
    pub monthly_spending: Vec<MonthlySpendingPoint>,
}

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

// Produtos e Histórico de Preços

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

#[derive(Debug, Clone, Serialize, TS)]
#[ts(export)]
pub struct ProductPriceHistory {
    pub product: Product,
    pub observations: Vec<PriceHistoryPoint>,
}

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

#[derive(Debug, Clone, Deserialize, TS)]
#[ts(export)]
pub struct MergeProductsRequest {
    pub source_product_id: Uuid,
    pub target_product_id: Uuid,
}
