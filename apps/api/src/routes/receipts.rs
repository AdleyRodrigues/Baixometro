use axum::{
    extract::{FromRequest, Multipart, Path, Request, State},
    http::{header, StatusCode},
    Extension, Json,
};
use uuid::Uuid;

use crate::{
    auth::CurrentUser,
    error::{AppError, AppResult},
    importers::{extract_access_key, parse_nfce_xml, ImportedReceipt, NfceImporter, SefazImporter},
    models::{
        CreateReceipt, CreateReceiptItem, ImportReceiptRequest, Receipt, ReceiptDetail,
        ReceiptItem, ReceiptSummary, Store,
    },
    repository::receipts::{find_existing_receipt_by_access_key, save_receipt_with_items},
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

/// `POST /receipts/preview` — Rota pública (sem autenticação) que lê um XML (`multipart/form-data`)
/// ou uma URL de QR Code / chave de 44 dígitos (`application/json`) e retorna o `ImportedReceipt`
/// parseado sem salvar no banco de dados (usado no Modo Visitante e na pré-visualização).
pub async fn preview_receipt(
    State(state): State<AppState>,
    req: Request,
) -> AppResult<Json<ImportedReceipt>> {
    let content_type = req
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_lowercase();

    if content_type.starts_with("multipart/form-data") {
        let mut multipart = Multipart::from_request(req, &state)
            .await
            .map_err(|err| AppError::Validation(format!("Requisição multipart inválida: {err}")))?;

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
        return Ok(Json(imported));
    }

    let Json(payload) = Json::<ImportReceiptRequest>::from_request(req, &state)
        .await
        .map_err(|err| {
            AppError::Validation(format!("Payload JSON inválido para preview da nota: {err}"))
        })?;

    let target = payload
        .qr_url
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or(payload.access_key.trim());

    if target.is_empty() {
        return Err(AppError::Validation(
            "Informe a URL do QR Code ou a chave de acesso da NFC-e.".to_string(),
        ));
    }

    let importer = SefazImporter::new();
    let imported = importer.fetch_receipt(target).await?;
    Ok(Json(imported))
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
