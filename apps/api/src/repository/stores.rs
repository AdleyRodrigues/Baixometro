use sqlx::{Postgres, Transaction};

use crate::{error::AppResult, models::Store};

pub async fn find_or_create_store(
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
