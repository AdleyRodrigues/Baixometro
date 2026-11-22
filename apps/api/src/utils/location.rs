use std::collections::HashMap;
use std::sync::{LazyLock, RwLock};
use std::time::Duration;

use serde::Deserialize;

/// Informações geográficas resolvidas para o estabelecimento emissor.
#[derive(Debug, Clone)]
pub struct LocationInfo {
    pub city: String,
    pub state: String,
}

#[derive(Debug, Deserialize)]
struct BrasilApiCnpjResponse {
    municipio: Option<String>,
    uf: Option<String>,
}

static LOCATION_CACHE: LazyLock<RwLock<HashMap<String, Option<LocationInfo>>>> =
    LazyLock::new(|| RwLock::new(HashMap::new()));

/// Consulta a BrasilAPI com o CNPJ informado para obter Cidade e Estado.
/// Possui timeout curto de 3s e cache em memória para não atrasar a importação de notas.
/// Se a requisição falhar ou o CNPJ for inválido, retorna None de forma segura.
pub async fn fetch_store_location(cnpj: &str) -> Option<LocationInfo> {
    let clean: String = cnpj.chars().filter(|c| c.is_ascii_digit()).collect();
    if clean.len() != 14 {
        return None;
    }

    // 1. Consulta o cache em memória
    if let Ok(cache) = LOCATION_CACHE.read() {
        if let Some(cached) = cache.get(&clean) {
            return cached.clone();
        }
    }

    // 2. Requisição para BrasilAPI com timeout de 3s e User-Agent identificador
    let client = match reqwest::Client::builder()
        .timeout(Duration::from_secs(3))
        .user_agent("Baixometro/1.0 (https://baixometro.app)")
        .build()
    {
        Ok(c) => c,
        Err(err) => {
            tracing::warn!("Falha ao construir client HTTP para BrasilAPI: {err}");
            return None;
        }
    };

    let url = format!("https://brasilapi.com.br/api/cnpj/v1/{clean}");
    let response = match client.get(&url).send().await {
        Ok(res) if res.status().is_success() => res,
        Ok(res) => {
            tracing::debug!(
                "BrasilAPI retornou status {} para CNPJ {}",
                res.status(),
                clean
            );
            if let Ok(mut cache) = LOCATION_CACHE.write() {
                cache.insert(clean, None);
            }
            return None;
        }
        Err(err) => {
            tracing::warn!("Timeout ou falha ao consultar BrasilAPI ({url}): {err}");
            return None;
        }
    };

    let bytes = match response.bytes().await {
        Ok(b) => b,
        Err(_) => return None,
    };

    let api_data: BrasilApiCnpjResponse = match serde_json::from_slice(&bytes) {
        Ok(d) => d,
        Err(_) => return None,
    };

    let location = match (api_data.municipio, api_data.uf) {
        (Some(city), Some(state)) => {
            let trimmed_city = city.trim();
            let trimmed_state = state.trim();
            if !trimmed_city.is_empty() && !trimmed_state.is_empty() {
                Some(LocationInfo {
                    city: trimmed_city.to_uppercase(),
                    state: trimmed_state.to_uppercase(),
                })
            } else {
                None
            }
        }
        _ => None,
    };

    if let Ok(mut cache) = LOCATION_CACHE.write() {
        cache.insert(clean, location.clone());
    }

    location
}

#[cfg(test)]
pub fn seed_location_cache(cnpj: &str, city: &str, state: &str) {
    let clean: String = cnpj.chars().filter(|c| c.is_ascii_digit()).collect();
    if let Ok(mut cache) = LOCATION_CACHE.write() {
        cache.insert(
            clean,
            Some(LocationInfo {
                city: city.to_uppercase(),
                state: state.to_uppercase(),
            }),
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_fetch_store_location_cache_and_invalid_cnpj() {
        assert!(fetch_store_location("123").await.is_none());
        assert!(fetch_store_location("").await.is_none());

        seed_location_cache("06057223000171", "São Paulo", "SP");
        let loc = fetch_store_location("06.057.223/0001-71")
            .await
            .expect("deve vir do cache");
        assert_eq!(loc.city, "SÃO PAULO");
        assert_eq!(loc.state, "SP");
    }
}
