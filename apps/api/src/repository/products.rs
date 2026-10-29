use rust_decimal::Decimal;
use sqlx::{Postgres, Transaction};
use uuid::Uuid;

use crate::{
    error::AppResult,
    models::{Product, ProductAlias},
};

/// Associa o item a um `Product` existente ou cria um novo.
///
/// Estratégia de resolução:
/// 1. `product_id` fornecido explicitamente pelo cliente (revisão manual).
/// 2. `gtin` presente: busca por GTIN na tabela `products`.
/// 3. Busca exata por alias na tabela `product_aliases` (case-insensitive via `lower()`).
/// 4. Se não encontrar, cria novo produto com o nome sendo a descrição do item e registra o alias.
pub async fn match_or_create_product(
    tx: &mut Transaction<'_, Postgres>,
    explicit_product_id: Option<Uuid>,
    gtin: Option<&str>,
    raw_description: &str,
) -> AppResult<Product> {
    if let Some(pid) = explicit_product_id {
        if let Some(p) = sqlx::query_as::<_, Product>(
            "SELECT id, gtin, name, brand, created_at FROM products WHERE id = $1 LIMIT 1",
        )
        .bind(pid)
        .fetch_optional(&mut **tx)
        .await?
        {
            ensure_product_alias(tx, p.id, raw_description).await?;
            return Ok(p);
        }
    }

    if let Some(gtin_code) = gtin {
        if let Some(p) = sqlx::query_as::<_, Product>(
            "SELECT id, gtin, name, brand, created_at FROM products WHERE gtin = $1 LIMIT 1",
        )
        .bind(gtin_code)
        .fetch_optional(&mut **tx)
        .await?
        {
            ensure_product_alias(tx, p.id, raw_description).await?;
            return Ok(p);
        }
    }

    let alias_match = sqlx::query_as::<_, ProductAlias>(
        r#"
        SELECT id, product_id, raw_description, created_at
        FROM product_aliases
        WHERE lower(raw_description) = lower($1)
        LIMIT 1
        "#,
    )
    .bind(raw_description)
    .fetch_optional(&mut **tx)
    .await?;

    if let Some(alias) = alias_match {
        if let Some(p) = sqlx::query_as::<_, Product>(
            "SELECT id, gtin, name, brand, created_at FROM products WHERE id = $1 LIMIT 1",
        )
        .bind(alias.product_id)
        .fetch_optional(&mut **tx)
        .await?
        {
            return Ok(p);
        }
    }

    let created = sqlx::query_as::<_, Product>(
        r#"
        INSERT INTO products (gtin, name)
        VALUES ($1, $2)
        RETURNING id, gtin, name, brand, created_at
        "#,
    )
    .bind(gtin)
    .bind(raw_description)
    .fetch_one(&mut **tx)
    .await?;

    ensure_product_alias(tx, created.id, raw_description).await?;

    Ok(created)
}

pub async fn ensure_product_alias(
    tx: &mut Transaction<'_, Postgres>,
    product_id: Uuid,
    raw_description: &str,
) -> AppResult<()> {
    sqlx::query(
        r#"
        INSERT INTO product_aliases (product_id, raw_description)
        VALUES ($1, $2)
        ON CONFLICT (lower(raw_description)) DO NOTHING
        "#,
    )
    .bind(product_id)
    .bind(raw_description)
    .execute(&mut **tx)
    .await?;
    Ok(())
}

/// Calcula o preço normalizado por kg ou L quando a unidade é KG/L ou quando a descrição
/// contém indicação explícita de peso/volume (ex.: "500g", "5kg", "1L", "250ml").
pub fn compute_price_per_kg_l(
    unit_price: Decimal,
    unit: &str,
    description: &str,
) -> Option<Decimal> {
    if unit == "KG" || unit == "L" {
        return Some(unit_price);
    }

    let lower = description.to_lowercase();
    for token in lower.split(|c: char| c.is_whitespace() || c == '(' || c == ')' || c == ',') {
        if let Some(num_str) = token.strip_suffix("kg").or_else(|| token.strip_suffix('l')) {
            if !token.ends_with("ml") {
                if let Ok(val) = num_str.replace(',', ".").parse::<Decimal>() {
                    if val > Decimal::ZERO {
                        return Some((unit_price / val).round_dp(2));
                    }
                }
            }
        }
        if let Some(num_str) = token.strip_suffix("ml").or_else(|| token.strip_suffix('g')) {
            if !token.ends_with("kg") {
                if let Ok(val) = num_str.replace(',', ".").parse::<Decimal>() {
                    if val > Decimal::ZERO {
                        let kg_or_l = val / Decimal::from(1000);
                        if kg_or_l > Decimal::ZERO {
                            return Some((unit_price / kg_or_l).round_dp(2));
                        }
                    }
                }
            }
        }
    }

    Some(unit_price)
}
