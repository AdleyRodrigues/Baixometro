use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use ts_rs::TS;
use uuid::Uuid;

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

/// Produto que sofreu alta expressiva de preço em relação à média dos últimos 30 dias na cidade.
#[derive(Debug, Clone, Serialize, FromRow, TS)]
#[ts(export)]
pub struct PriceSpikeProduct {
    pub product_id: Uuid,
    pub product_name: String,
    #[ts(type = "number")]
    pub current_price: Decimal,
    #[ts(type = "number")]
    pub average_30d_price: Decimal,
    #[ts(type = "number")]
    pub percentage_increase: Decimal,
    pub store_name: String,
    pub observed_at: DateTime<Utc>,
}

/// Estabelecimento com menor média de preços observados na cidade.
#[derive(Debug, Clone, Serialize, FromRow, TS)]
#[ts(export)]
pub struct CheapestStore {
    pub store_id: Uuid,
    pub store_name: String,
    #[ts(type = "number")]
    pub average_price: Decimal,
    #[ts(type = "number")]
    pub observation_count: i64,
}

/// Painel público geolocalizado de preços e estabelecimentos (`GET /public/insights?city=...&state=...`).
#[derive(Debug, Clone, Serialize, TS)]
#[ts(export)]
pub struct PublicCityInsights {
    pub city: String,
    pub state: String,
    pub top_price_spikes: Vec<PriceSpikeProduct>,
    pub cheapest_stores: Vec<CheapestStore>,
}
