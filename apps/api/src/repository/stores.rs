use sqlx::{Postgres, Transaction};

use crate::{error::AppResult, models::Store, utils::location::fetch_store_location};

pub async fn find_or_create_store(
    tx: &mut Transaction<'_, Postgres>,
    name: &str,
    cnpj: Option<&str>,
) -> AppResult<Store> {
    let clean_cnpj = cnpj
        .map(|c| {
            c.chars()
                .filter(|ch| ch.is_ascii_digit())
                .collect::<String>()
        })
        .filter(|c| c.len() == 14);

    // 1. Busca por CNPJ
    if let Some(ref cnpj_val) = clean_cnpj {
        if let Some(mut existing) = sqlx::query_as::<_, Store>(
            "SELECT id, name, cnpj, city, state, created_at FROM stores WHERE cnpj = $1 LIMIT 1",
        )
        .bind(cnpj_val)
        .fetch_optional(&mut **tx)
        .await?
        {
            if existing.city.is_none() || existing.state.is_none() {
                if let Some(loc) = fetch_store_location(cnpj_val).await {
                    sqlx::query("UPDATE stores SET city = $1, state = $2 WHERE id = $3")
                        .bind(&loc.city)
                        .bind(&loc.state)
                        .bind(existing.id)
                        .execute(&mut **tx)
                        .await?;
                    existing.city = Some(loc.city);
                    existing.state = Some(loc.state);
                }
            }
            return Ok(existing);
        }
    }

    // 2. Busca por Nome (case-insensitive)
    if let Some(mut existing) = sqlx::query_as::<_, Store>(
        "SELECT id, name, cnpj, city, state, created_at FROM stores WHERE lower(name) = lower($1) LIMIT 1",
    )
    .bind(name)
    .fetch_optional(&mut **tx)
    .await?
    {
        if existing.cnpj.is_none() && clean_cnpj.is_some() {
            let cnpj_val = clean_cnpj.as_deref().unwrap();
            let loc = fetch_store_location(cnpj_val).await;
            let city = loc.as_ref().map(|l| l.city.clone()).or(existing.city.clone());
            let state = loc.as_ref().map(|l| l.state.clone()).or(existing.state.clone());

            sqlx::query("UPDATE stores SET cnpj = $1, city = $2, state = $3 WHERE id = $4")
                .bind(cnpj_val)
                .bind(&city)
                .bind(&state)
                .bind(existing.id)
                .execute(&mut **tx)
                .await?;

            existing.cnpj = Some(cnpj_val.to_string());
            existing.city = city;
            existing.state = state;
        } else if (existing.city.is_none() || existing.state.is_none()) && clean_cnpj.is_some() {
            if let Some(loc) = fetch_store_location(clean_cnpj.as_deref().unwrap()).await {
                sqlx::query("UPDATE stores SET city = $1, state = $2 WHERE id = $3")
                    .bind(&loc.city)
                    .bind(&loc.state)
                    .bind(existing.id)
                    .execute(&mut **tx)
                    .await?;
                existing.city = Some(loc.city);
                existing.state = Some(loc.state);
            }
        }
        return Ok(existing);
    }

    // 3. Cria novo estabelecimento enriquecido com BrasilAPI
    let (city, state) = if let Some(ref cnpj_val) = clean_cnpj {
        if let Some(loc) = fetch_store_location(cnpj_val).await {
            (Some(loc.city), Some(loc.state))
        } else {
            (None, None)
        }
    } else {
        (None, None)
    };

    let created = sqlx::query_as::<_, Store>(
        r#"
        INSERT INTO stores (name, cnpj, city, state)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, cnpj, city, state, created_at
        "#,
    )
    .bind(name)
    .bind(clean_cnpj.as_deref())
    .bind(city)
    .bind(state)
    .fetch_one(&mut **tx)
    .await?;

    Ok(created)
}
