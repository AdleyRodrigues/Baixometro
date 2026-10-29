use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use uuid::Uuid;

use crate::{
    error::{AppError, AppResult},
    models::{
        MergeProductsRequest, PriceHistoryPoint, Product, ProductPriceHistory, UpdateProduct,
    },
    AppState,
};

/// `GET /products` — Lista todos os produtos canônicos ordenados por nome,
/// incluindo a contagem de observações de preço (`observation_count`).
pub async fn list_products(State(state): State<AppState>) -> AppResult<Json<Vec<Product>>> {
    let products = sqlx::query_as::<_, Product>(
        r#"
        SELECT
            p.id,
            p.gtin,
            p.name,
            p.brand,
            p.created_at,
            COUNT(po.id)::BIGINT AS observation_count
        FROM products p
        LEFT JOIN price_observations po ON po.product_id = p.id
        GROUP BY p.id, p.gtin, p.name, p.brand, p.created_at
        ORDER BY p.name ASC
        "#,
    )
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(products))
}

/// `GET /products/{id}/history` — Retorna o produto e a série histórica de preços
/// ao longo do tempo (com o mercado de cada observação).
pub async fn get_product_history(
    State(state): State<AppState>,
    Path(product_id): Path<Uuid>,
) -> AppResult<Json<ProductPriceHistory>> {
    let product = sqlx::query_as::<_, Product>(
        r#"
        SELECT
            p.id,
            p.gtin,
            p.name,
            p.brand,
            p.created_at,
            COUNT(po.id)::BIGINT AS observation_count
        FROM products p
        LEFT JOIN price_observations po ON po.product_id = p.id
        WHERE p.id = $1
        GROUP BY p.id, p.gtin, p.name, p.brand, p.created_at
        LIMIT 1
        "#,
    )
    .bind(product_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Produto não encontrado".to_string()))?;

    let observations = sqlx::query_as::<_, PriceHistoryPoint>(
        r#"
        SELECT
            po.id AS observation_id,
            po.store_id,
            s.name AS store_name,
            po.unit_price,
            po.unit_price_per_kg_l,
            po.observed_at
        FROM price_observations po
        INNER JOIN stores s ON s.id = po.store_id
        WHERE po.product_id = $1
        ORDER BY po.observed_at ASC, po.id ASC
        "#,
    )
    .bind(product.id)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(ProductPriceHistory {
        product,
        observations,
    }))
}

/// `PUT /products/{id}` — Atualiza nome, marca e GTIN de um produto canônico.
pub async fn update_product(
    State(state): State<AppState>,
    Path(product_id): Path<Uuid>,
    Json(payload): Json<UpdateProduct>,
) -> AppResult<Json<Product>> {
    let name = payload.name.trim();
    if name.is_empty() {
        return Err(AppError::Validation(
            "O nome do produto é obrigatório".to_string(),
        ));
    }

    let brand = payload
        .brand
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());

    let gtin = payload
        .gtin
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());

    let updated = sqlx::query_as::<_, Product>(
        r#"
        WITH upd AS (
            UPDATE products
            SET name = $2, brand = $3, gtin = $4
            WHERE id = $1
            RETURNING id, gtin, name, brand, created_at
        )
        SELECT
            upd.id,
            upd.gtin,
            upd.name,
            upd.brand,
            upd.created_at,
            (SELECT COUNT(*)::BIGINT FROM price_observations WHERE product_id = upd.id) AS observation_count
        FROM upd
        "#,
    )
    .bind(product_id)
    .bind(name)
    .bind(brand)
    .bind(gtin)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Produto não encontrado".to_string()))?;

    Ok(Json(updated))
}

/// `POST /products/merge` — Mescla `source_product_id` em `target_product_id`:
/// transfere todas as `price_observations` e `product_aliases` para o target e exclui o source.
pub async fn merge_products(
    State(state): State<AppState>,
    Json(payload): Json<MergeProductsRequest>,
) -> AppResult<Json<Product>> {
    if payload.source_product_id == payload.target_product_id {
        return Err(AppError::Validation(
            "Os produtos de origem e destino devem ser diferentes".to_string(),
        ));
    }

    let mut tx = state.pool.begin().await?;

    let source = sqlx::query_as::<_, Product>(
        "SELECT id, gtin, name, brand, created_at FROM products WHERE id = $1 LIMIT 1",
    )
    .bind(payload.source_product_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| AppError::NotFound("Produto de origem não encontrado".to_string()))?;

    let target = sqlx::query_as::<_, Product>(
        "SELECT id, gtin, name, brand, created_at FROM products WHERE id = $1 LIMIT 1",
    )
    .bind(payload.target_product_id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(|| AppError::NotFound("Produto de destino não encontrado".to_string()))?;

    // 1. Mover observações de preço para o produto de destino
    sqlx::query("UPDATE price_observations SET product_id = $2 WHERE product_id = $1")
        .bind(source.id)
        .bind(target.id)
        .execute(&mut *tx)
        .await?;

    // 2. Mover aliases existentes para o produto de destino
    sqlx::query("UPDATE product_aliases SET product_id = $2 WHERE product_id = $1")
        .bind(source.id)
        .bind(target.id)
        .execute(&mut *tx)
        .await?;

    // 3. Garantir que o nome antigo do produto de origem fique registrado como alias do destino
    let alias_exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM product_aliases WHERE lower(raw_description) = lower($1))",
    )
    .bind(&source.name)
    .fetch_one(&mut *tx)
    .await?;

    if !alias_exists {
        sqlx::query("INSERT INTO product_aliases (product_id, raw_description) VALUES ($1, $2)")
            .bind(target.id)
            .bind(&source.name)
            .execute(&mut *tx)
            .await?;
    }

    // 4. Excluir o produto de origem
    sqlx::query("DELETE FROM products WHERE id = $1")
        .bind(source.id)
        .execute(&mut *tx)
        .await?;

    // 5. Se o destino não tinha GTIN e o de origem tinha, herda o GTIN
    if target.gtin.is_none() && source.gtin.is_some() {
        sqlx::query("UPDATE products SET gtin = $2 WHERE id = $1")
            .bind(target.id)
            .bind(&source.gtin)
            .execute(&mut *tx)
            .await?;
    }

    let merged_target = sqlx::query_as::<_, Product>(
        r#"
        SELECT
            p.id,
            p.gtin,
            p.name,
            p.brand,
            p.created_at,
            COUNT(po.id)::BIGINT AS observation_count
        FROM products p
        LEFT JOIN price_observations po ON po.product_id = p.id
        WHERE p.id = $1
        GROUP BY p.id, p.gtin, p.name, p.brand, p.created_at
        "#,
    )
    .bind(target.id)
    .fetch_one(&mut *tx)
    .await?;

    tx.commit().await?;

    Ok(Json(merged_target))
}

/// `DELETE /products/{id}` — Exclui um produto apenas se não houver observações vinculadas.
pub async fn delete_product(
    State(state): State<AppState>,
    Path(product_id): Path<Uuid>,
) -> AppResult<StatusCode> {
    let exists: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM products WHERE id = $1)")
        .bind(product_id)
        .fetch_one(&state.pool)
        .await?;

    if !exists {
        return Err(AppError::NotFound("Produto não encontrado".to_string()));
    }

    let obs_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*)::BIGINT FROM price_observations WHERE product_id = $1")
            .bind(product_id)
            .fetch_one(&state.pool)
            .await?;

    if obs_count > 0 {
        return Err(AppError::Conflict(
            "Não é possível excluir um produto que possui observações de preço vinculadas. Use a opção Mesclar.".to_string(),
        ));
    }

    sqlx::query("DELETE FROM products WHERE id = $1")
        .bind(product_id)
        .execute(&state.pool)
        .await?;

    Ok(StatusCode::NO_CONTENT)
}
