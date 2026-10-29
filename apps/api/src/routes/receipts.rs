use axum::{extract::State, http::StatusCode, Extension, Json};
use rust_decimal::Decimal;
use sqlx::{PgPool, Postgres, Transaction};
use uuid::Uuid;

use crate::{
    auth::CurrentUser,
    error::{AppError, AppResult},
    importers::{MockImporter, NfceImporter},
    models::{
        CreateReceipt, CreateReceiptItem, ImportReceiptRequest, Receipt, ReceiptDetail,
        ReceiptItem, ReceiptSummary, Store,
    },
    AppState,
};

/// `GET /receipts` — Lista o histórico de notas do usuário autenticado.
pub async fn list_receipts(
    State(state): State<AppState>,
    Extension(user): Extension<CurrentUser>,
) -> AppResult<Json<Vec<ReceiptSummary>>> {
    let receipts = sqlx::query_as::<_, ReceiptSummary>(
        r#"
        SELECT
            r.id,
            r.store_id,
            s.name AS store_name,
            r.issued_at,
            r.total_amount,
            COUNT(ri.id) AS item_count,
            r.access_key,
            r.created_at
        FROM receipts r
        INNER JOIN stores s ON s.id = r.store_id
        LEFT JOIN receipt_items ri ON ri.receipt_id = r.id
        WHERE r.user_id = $1
        GROUP BY r.id, s.name
        ORDER BY r.issued_at DESC, r.created_at DESC
        "#,
    )
    .bind(user.id)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(receipts))
}

/// `POST /receipts` — Cria uma nota fiscal e seus itens em uma única transação SQL.
pub async fn create_receipt(
    State(state): State<AppState>,
    Extension(user): Extension<CurrentUser>,
    Json(payload): Json<CreateReceipt>,
) -> AppResult<(StatusCode, Json<ReceiptDetail>)> {
    let detail = save_receipt_with_items(&state.pool, user.id, payload).await?;
    Ok((StatusCode::CREATED, Json(detail)))
}

/// `POST /receipts/import` — Importa uma NFC-e via chave de acesso (usando `MockImporter` na Fase 2),
/// persiste no banco reutilizando a transação de criação e retorna a nota completa.
pub async fn import_receipt(
    State(state): State<AppState>,
    Extension(user): Extension<CurrentUser>,
    Json(payload): Json<ImportReceiptRequest>,
) -> AppResult<(StatusCode, Json<ReceiptDetail>)> {
    let importer = MockImporter;
    let imported = importer.fetch_receipt(&payload.access_key).await?;

    let create_payload = CreateReceipt {
        store_name: imported.store_name,
        store_cnpj: imported.store_cnpj,
        issued_at: imported.issued_at,
        access_key: Some(imported.access_key),
        items: imported
            .items
            .into_iter()
            .map(|item| CreateReceiptItem {
                description: item.description,
                quantity: item.quantity,
                unit: Some(item.unit),
                unit_price: item.unit_price,
                category_id: None,
                gtin: item.gtin,
            })
            .collect(),
    };

    let detail = save_receipt_with_items(&state.pool, user.id, create_payload).await?;
    Ok((StatusCode::CREATED, Json(detail)))
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
            "A nota deve conter pelo menos um item".to_string(),
        ));
    }

    for (idx, item) in payload.items.iter().enumerate() {
        if item.description.trim().is_empty() {
            return Err(AppError::Validation(format!(
                "O item #{} precisa de uma descrição",
                idx + 1
            )));
        }
        if item.quantity <= Decimal::ZERO {
            return Err(AppError::Validation(format!(
                "A quantidade do item #{} deve ser maior que zero",
                idx + 1
            )));
        }
        if item.unit_price < Decimal::ZERO {
            return Err(AppError::Validation(format!(
                "O preço unitário do item #{} não pode ser negativo",
                idx + 1
            )));
        }
    }

    let cnpj = payload
        .store_cnpj
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());

    let access_key = payload
        .access_key
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());

    let mut tx = pool.begin().await?;

    // Se a nota já foi importada com esta chave de acesso (ex.: durante o passo de revisão),
    // removemos a versão anterior (ON DELETE CASCADE remove os receipt_items antigos)
    // antes de gravar a versão revisada.
    if let Some(key) = access_key {
        sqlx::query("DELETE FROM receipts WHERE user_id = $1 AND access_key = $2")
            .bind(user_id)
            .bind(key)
            .execute(&mut *tx)
            .await?;
    }

    let store = find_or_create_store(&mut tx, store_name, cnpj).await?;

    // Calcula os totais no servidor com arredondamento monetário de 2 casas.
    let mut item_totals = Vec::with_capacity(payload.items.len());
    let mut total_amount = Decimal::ZERO;
    for item in &payload.items {
        let item_total = (item.quantity * item.unit_price).round_dp(2);
        total_amount += item_total;
        item_totals.push(item_total);
    }

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
    .bind(total_amount)
    .bind(access_key)
    .fetch_one(&mut *tx)
    .await?;

    let mut created_items = Vec::with_capacity(payload.items.len());
    for (item, total_price) in payload.items.iter().zip(item_totals.into_iter()) {
        let description = item.description.trim();
        let unit = item
            .unit
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .unwrap_or("UN")
            .to_uppercase();
        let gtin = item
            .gtin
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty());

        let created_item = sqlx::query_as::<_, ReceiptItem>(
            r#"
            INSERT INTO receipt_items (
                receipt_id, category_id, description, quantity, unit, unit_price, total_price, gtin
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, receipt_id, category_id, description, quantity, unit, unit_price, total_price, gtin
            "#,
        )
        .bind(receipt.id)
        .bind(item.category_id)
        .bind(description)
        .bind(item.quantity.round_dp(3))
        .bind(&unit)
        .bind(item.unit_price.round_dp(2))
        .bind(total_price)
        .bind(gtin)
        .fetch_one(&mut *tx)
        .await?;

        // Se o item possui GTIN, garante o registro no catálogo `products`.
        if let Some(gtin_code) = gtin {
            sqlx::query(
                "INSERT INTO products (gtin, name) VALUES ($1, $2) ON CONFLICT (gtin) DO NOTHING",
            )
            .bind(gtin_code)
            .bind(description)
            .execute(&mut *tx)
            .await?;
        }

        created_items.push(created_item);
    }

    tx.commit().await?;

    Ok(ReceiptDetail {
        receipt,
        store,
        items: created_items,
    })
}

async fn find_or_create_store(
    tx: &mut Transaction<'_, Postgres>,
    name: &str,
    cnpj: Option<&str>,
) -> AppResult<Store> {
    if let Some(cnpj_val) = cnpj {
        if let Some(existing) = sqlx::query_as::<_, Store>(
            "SELECT id, name, cnpj, created_at FROM stores WHERE cnpj = $1 LIMIT 1",
        )
        .bind(cnpj_val)
        .fetch_optional(&mut **tx)
        .await?
        {
            return Ok(existing);
        }
    }

    if let Some(existing) = sqlx::query_as::<_, Store>(
        "SELECT id, name, cnpj, created_at FROM stores WHERE lower(name) = lower($1) LIMIT 1",
    )
    .bind(name)
    .fetch_optional(&mut **tx)
    .await?
    {
        return Ok(existing);
    }

    let created = sqlx::query_as::<_, Store>(
        "INSERT INTO stores (name, cnpj) VALUES ($1, $2) RETURNING id, name, cnpj, created_at",
    )
    .bind(name)
    .bind(cnpj)
    .fetch_one(&mut **tx)
    .await?;

    Ok(created)
}
