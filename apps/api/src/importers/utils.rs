use std::str::FromStr;

use chrono::{DateTime, NaiveDateTime, Utc};
use rust_decimal::Decimal;

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
pub fn build_sefaz_url_for_key(access_key: &str) -> String {
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

pub fn local_tag_name(raw: &[u8]) -> String {
    let s = std::str::from_utf8(raw).unwrap_or_default();
    s.rsplit(':').next().unwrap_or(s).to_string()
}

pub fn collapse_whitespace(input: &str) -> String {
    input.split_whitespace().collect::<Vec<_>>().join(" ")
}

pub fn normalize_gtin(raw: &str) -> Option<String> {
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

pub fn extract_gtin_from_text(text: &str) -> Option<String> {
    for token in text.split(|c: char| !c.is_ascii_digit()) {
        if (8..=14).contains(&token.len()) && !token.chars().all(|c| c == '0') {
            return Some(token.to_string());
        }
    }
    None
}

pub fn extract_cnpj_from_text(text: &str) -> Option<String> {
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

pub fn extract_issued_at_from_text(text: &str) -> Option<DateTime<Utc>> {
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

pub fn parse_xml_datetime(raw: &str) -> Option<DateTime<Utc>> {
    if let Ok(dt) = DateTime::parse_from_rfc3339(raw.trim()) {
        return Some(dt.with_timezone(&Utc));
    }
    if let Ok(naive) = NaiveDateTime::parse_from_str(raw.trim(), "%Y-%m-%dT%H:%M:%S") {
        return Some(naive.and_utc());
    }
    None
}

pub fn parse_decimal_flexible(raw: &str) -> Option<Decimal> {
    let cleaned = raw.trim().replace(',', ".");
    Decimal::from_str(&cleaned).ok()
}

pub fn parse_brazilian_decimal(raw: &str) -> Option<Decimal> {
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

pub fn extract_unit_label(raw: &str) -> String {
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
