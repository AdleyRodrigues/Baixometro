use rust_decimal::Decimal;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    models::{CreateReceipt, Receipt, ReceiptDetail, ReceiptItem, Store},
    repository::{
        products::{compute_price_per_kg_l, match_or_create_product},
        stores::find_or_create_store,
    },
};

/// Busca uma nota fiscal já registrada a partir da chave de acesso (`access_key`).
/// Se `user_id` for fornecido, filtra pela conta do usuário; caso contrário, busca globalmente.
pub async fn find_existing_receipt_by_access_key(
    pool: &PgPool,
    user_id: Option<Uuid>,
    access_key: &str,
) -> AppResult<Option<ReceiptDetail>> {
    let receipt = match user_id {
        Some(uid) => {
            sqlx::query_as::<_, Receipt>(
                r#"
                SELECT id, user_id, store_id, issued_at, total_amount, access_key, created_at
                FROM receipts
                WHERE user_id = $1 AND access_key = $2
                LIMIT 1
                "#,
            )
            .bind(uid)
            .bind(access_key)
            .fetch_optional(pool)
            .await?
        }
        None => {
            sqlx::query_as::<_, Receipt>(
                r#"
                SELECT id, user_id, store_id, issued_at, total_amount, access_key, created_at
                FROM receipts
                WHERE access_key = $1
                LIMIT 1
                "#,
            )
            .bind(access_key)
            .fetch_optional(pool)
            .await?
        }
    };

    let Some(receipt) = receipt else {
        return Ok(None);
    };

    let store = sqlx::query_as::<_, Store>(
        "SELECT id, name, cnpj, city, state, created_at FROM stores WHERE id = $1 LIMIT 1",
    )
    .bind(receipt.store_id)
    .fetch_one(pool)
    .await?;

    let items = sqlx::query_as::<_, ReceiptItem>(
        r#"
        SELECT id, receipt_id, category_id, description, quantity, unit, unit_price, total_price, gtin
        FROM receipt_items
        WHERE receipt_id = $1
        ORDER BY id ASC
        "#,
    )
    .bind(receipt.id)
    .fetch_all(pool)
    .await?;

    Ok(Some(ReceiptDetail {
        receipt,
        store,
        items,
    }))
}

/// Persiste uma nota fiscal e todos os seus itens em uma única transação SQL.
/// Quando `user_id` for `None`, a nota é registrada anonimamente e as observações de preço
/// geradas têm `is_public = true` para alimentar o crowdsourcing comunitário.
pub async fn save_receipt_with_items(
    pool: &PgPool,
    user_id: Option<Uuid>,
    payload: CreateReceipt,
) -> AppResult<ReceiptDetail> {
    let store_name = payload.store_name.trim();
    if store_name.is_empty() {
        return Err(AppError::Validation(
            "O nome do mercado é obrigatório".to_string(),
        ));
    }

    if payload.items.is_empty() {
        return Err(AppError::Validation(
            "A nota fiscal deve conter ao menos um item".to_string(),
        ));
    }

    let mut calculated_total = Decimal::ZERO;
    for (idx, item) in payload.items.iter().enumerate() {
        if item.quantity <= Decimal::ZERO {
            return Err(AppError::Validation(format!(
                "Item #{}: a quantidade deve ser maior que zero",
                idx + 1
            )));
        }
        if item.unit_price < Decimal::ZERO {
            return Err(AppError::Validation(format!(
                "Item #{}: o preço unitário não pode ser negativo",
                idx + 1
            )));
        }
        calculated_total += item.quantity * item.unit_price;
    }

    let mut tx = pool.begin().await?;

    // Bloqueia duplicatas se access_key já foi cadastrada
    if let Some(ref access_key) = payload.access_key {
        let trimmed_key = access_key.trim();
        if !trimmed_key.is_empty() {
            let existing_id =
                match user_id {
                    Some(uid) => sqlx::query_scalar::<_, Uuid>(
                        "SELECT id FROM receipts WHERE user_id = $1 AND access_key = $2 LIMIT 1",
                    )
                    .bind(uid)
                    .bind(trimmed_key)
                    .fetch_optional(&mut *tx)
                    .await?,
                    None => {
                        sqlx::query_scalar::<_, Uuid>(
                            "SELECT id FROM receipts WHERE access_key = $1 LIMIT 1",
                        )
                        .bind(trimmed_key)
                        .fetch_optional(&mut *tx)
                        .await?
                    }
                };

            if let Some(eid) = existing_id {
                if payload.replace_existing.unwrap_or(false) {
                    sqlx::query("DELETE FROM receipts WHERE id = $1")
                        .bind(eid)
                        .execute(&mut *tx)
                        .await?;
                } else {
                    let full_existing =
                        find_existing_receipt_by_access_key(pool, user_id, trimmed_key)
                            .await?
                            .ok_or_else(|| {
                                AppError::Conflict("Nota fiscal duplicada detectada".to_string())
                            })?;
                    return Err(AppError::DuplicateReceipt(Box::new(full_existing)));
                }
            }
        }
    }

    let store = find_or_create_store(&mut tx, store_name, payload.store_cnpj.as_deref()).await?;

    let receipt = sqlx::query_as::<_, Receipt>(
        r#"
        INSERT INTO receipts (user_id, store_id, issued_at, total_amount, access_key)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, user_id, store_id, issued_at, total_amount, access_key, created_at
        "#,
    )
    .bind(user_id)
    .bind(store.id)
    .bind(payload.issued_at)
    .bind(calculated_total)
    .bind(payload.access_key.as_deref().map(str::trim))
    .fetch_one(&mut *tx)
    .await?;

    // Determina se as observações de preço serão públicas:
    // Se a nota for anônima (user_id = None), is_public = true.
    // Se for de usuário autenticado, respeita a preferência de share_data do usuário.
    let is_public = match user_id {
        None => true,
        Some(uid) => sqlx::query_scalar::<_, bool>("SELECT share_data FROM users WHERE id = $1")
            .bind(uid)
            .fetch_optional(&mut *tx)
            .await?
            .unwrap_or(false),
    };

    let mut saved_items: Vec<ReceiptItem> = Vec::with_capacity(payload.items.len());

    for item in payload.items {
        let total_price = item.quantity * item.unit_price;
        let unit = item
            .unit
            .as_deref()
            .map(str::trim)
            .filter(|u| !u.is_empty())
            .unwrap_or("UN");

        let receipt_item = sqlx::query_as::<_, ReceiptItem>(
            r#"
            INSERT INTO receipt_items (receipt_id, category_id, description, quantity, unit, unit_price, total_price, gtin)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, receipt_id, category_id, description, quantity, unit, unit_price, total_price, gtin
            "#,
        )
        .bind(receipt.id)
        .bind(item.category_id)
        .bind(item.description.trim())
        .bind(item.quantity)
        .bind(unit)
        .bind(item.unit_price)
        .bind(total_price)
        .bind(item.gtin.as_deref().map(str::trim))
        .fetch_one(&mut *tx)
        .await?;

        // Vincula a um produto (ou cria um novo) e registra o alias
        let product = match_or_create_product(
            &mut tx,
            item.product_id,
            item.gtin.as_deref().map(str::trim),
            item.description.trim(),
        )
        .await?;

        // Normalização de preço por kg/L
        let price_per_kg_l = compute_price_per_kg_l(item.unit_price, unit, item.description.trim());

        // Registra a observação de preço para alimentar gráficos e insights de crowdsourcing
        sqlx::query(
            r#"
            INSERT INTO price_observations (product_id, store_id, receipt_item_id, unit_price, unit_price_per_kg_l, observed_at, is_public)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            "#,
        )
        .bind(product.id)
        .bind(store.id)
        .bind(receipt_item.id)
        .bind(item.unit_price)
        .bind(price_per_kg_l)
        .bind(receipt.issued_at)
        .bind(is_public)
        .execute(&mut *tx)
        .await?;

        saved_items.push(receipt_item);
    }

    tx.commit().await?;

    Ok(ReceiptDetail {
        receipt,
        store,
        items: saved_items,
    })
}
