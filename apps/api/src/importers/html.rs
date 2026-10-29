use std::time::Duration;

use async_trait::async_trait;
use chrono::Utc;
use rust_decimal::Decimal;
use scraper::{Html, Selector};

use super::headless::HeadlessBrowser;
use super::utils::{
    build_sefaz_url_for_key, collapse_whitespace, extract_access_key, extract_cnpj_from_text,
    extract_gtin_from_text, extract_issued_at_from_text, extract_unit_label,
    parse_brazilian_decimal,
};
use super::xml::parse_nfce_xml;
use super::{ImportedItem, ImportedReceipt, NfceImporter};
use crate::error::AppError;

/// Importador real da SEFAZ com Headless Browser (Chromium) para bypass de JS/Captcha e renderização dinâmica.
#[derive(Debug, Clone)]
pub struct SefazImporter {
    client: reqwest::Client,
}

impl Default for SefazImporter {
    fn default() -> Self {
        Self::new()
    }
}

impl SefazImporter {
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(12))
            .danger_accept_invalid_certs(true)
            .user_agent(
                "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
            )
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        Self { client }
    }
}

#[async_trait]
impl NfceImporter for SefazImporter {
    async fn fetch_receipt(&self, access_key_or_url: &str) -> Result<ImportedReceipt, AppError> {
        let trimmed = access_key_or_url.trim();
        let access_key = extract_access_key(trimmed).ok_or_else(|| {
            AppError::Validation(
                "A URL ou chave informada não contém uma chave de acesso NFC-e válida de 44 dígitos."
                    .to_string(),
            )
        })?;

        let target_url = if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
            trimmed.to_string()
        } else {
            build_sefaz_url_for_key(&access_key)
        };

        tracing::info!(
            access_key = %access_key,
            url = %target_url,
            "Consultando NFC-e na SEFAZ via Headless Browser..."
        );

        // 1. Tenta carregar a página utilizando o Headless Browser (Chromium)
        let body = match HeadlessBrowser::fetch_page_content(&target_url).await {
            Ok(html) => html,
            Err(headless_err) => {
                tracing::warn!(
                    "Headless browser falhou ({headless_err:?}). Tentando fallback via requisição HTTP direta..."
                );

                // 2. Fallback resiliente via reqwest caso o Chromium não esteja disponível
                match self.client.get(&target_url).send().await {
                    Ok(resp) if resp.status().is_success() => {
                        resp.text().await.map_err(|_| headless_err)?
                    }
                    _ => return Err(headless_err),
                }
            }
        };

        // Caso o endpoint retorne um XML embutido ou puro:
        if body.contains("<nfeProc") || body.contains("<infNFe") {
            if let Ok(mut parsed) = parse_nfce_xml(&body) {
                if parsed.access_key.is_empty() {
                    parsed.access_key = access_key;
                }
                return Ok(parsed);
            }
        }

        parse_sefaz_html(&body, Some(&access_key))
    }
}

/// Faz o parse do HTML retornado pela consulta pública da SEFAZ (padrão Ceará / SVRS / SP).
/// Nunca entra em pânico ou retorna 500 se o HTML mudar: retorna `AppError::Unprocessable` (422).
pub fn parse_sefaz_html(
    html: &str,
    fallback_key: Option<&str>,
) -> Result<ImportedReceipt, AppError> {
    let lower = html.to_lowercase();
    if lower.contains("g-recaptcha")
        || lower.contains("hcaptcha")
        || (lower.contains("captcha") && !lower.contains("tabresult"))
    {
        return Err(AppError::Unprocessable(
            "O portal da SEFAZ solicitou verificação de Captcha para esta consulta. Baixe o XML da nota e use a opção 'Importar XML da Nota'."
                .to_string(),
        ));
    }

    let document = Html::parse_document(html);

    // 1. Extrair nome do estabelecimento
    let store_selectors = [
        "#u20",
        ".txtTopo",
        "#lblNomeEmitente",
        ".nomeEmitente",
        ".emitente .nome",
    ];
    let mut store_name = String::new();
    for sel_str in store_selectors {
        if let Ok(sel) = Selector::parse(sel_str) {
            if let Some(el) = document.select(&sel).next() {
                let text = collapse_whitespace(&el.text().collect::<Vec<_>>().join(" "));
                if !text.is_empty() {
                    store_name = text;
                    break;
                }
            }
        }
    }

    // 2. Extrair CNPJ
    let full_text = document.root_element().text().collect::<Vec<_>>().join(" ");
    let store_cnpj = extract_cnpj_from_text(&full_text);

    // 3. Extrair Chave de Acesso (44 dígitos)
    let key_from_selector = Selector::parse(".chave, #lblChaveAcesso, .chaveAcesso")
        .ok()
        .and_then(|sel| {
            document.select(&sel).find_map(|el| {
                let txt = el.text().collect::<Vec<_>>().join(" ");
                extract_access_key(&txt)
            })
        });
    let access_key = key_from_selector
        .or_else(|| extract_access_key(&full_text))
        .or_else(|| fallback_key.and_then(extract_access_key))
        .unwrap_or_default();

    // 4. Extrair Data de Emissão
    let issued_at = extract_issued_at_from_text(&full_text).unwrap_or_else(Utc::now);

    // 5. Extrair Itens da tabela (#tabResult tr ou tr[id^="Item"] ou .itemRow)
    let mut items = Vec::new();
    let row_selectors = ["#tabResult tr", "tr[id^=\"Item\"]", "table.tabelaItens tr"];

    let title_sel = Selector::parse(".txtTit, .txtTit2, .descricao, .xProd").ok();
    let qty_sel = Selector::parse(".Rqtd, .qtd, .qCom").ok();
    let unit_sel = Selector::parse(".RUN, .un, .uCom").ok();
    let price_sel = Selector::parse(".RvlUnit, .vlUnit, .vUnCom").ok();
    let code_sel = Selector::parse(".RCod, .codigo, .cEAN").ok();

    for row_sel_str in row_selectors {
        if let Ok(row_sel) = Selector::parse(row_sel_str) {
            for row in document.select(&row_sel) {
                let description = title_sel
                    .as_ref()
                    .and_then(|s| row.select(s).next())
                    .map(|el| collapse_whitespace(&el.text().collect::<Vec<_>>().join(" ")))
                    .unwrap_or_default();

                if description.is_empty() {
                    continue;
                }

                let qty_text = qty_sel
                    .as_ref()
                    .and_then(|s| row.select(s).next())
                    .map(|el| el.text().collect::<Vec<_>>().join(" "))
                    .unwrap_or_default();
                let quantity = parse_brazilian_decimal(&qty_text)
                    .filter(|d| *d > Decimal::ZERO)
                    .unwrap_or(Decimal::ONE);

                let unit_text = unit_sel
                    .as_ref()
                    .and_then(|s| row.select(s).next())
                    .map(|el| el.text().collect::<Vec<_>>().join(" "))
                    .unwrap_or_default();
                let unit = extract_unit_label(&unit_text);

                let price_text = price_sel
                    .as_ref()
                    .and_then(|s| row.select(s).next())
                    .map(|el| el.text().collect::<Vec<_>>().join(" "))
                    .unwrap_or_default();
                let Some(unit_price) =
                    parse_brazilian_decimal(&price_text).filter(|d| *d >= Decimal::ZERO)
                else {
                    continue;
                };

                let gtin = code_sel
                    .as_ref()
                    .and_then(|s| row.select(s).next())
                    .and_then(|el| {
                        let txt = el.text().collect::<Vec<_>>().join(" ");
                        extract_gtin_from_text(&txt)
                    });

                items.push(ImportedItem {
                    description,
                    quantity,
                    unit,
                    unit_price,
                    gtin,
                });
            }
        }
        if !items.is_empty() {
            break;
        }
    }

    if store_name.is_empty() || items.is_empty() {
        return Err(AppError::Unprocessable(
            "Não foi possível extrair os dados da nota a partir do HTML da SEFAZ (o portal pode estar exigindo Captcha ou alterou o formato da página). Baixe o XML da nota e utilize a opção 'Importar XML da Nota'."
                .to_string(),
        ));
    }

    Ok(ImportedReceipt {
        store_name,
        store_cnpj,
        issued_at,
        access_key,
        items,
    })
}
