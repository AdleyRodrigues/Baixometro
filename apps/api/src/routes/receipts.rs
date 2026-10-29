use axum::{
    extract::{Multipart, Path, State},
    http::StatusCode,
    Extension, Json,
};
use rust_decimal::Decimal;
use sqlx::{PgPool, Postgres, Transaction};
use uuid::Uuid;

use crate::{
    auth::CurrentUser,
    error::{AppError, AppResult},
    importers::{extract_access_key, parse_nfce_xml, ImportedReceipt, NfceImporter, SefazImporter},
    models::{
        CreateReceipt, CreateReceiptItem, ImportReceiptRequest, Product, Receipt, ReceiptDetail,
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

/// `GET /receipts/{id}` — Retorna uma nota fiscal específica com seu mercado e todos os itens.
pub async fn get_receipt(
    State(state): State<AppState>,
    Extension(user): Extension<CurrentUser>,
    Path(receipt_id): Path<Uuid>,
) -> AppResult<Json<ReceiptDetail>> {
    let receipt = sqlx::query_as::<_, Receipt>(
        r#"
        SELECT id, user_id, store_id, issued_at, total_amount, access_key, created_at
        FROM receipts
        WHERE id = $1 AND user_id = $2
        LIMIT 1
        "#,
    )
    .bind(receipt_id)
    .bind(user.id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Nota fiscal não encontrada".to_string()))?;

    let store = sqlx::query_as::<_, Store>(
        "SELECT id, name, cnpj, created_at FROM stores WHERE id = $1 LIMIT 1",
    )
    .bind(receipt.store_id)
    .fetch_one(&state.pool)
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
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(ReceiptDetail {
        receipt,
        store,
        items,
    }))
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

/// `POST /receipts/import` — Importa uma NFC-e via URL do QR Code ou chave de acesso (usando `SefazImporter`),
/// persiste no banco reutilizando a transação de criação e retorna a nota completa.
pub async fn import_receipt(
    State(state): State<AppState>,
    Extension(user): Extension<CurrentUser>,
    Json(payload): Json<ImportReceiptRequest>,
) -> AppResult<(StatusCode, Json<ReceiptDetail>)> {
    let target = payload
        .qr_url
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or(payload.access_key.trim());

    // Antes de consultar a SEFAZ, verifica se a chave de 44 dígitos já está no banco
    if let Some(key) =
        extract_access_key(target).or_else(|| extract_access_key(payload.access_key.trim()))
    {
        if let Some(existing) =
            find_existing_receipt_by_access_key(&state.pool, user.id, &key).await?
        {
            return Err(AppError::DuplicateReceipt(Box::new(existing)));
        }
    }

    let importer = SefazImporter::new();
    let imported = importer.fetch_receipt(target).await?;
    let create_payload = imported_to_create_receipt(imported);

    let detail = save_receipt_with_items(&state.pool, user.id, create_payload).await?;
    Ok((StatusCode::CREATED, Json(detail)))
}

/// `POST /receipts/import/xml` — Recebe um arquivo XML de NFC-e via `multipart/form-data`,
/// extrai mercado, data, chave e itens, persiste transacionalmente e retorna a nota completa.
pub async fn import_receipt_xml(
    State(state): State<AppState>,
    Extension(user): Extension<CurrentUser>,
    mut multipart: Multipart,
) -> AppResult<(StatusCode, Json<ReceiptDetail>)> {
    let mut xml_content: Option<String> = None;

    while let Some(field) = multipart.next_field().await.map_err(|err| {
        AppError::Validation(format!("Falha ao ler upload multipart do XML: {err}"))
    })? {
        let bytes = field.bytes().await.map_err(|err| {
            AppError::Validation(format!("Falha ao ler conteúdo do arquivo XML: {err}"))
        })?;

        if !bytes.is_empty() {
            let decoded = match std::str::from_utf8(&bytes) {
                Ok(utf8) => utf8.to_string(),
                Err(_) => bytes.iter().map(|&b| b as char).collect(),
            };
            xml_content = Some(decoded);
            break;
        }
    }

    let raw_xml = xml_content.ok_or_else(|| {
        AppError::Validation("Nenhum arquivo XML foi enviado na requisição.".to_string())
    })?;

    let imported = parse_nfce_xml(&raw_xml)?;
    let create_payload = imported_to_create_receipt(imported);

    let detail = save_receipt_with_items(&state.pool, user.id, create_payload).await?;
    Ok((StatusCode::CREATED, Json(detail)))
}

fn imported_to_create_receipt(imported: ImportedReceipt) -> CreateReceipt {
    CreateReceipt {
        store_name: imported.store_name,
        store_cnpj: imported.store_cnpj,
        issued_at: imported.issued_at,
        access_key: if imported.access_key.trim().is_empty() {
            None
        } else {
            Some(imported.access_key)
        },
        replace_existing: None,
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
                product_id: None,
            })
            .collect(),
    }
}

/// Busca uma nota fiscal já registrada pelo mesmo usuário a partir da chave de acesso (`access_key`).
async fn find_existing_receipt_by_access_key(
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

    let store = sqlx::query_as::<_, Store>(
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

    if let Some(key) = access_key {
        if payload.replace_existing != Some(true) {
            if let Some(existing) = find_existing_receipt_by_access_key(pool, user_id, key).await? {
                return Err(AppError::DuplicateReceipt(Box::new(existing)));
            }
        }
    }

    let mut tx = pool.begin().await?;

    // Quando `replace_existing == Some(true)` (passo de revisão pós-importação),
    // removemos a versão recém-importada antes de gravar a versão revisada.
    if let Some(key) = access_key {
        if payload.replace_existing == Some(true) {
            sqlx::query("DELETE FROM receipts WHERE user_id = $1 AND access_key = $2")
                .bind(user_id)
                .bind(key)
                .execute(&mut *tx)
                .await?;
        }
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

        let rounded_qty = item.quantity.round_dp(3);
        let rounded_unit_price = item.unit_price.round_dp(2);

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
        .bind(rounded_qty)
        .bind(&unit)
        .bind(rounded_unit_price)
        .bind(total_price)
        .bind(gtin)
        .fetch_one(&mut *tx)
        .await?;

        // Matching de Produto (Fase 3):
        // 1. Vínculo manual (`item.product_id`) se informado pelo usuário
        // 2. Match exato por `gtin` (se existir)
        // 3. Match exato por alias em `product_aliases`
        // 4. Caso contrário, cria um novo `Product` canônico e registra o alias
        let product = match_or_create_product(&mut tx, item.product_id, gtin, description).await?;

        let unit_price_per_kg_l = compute_price_per_kg_l(rounded_unit_price, &unit, description);

        sqlx::query(
            r#"
            INSERT INTO price_observations (
                product_id, store_id, receipt_item_id, unit_price, unit_price_per_kg_l, observed_at
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            "#,
        )
        .bind(product.id)
        .bind(store.id)
        .bind(created_item.id)
        .bind(rounded_unit_price)
        .bind(unit_price_per_kg_l)
        .bind(payload.issued_at)
        .execute(&mut *tx)
        .await?;

        created_items.push(created_item);
    }

    tx.commit().await?;

    Ok(ReceiptDetail {
        receipt,
        store,
        items: created_items,
    })
}

async fn match_or_create_product(
    tx: &mut Transaction<'_, Postgres>,
    manual_product_id: Option<Uuid>,
    gtin: Option<&str>,
    raw_description: &str,
) -> AppResult<Product> {
    // 1. Vínculo manual explícito
    if let Some(pid) = manual_product_id {
        if let Some(existing) = sqlx::query_as::<_, Product>(
            "SELECT id, gtin, name, brand, created_at FROM products WHERE id = $1 LIMIT 1",
        )
        .bind(pid)
        .fetch_optional(&mut **tx)
        .await?
        {
            ensure_product_alias(tx, existing.id, raw_description).await?;
            return Ok(existing);
        }
    }

    // 2. Match exato por GTIN
    if let Some(gtin_code) = gtin {
        if let Some(existing) = sqlx::query_as::<_, Product>(
            "SELECT id, gtin, name, brand, created_at FROM products WHERE gtin = $1 LIMIT 1",
        )
        .bind(gtin_code)
        .fetch_optional(&mut **tx)
        .await?
        {
            ensure_product_alias(tx, existing.id, raw_description).await?;
            return Ok(existing);
        }
    }

    // 3. Match exato na tabela `product_aliases` (case-insensitive)
    if let Some(existing) = sqlx::query_as::<_, Product>(
        r#"
        SELECT p.id, p.gtin, p.name, p.brand, p.created_at
        FROM product_aliases pa
        INNER JOIN products p ON p.id = pa.product_id
        WHERE lower(pa.raw_description) = lower($1)
        LIMIT 1
        "#,
    )
    .bind(raw_description)
    .fetch_optional(&mut **tx)
    .await?
    {
        return Ok(existing);
    }

    // 4. Criar novo Product canônico com o nome bruto do item + alias
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

async fn ensure_product_alias(
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
fn compute_price_per_kg_l(unit_price: Decimal, unit: &str, description: &str) -> Option<Decimal> {
    if unit == "KG" || unit == "L" {
        return Some(unit_price);
    }

    // Procura padrões como "500g", "5kg", "1l", "200ml" no final de palavras da descrição
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
