use chrono::Utc;
use quick_xml::events::Event;
use quick_xml::Reader;
use rust_decimal::Decimal;

use super::utils::{
    collapse_whitespace, extract_access_key, local_tag_name, normalize_gtin,
    parse_decimal_flexible, parse_xml_datetime,
};
use super::{ImportedItem, ImportedReceipt};
use crate::error::AppError;

/// Faz o parsing estruturado do XML oficial da NFC-e emitido pela SEFAZ.
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
    let mut issued_at: Option<chrono::DateTime<Utc>> = None;

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
                        "CNPJ" if store_cnpj.is_none() => store_cnpj = Some(val.to_string()),
                        _ => {}
                    }
                } else if in_ide {
                    if (current_tag == "dhEmi" || current_tag == "dEmi") && issued_at.is_none() {
                        issued_at = parse_xml_datetime(val);
                    }
                } else if in_det && in_prod {
                    match current_tag.as_str() {
                        "xProd" => {
                            if !item_desc.is_empty() {
                                item_desc.push(' ');
                            }
                            item_desc.push_str(val);
                        }
                        "cEAN" | "cEANTrib" if item_gtin.is_none() => {
                            item_gtin = normalize_gtin(val);
                        }
                        "uCom" | "uTrib" if item_unit.is_empty() => {
                            item_unit = val.to_uppercase();
                        }
                        "qCom" | "qTrib" if item_qty.is_none() => {
                            item_qty = parse_decimal_flexible(val);
                        }
                        "vUnCom" | "vUnTrib" if item_unit_price.is_none() => {
                            item_unit_price = parse_decimal_flexible(val);
                        }
                        _ => {}
                    }
                }
            }
            Ok(Event::Eof) => break,
            Err(err) => {
                return Err(AppError::Unprocessable(format!(
                    "XML da nota inválido ou corrompido: {err}"
                )));
            }
            _ => {}
        }
    }

    if items.is_empty() {
        return Err(AppError::Unprocessable(
            "Nenhum item de produto válido foi encontrado no XML da NFC-e.".to_string(),
        ));
    }

    let store_name = if !store_xfant.trim().is_empty() {
        collapse_whitespace(&store_xfant)
    } else if !store_xnome.trim().is_empty() {
        collapse_whitespace(&store_xnome)
    } else {
        "Estabelecimento Comercial".to_string()
    };

    Ok(ImportedReceipt {
        store_name,
        store_cnpj,
        issued_at: issued_at.unwrap_or_else(Utc::now),
        access_key,
        items,
    })
}
