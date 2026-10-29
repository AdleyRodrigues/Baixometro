use rust_decimal::Decimal;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    models::{CreateReceipt, Receipt, ReceiptDetail, ReceiptItem},
    repository::{
        products::{compute_price_per_kg_l, match_or_create_product},
        stores::find_or_create_store,
    },
};

/// Busca uma nota fiscal já registrada pelo mesmo usuário a partir da chave de acesso (`access_key`).
pub async fn find_existing_receipt_by_access_key(
    pool: &PgPool,
    user_id: Uuid,
    access_key: &str,
) -> AppResult<Option<ReceiptDetail>> {
    let Some(receipt) = sqlx::query_as::<_, Receipt>(
        r#"
        SELECT id, user_id, store_id, issued_at, total_amount, access_key, created_at
        FROM receipts
        WHERE user_id = $1 AND access_key = $2
        LIMIT 1
        "#,
    )
    .bind(user_id)
    .bind(access_key)
    .fetch_optional(pool)
    .await?
    else {
        return Ok(None);
    };

    let store = sqlx::query_as::<_, crate::models::Store>(
        "SELECT id, name, cnpj, created_at FROM stores WHERE id = $1 LIMIT 1",
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
/// Se já existir uma nota do mesmo usuário com o mesmo `access_key`, ela é substituída
/// para permitir que a revisão pós-importação atualize os dados sem duplicar a nota.
pub async fn save_receipt_with_items(
    pool: &PgPool,
    user_id: Uuid,
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

    // Bloqueia duplicatas se access_key já foi cadastrada pelo mesmo usuário
    if let Some(ref access_key) = payload.access_key {
        let trimmed_key = access_key.trim();
        if !trimmed_key.is_empty() {
            let existing_id = sqlx::query_scalar::<_, Uuid>(
                "SELECT id FROM receipts WHERE user_id = $1 AND access_key = $2 LIMIT 1",
            )
            .bind(user_id)
            .bind(trimmed_key)
            .fetch_optional(&mut *tx)
            .await?;

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

        // Registra a observação de preço para alimentar gráficos e médias
        sqlx::query(
            r#"
            INSERT INTO price_observations (product_id, store_id, receipt_item_id, unit_price, unit_price_per_kg_l, observed_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            "#,
        )
        .bind(product.id)
        .bind(store.id)
        .bind(receipt_item.id)
        .bind(item.unit_price)
        .bind(price_per_kg_l)
        .bind(receipt.issued_at)
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
