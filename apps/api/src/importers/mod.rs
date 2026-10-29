pub mod headless;
pub mod html;
pub mod utils;
pub mod xml;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[allow(unused_imports)]
pub use headless::HeadlessBrowser;
#[allow(unused_imports)]
pub use html::{parse_sefaz_html, SefazImporter};
#[allow(unused_imports)]
pub use utils::extract_access_key;
#[allow(unused_imports)]
pub use xml::parse_nfce_xml;

use crate::error::AppError;

/// Item extraído de uma NFC-e (via XML ou consulta SEFAZ).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
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

/// Dados completos extraídos de uma nota fiscal antes da persistência no banco.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ImportedReceipt {
    pub store_name: String,
    pub store_cnpj: Option<String>,
    pub issued_at: DateTime<Utc>,
    pub access_key: String,
    pub items: Vec<ImportedItem>,
}

/// Trait extensível para importadores de NFC-e (SEFAZ estadual, mock local, etc.).
#[async_trait]
pub trait NfceImporter: Send + Sync {
    async fn fetch_receipt(&self, access_key_or_url: &str) -> Result<ImportedReceipt, AppError>;
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

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
    fn test_parse_sefaz_html_error_500_or_unavailable_returns_friendly_422() {
        let error_html = "<html><body><h1>Erro 500</h1><p>Erro no processamento da consulta. Serviço indisponível.</p></body></html>";
        let err = parse_sefaz_html(error_html, None).unwrap_err();
        if let AppError::Unprocessable(msg) = err {
            assert!(msg.contains("O sistema da SEFAZ está temporariamente indisponível"));
        } else {
            panic!("Esperado AppError::Unprocessable com mensagem amigável");
        }
    }

    #[test]
    fn test_parse_nfce_xml_invalid_returns_422() {
        let invalid_xml = "<notaInvalida><semItens/></notaInvalida>";
        let err = parse_nfce_xml(invalid_xml).unwrap_err();
        assert!(matches!(err, AppError::Unprocessable(_)));
    }
}
