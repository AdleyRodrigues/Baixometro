//! Importadores reais de NFC-e (SEFAZ HTML via QR Code/URL e parser de XML oficial).
//!
//! Implementa duas estratégias resilientes para a Fase 6:
//! 1. **QR Code / URL (`SefazImporter`):** Consulta o portal da SEFAZ (ex.: SEFAZ-CE) via HTTP
//!    e faz o scraping do HTML (ou XML embutido) usando `reqwest` + `scraper`.
//! 2. **Upload de XML (`parse_nfce_xml`):** Faz o parse direto do XML oficial da NFC-e (`<nfeProc>` / `<NFe>`)
//!    usando `quick-xml`, imune a captchas ou mudanças visuais da SEFAZ.

use std::str::FromStr;
use std::time::Duration;

use async_trait::async_trait;
use chrono::{DateTime, NaiveDateTime, Utc};
use quick_xml::events::Event;
use quick_xml::Reader;
use rust_decimal::Decimal;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::error::AppError;

/// Item extraído de uma NFC-e importada.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ImportedItem {
    pub description: String,
    #[ts(type = "number")]
    pub quantity: Decimal,
    pub unit: String,
    #[ts(type = "number")]
    pub unit_price: Decimal,
    pub gtin: Option<String>,
}

/// Dados estruturados de uma NFC-e importada.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ImportedReceipt {
    pub store_name: String,
    pub store_cnpj: Option<String>,
    pub issued_at: DateTime<Utc>,
    pub access_key: String,
    pub items: Vec<ImportedItem>,
}

/// Contrato para serviços capazes de buscar os dados de uma NFC-e pela URL do QR Code ou chave de 44 dígitos.
#[async_trait]
pub trait NfceImporter: Send + Sync {
    async fn fetch_receipt(&self, access_key_or_url: &str) -> Result<ImportedReceipt, AppError>;
}

/// Importador real da SEFAZ (suporta Ceará e portais padrão SVRS/SEFAZ estaduais).
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
            "Consultando NFC-e na SEFAZ..."
        );

        let response = self.client.get(&target_url).send().await.map_err(|err| {
            tracing::warn!("Falha de rede ao consultar SEFAZ ({target_url}): {err}");
            AppError::Unprocessable(
                "Não foi possível conectar ao portal da SEFAZ no momento. Verifique sua conexão ou utilize a opção 'Importar XML da Nota'."
                    .to_string(),
            )
        })?;

        if !response.status().is_success() {
            tracing::warn!(
                status = %response.status(),
                url = %target_url,
                "Portal da SEFAZ retornou status de erro"
            );
            return Err(AppError::Unprocessable(format!(
                "O portal da SEFAZ respondeu com status {} (pode estar fora do ar ou exigindo Captcha). Utilize a opção 'Importar XML da Nota'.",
                response.status().as_u16()
            )));
        }

        let body = response.text().await.map_err(|err| {
            tracing::warn!("Falha ao ler corpo da resposta da SEFAZ: {err}");
            AppError::Unprocessable(
                "Resposta inválida recebida da SEFAZ. Utilize a opção 'Importar XML da Nota'."
                    .to_string(),
            )
        })?;

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

/// Extrai uma sequência de 44 dígitos numéricos de uma URL de QR Code ou string bruta.
pub fn extract_access_key(input: &str) -> Option<String> {
    let trimmed = input.trim();
    if trimmed.len() == 44 && trimmed.chars().all(|c| c.is_ascii_digit()) {
        return Some(trimmed.to_string());
    }

    // 1. Procura parâmetro p=44_DIGITOS
    if let Some(idx) = trimmed.find("p=") {
        let after_p = &trimmed[idx + 2..];
        let digits: String = after_p.chars().take_while(|c| c.is_ascii_digit()).collect();
        if digits.len() == 44 {
            return Some(digits);
        }
    }

    // 2. Procura qualquer sequência contínua de exatos 44 dígitos
    for token in trimmed.split(|c: char| !c.is_ascii_digit()) {
        if token.len() == 44 {
            return Some(token.to_string());
        }
    }

    // 3. Procura 11 blocos de 4 dígitos separados por espaços (formato impresso da SEFAZ: "2326 1012 ...")
    let words: Vec<&str> = trimmed.split_whitespace().collect();
    if words.len() >= 11 {
        for window in words.windows(11) {
            if window
                .iter()
                .all(|w| w.len() == 4 && w.chars().all(|c| c.is_ascii_digit()))
            {
                return Some(window.concat());
            }
        }
    }

    None
}

/// Constrói a URL padrão de consulta pública da SEFAZ com base no código UF (2 primeiros dígitos da chave).
fn build_sefaz_url_for_key(access_key: &str) -> String {
    match &access_key[0..2] {
        // 23 = Ceará (SEFAZ-CE)
        "23" => format!("http://nfce.sefaz.ce.gov.br/pages/ShowNFCe.html?p={access_key}"),
        // 35 = São Paulo (SEFAZ-SP)
        "35" => format!(
            "https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p={access_key}"
        ),
        // 43 = Rio Grande do Sul / SVRS
        "43" => format!("https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx?p={access_key}"),
        // Demais estados (fallback para portal SVRS/CE)
        _ => format!("http://nfce.sefaz.ce.gov.br/pages/ShowNFCe.html?p={access_key}"),
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

/// Faz o parse do arquivo XML oficial de uma NFC-e / NF-e (`<nfeProc>` ou `<NFe>`).
pub fn parse_nfce_xml(xml: &str) -> Result<ImportedReceipt, AppError> {
    let trimmed = xml.trim();
    if trimmed.is_empty() {
        return Err(AppError::Validation(
            "O arquivo XML enviado está vazio.".to_string(),
        ));
    }

    let mut reader = Reader::from_str(trimmed);
    reader.config_mut().trim_text(true);

    let mut current_tag = String::new();
    let mut in_emit = false;
    let mut in_ide = false;
    let mut in_det = false;
    let mut in_prod = false;

    let mut store_xnome = String::new();
    let mut store_xfant = String::new();
    let mut store_cnpj: Option<String> = None;
    let mut access_key = String::new();
    let mut issued_at: Option<DateTime<Utc>> = None;

    let mut items: Vec<ImportedItem> = Vec::new();
    let mut item_desc = String::new();
    let mut item_qty: Option<Decimal> = None;
    let mut item_unit = String::new();
    let mut item_unit_price: Option<Decimal> = None;
    let mut item_gtin: Option<String> = None;

    loop {
        match reader.read_event() {
            Ok(Event::Start(ref e)) => {
                let local = local_tag_name(e.name().as_ref());
                current_tag = local.clone();

                match local.as_str() {
                    "infNFe" => {
                        for attr in e.attributes().flatten() {
                            if attr.key.as_ref().eq_ignore_ascii_case(b"Id") {
                                if let Ok(val) = std::str::from_utf8(&attr.value) {
                                    if let Some(key) = extract_access_key(val) {
                                        access_key = key;
                                    }
                                }
                            }
                        }
                    }
                    "emit" => in_emit = true,
                    "ide" => in_ide = true,
                    "det" => {
                        in_det = true;
                        item_desc.clear();
                        item_qty = None;
                        item_unit.clear();
                        item_unit_price = None;
                        item_gtin = None;
                    }
                    "prod" if in_det => in_prod = true,
                    _ => {}
                }
            }
            Ok(Event::End(ref e)) => {
                let local = local_tag_name(e.name().as_ref());
                match local.as_str() {
                    "emit" => in_emit = false,
                    "ide" => in_ide = false,
                    "prod" => in_prod = false,
                    "det" => {
                        in_det = false;
                        in_prod = false;
                        if !item_desc.trim().is_empty() {
                            let quantity = item_qty
                                .filter(|q| *q > Decimal::ZERO)
                                .unwrap_or(Decimal::ONE);
                            let unit_price = item_unit_price
                                .filter(|p| *p >= Decimal::ZERO)
                                .unwrap_or(Decimal::ZERO);
                            let unit = if item_unit.trim().is_empty() {
                                "UN".to_string()
                            } else {
                                item_unit.trim().to_uppercase()
                            };
                            items.push(ImportedItem {
                                description: collapse_whitespace(&item_desc),
                                quantity,
                                unit,
                                unit_price,
                                gtin: item_gtin.take(),
                            });
                        }
                    }
                    _ => {}
                }
                current_tag.clear();
            }
            Ok(Event::Text(ref e)) => {
                let Ok(text) = e.unescape() else {
                    continue;
                };
                let val = text.trim();
                if val.is_empty() {
                    continue;
                }

                if in_emit {
                    match current_tag.as_str() {
                        "xNome" if store_xnome.is_empty() => store_xnome = val.to_string(),
                        "xFant" if store_xfant.is_empty() => store_xfant = val.to_string(),
                        "CNPJ" if store_cnpj.is_none() => {
                            let digits: String =
                                val.chars().filter(|c| c.is_ascii_digit()).collect();
                            if !digits.is_empty() {
                                store_cnpj = Some(digits);
                            }
                        }
                        _ => {}
                    }
                } else if in_ide {
                    if (current_tag == "dhEmi" || current_tag == "dEmi") && issued_at.is_none() {
                        issued_at = parse_xml_datetime(val);
                    }
                } else if in_det && in_prod {
                    match current_tag.as_str() {
                        "xProd" => item_desc = val.to_string(),
                        "qCom" => {
                            item_qty = parse_decimal_flexible(val);
                        }
                        "qTrib" if item_qty.is_none() => {
                            item_qty = parse_decimal_flexible(val);
                        }
                        "uCom" => item_unit = val.to_string(),
                        "uTrib" if item_unit.is_empty() => item_unit = val.to_string(),
                        "vUnCom" => {
                            item_unit_price = parse_decimal_flexible(val);
                        }
                        "vUnTrib" if item_unit_price.is_none() => {
                            item_unit_price = parse_decimal_flexible(val);
                        }
                        "cEAN" | "cEANTrib" if item_gtin.is_none() => {
                            if let Some(valid_gtin) = normalize_gtin(val) {
                                item_gtin = Some(valid_gtin);
                            }
                        }
                        _ => {}
                    }
                } else if current_tag == "chNFe" && access_key.is_empty() {
                    if let Some(key) = extract_access_key(val) {
                        access_key = key;
                    }
                }
            }
            Ok(Event::Eof) => break,
            Err(err) => {
                tracing::warn!("Erro ao fazer parse do XML da NFC-e: {err}");
                return Err(AppError::Unprocessable(
                    "O arquivo enviado não é um XML de NFC-e válido (erro de sintaxe XML)."
                        .to_string(),
                ));
            }
            _ => {}
        }
    }

    let store_name = if !store_xfant.trim().is_empty() {
        collapse_whitespace(&store_xfant)
    } else {
        collapse_whitespace(&store_xnome)
    };

    if store_name.is_empty() || items.is_empty() {
        return Err(AppError::Unprocessable(
            "O XML enviado não contém os dados obrigatórios de uma NFC-e (emitente `<emit>` e itens `<det><prod>`)."
                .to_string(),
        ));
    }

    Ok(ImportedReceipt {
        store_name,
        store_cnpj,
        issued_at: issued_at.unwrap_or_else(Utc::now),
        access_key,
        items,
    })
}

fn local_tag_name(raw: &[u8]) -> String {
    let s = std::str::from_utf8(raw).unwrap_or_default();
    s.rsplit(':').next().unwrap_or(s).to_string()
}

fn collapse_whitespace(input: &str) -> String {
    input.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn normalize_gtin(raw: &str) -> Option<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() || trimmed.eq_ignore_ascii_case("SEM GTIN") {
        return None;
    }
    let digits: String = trimmed.chars().filter(|c| c.is_ascii_digit()).collect();
    if (8..=14).contains(&digits.len()) && !digits.chars().all(|c| c == '0') {
        Some(digits)
    } else {
        None
    }
}

fn extract_gtin_from_text(text: &str) -> Option<String> {
    for token in text.split(|c: char| !c.is_ascii_digit()) {
        if (8..=14).contains(&token.len()) && !token.chars().all(|c| c == '0') {
            return Some(token.to_string());
        }
    }
    None
}

fn extract_cnpj_from_text(text: &str) -> Option<String> {
    // Procura padrão XX.XXX.XXX/XXXX-XX ou 14 dígitos após "CNPJ"
    if let Some(pos) = text.to_uppercase().find("CNPJ") {
        let after = &text[pos + 4..];
        let mut digits = String::with_capacity(14);
        for ch in after.chars() {
            if ch.is_ascii_digit() {
                digits.push(ch);
                if digits.len() == 14 {
                    return Some(digits);
                }
            } else if !digits.is_empty() && !matches!(ch, '.' | '/' | '-' | ' ' | ':') {
                break;
            }
        }
    }
    None
}

fn extract_issued_at_from_text(text: &str) -> Option<DateTime<Utc>> {
    // Procura DD/MM/YYYY HH:MM:SS no texto da nota
    let bytes = text.as_bytes();
    if bytes.len() < 19 {
        return None;
    }
    for i in 0..=bytes.len().saturating_sub(19) {
        let slice = &bytes[i..i + 19];
        if slice[2] == b'/'
            && slice[5] == b'/'
            && slice[10] == b' '
            && slice[13] == b':'
            && slice[16] == b':'
        {
            if let Ok(candidate) = std::str::from_utf8(slice) {
                if let Ok(naive) = NaiveDateTime::parse_from_str(candidate, "%d/%m/%Y %H:%M:%S") {
                    return Some(naive.and_utc());
                }
            }
        }
    }
    None
}

fn parse_xml_datetime(raw: &str) -> Option<DateTime<Utc>> {
    if let Ok(dt) = DateTime::parse_from_rfc3339(raw.trim()) {
        return Some(dt.with_timezone(&Utc));
    }
    if let Ok(naive) = NaiveDateTime::parse_from_str(raw.trim(), "%Y-%m-%dT%H:%M:%S") {
        return Some(naive.and_utc());
    }
    None
}

fn parse_decimal_flexible(raw: &str) -> Option<Decimal> {
    let cleaned = raw.trim().replace(',', ".");
    Decimal::from_str(&cleaned).ok()
}

fn parse_brazilian_decimal(raw: &str) -> Option<Decimal> {
    // Extrai o último número decimal de strings como "Qtde.:1,450" ou "Vl. Unit.: R$ 18,90"
    let mut candidate = String::new();
    for ch in raw.chars().rev() {
        if ch.is_ascii_digit() || ch == ',' || ch == '.' {
            candidate.insert(0, ch);
        } else if !candidate.is_empty() {
            break;
        }
    }
    if candidate.is_empty() {
        return None;
    }
    let normalized = if candidate.contains(',') {
        candidate.replace('.', "").replace(',', ".")
    } else {
        candidate
    };
    Decimal::from_str(&normalized).ok()
}

fn extract_unit_label(raw: &str) -> String {
    // Ex.: "UN: KG" ou "UN: UN" ou "KG"
    let cleaned = raw
        .replace("UN:", "")
        .replace("Unid.:", "")
        .replace("Unidade:", "");
    let token = cleaned
        .split_whitespace()
        .last()
        .unwrap_or("UN")
        .trim_matches(|c: char| !c.is_alphanumeric())
        .to_uppercase();
    if token.is_empty() {
        "UN".to_string()
    } else {
        token
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE_CEARA_XML: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe23261007123456000188650010000456781000456789" versao="4.00">
      <ide>
        <cUF>23</cUF>
        <mod>65</mod>
        <dhEmi>2026-10-28T18:30:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>07123456000188</CNPJ>
        <xNome>MERCADINHO SAO LUIZ LTDA</xNome>
        <xFant>Supermercado São Luiz</xFant>
      </emit>
      <det nItem="1">
        <prod>
          <cProd>101</cProd>
          <cEAN>7891000100103</cEAN>
          <xProd>CAFE TORRADO E MOIDO 500G</xProd>
          <uCom>UN</uCom>
          <qCom>2.0000</qCom>
          <vUnCom>19.9000</vUnCom>
          <vProd>39.80</vProd>
        </prod>
      </det>
      <det nItem="2">
        <prod>
          <cProd>202</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>QUEIJO COALHO REGIONAL KG</xProd>
          <uCom>KG</uCom>
          <qCom>0.6500</qCom>
          <vUnCom>44.9000</vUnCom>
          <vProd>29.19</vProd>
        </prod>
      </det>
    </infNFe>
  </NFe>
</nfeProc>"#;

    const SAMPLE_SEFAZ_CE_HTML: &str = r#"<!DOCTYPE html>
<html>
<body>
  <div class="txtCenter">
    <div id="u20" class="txtTopo">SUPERMERCADO PINHEIRO</div>
    <div class="text">CNPJ: 12.345.678/0001-99</div>
  </div>
  <div id="infos">
    <div>Emissão: 28/10/2026 14:22:10</div>
    <span class="chave">2326 1012 3456 7800 0199 6500 1000 0009 8710 0000 9870</span>
  </div>
  <table id="tabResult">
    <tr id="Item + 1">
      <td>
        <span class="txtTit">LEITE INTEGRAL UHT 1L</span>
        <span class="RCod">(Código: 7891000200202)</span>
        <span class="Rqtd">Qtde.:3,000</span>
        <span class="RUN">UN: UN</span>
        <span class="RvlUnit">Vl. Unit.: 5,79</span>
      </td>
    </tr>
    <tr id="Item + 2">
      <td>
        <span class="txtTit">BANANA PRATA</span>
        <span class="Rqtd">Qtde.:1,250</span>
        <span class="RUN">UN: KG</span>
        <span class="RvlUnit">Vl. Unit.: 6,99</span>
      </td>
    </tr>
  </table>
</body>
</html>"#;

    #[test]
    fn test_parse_nfce_xml_valid_ceara_note() {
        let receipt =
            parse_nfce_xml(SAMPLE_CEARA_XML).expect("Deve parsear XML válido da SEFAZ-CE");
        assert_eq!(receipt.store_name, "Supermercado São Luiz");
        assert_eq!(receipt.store_cnpj.as_deref(), Some("07123456000188"));
        assert_eq!(
            receipt.access_key,
            "23261007123456000188650010000456781000456789"
        );
        assert_eq!(receipt.items.len(), 2);
        assert_eq!(receipt.items[0].description, "CAFE TORRADO E MOIDO 500G");
        assert_eq!(
            receipt.items[0].quantity,
            Decimal::from_str("2.0000").unwrap()
        );
        assert_eq!(receipt.items[0].unit, "UN");
        assert_eq!(
            receipt.items[0].unit_price,
            Decimal::from_str("19.9000").unwrap()
        );
        assert_eq!(receipt.items[0].gtin.as_deref(), Some("7891000100103"));

        assert_eq!(receipt.items[1].description, "QUEIJO COALHO REGIONAL KG");
        assert_eq!(receipt.items[1].unit, "KG");
        assert_eq!(receipt.items[1].gtin, None);
    }

    #[test]
    fn test_parse_sefaz_html_valid_ceara_layout() {
        let receipt = parse_sefaz_html(SAMPLE_SEFAZ_CE_HTML, None)
            .expect("Deve parsear HTML padrão de NFC-e da SEFAZ");
        assert_eq!(receipt.store_name, "SUPERMERCADO PINHEIRO");
        assert_eq!(receipt.store_cnpj.as_deref(), Some("12345678000199"));
        assert_eq!(
            receipt.access_key,
            "23261012345678000199650010000009871000009870"
        );
        assert_eq!(receipt.items.len(), 2);
        assert_eq!(receipt.items[0].description, "LEITE INTEGRAL UHT 1L");
        assert_eq!(
            receipt.items[0].quantity,
            Decimal::from_str("3.000").unwrap()
        );
        assert_eq!(receipt.items[0].unit, "UN");
        assert_eq!(
            receipt.items[0].unit_price,
            Decimal::from_str("5.79").unwrap()
        );
        assert_eq!(receipt.items[0].gtin.as_deref(), Some("7891000200202"));
    }

    #[test]
    fn test_parse_sefaz_html_changed_or_captcha_returns_422_not_500() {
        let captcha_html =
            "<html><body><div class='g-recaptcha'>Resolva o captcha</div></body></html>";
        let err = parse_sefaz_html(captcha_html, None).unwrap_err();
        assert!(matches!(err, AppError::Unprocessable(_)));

        let broken_html = "<html><body><h1>Layout Novo Desconhecido</h1></body></html>";
        let err2 = parse_sefaz_html(broken_html, None).unwrap_err();
        assert!(matches!(err2, AppError::Unprocessable(_)));
    }

    #[test]
    fn test_parse_nfce_xml_invalid_returns_422() {
        let invalid_xml = "<notaInvalida><semItens/></notaInvalida>";
        let err = parse_nfce_xml(invalid_xml).unwrap_err();
        assert!(matches!(err, AppError::Unprocessable(_)));
    }
}
