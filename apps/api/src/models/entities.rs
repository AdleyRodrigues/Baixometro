use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use ts_rs::TS;
use uuid::Uuid;

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

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, TS)]
#[ts(export)]
pub struct Store {
    pub id: Uuid,
    pub name: String,
    pub cnpj: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
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
    pub user_id: Option<Uuid>,
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
