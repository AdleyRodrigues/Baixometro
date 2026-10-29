use std::time::Duration;

use chromiumoxide::browser::{Browser, BrowserConfig};
use futures::StreamExt;

use crate::error::AppError;

pub struct HeadlessBrowser;

/// Mensagem padronizada quando a SEFAZ está instável ou fora do ar.
pub const SEFAZ_UNAVAILABLE_MSG: &str =
    "O sistema da SEFAZ está temporariamente indisponível. Por favor, baixe o XML da nota e use a opção de importar XML.";

/// Verifica se o texto retornado pelo HTML ou por alertas JS indica falha/instabilidade na SEFAZ.
pub fn is_sefaz_error_content(text_lower: &str) -> bool {
    text_lower.contains("erro no processamento da consulta")
        || text_lower.contains("serviço indisponível")
        || text_lower.contains("servico indisponivel")
        || text_lower.contains("erro 500")
        || text_lower.contains("500 - internal server error")
        || text_lower.contains("500 internal server error")
        || text_lower.contains("internal server error")
        || text_lower.contains("sistema indisponível")
        || text_lower.contains("sistema indisponivel")
        || text_lower.contains("falha na comunicação com a sefaz")
        || text_lower.contains("falha na comunicacao")
        || text_lower.contains("não foi possível processar a consulta")
        || text_lower.contains("nao foi possivel processar a consulta")
        || text_lower.contains("erro ao consultar nfc-e")
        || text_lower.contains("erro ao consultar nfce")
        || text_lower.contains("nota fiscal não localizada")
        || text_lower.contains("nota fiscal nao localizada")
        || text_lower.contains("falha ao conectar ao servidor da sefaz")
}

impl HeadlessBrowser {
    /// Abre a URL em um navegador Chromium invisível (headless),
    /// aguarda até 15 segundos pela renderização da tabela de itens da NFC-e
    /// e extrai o HTML dinâmico gerado pelo Javascript da SEFAZ.
    ///
    /// Se a página da SEFAZ apresentar erro 500, mensagem de indisponibilidade
    /// ou alert de falha, aborta imediatamente sem aguardar o timeout completo.
    pub async fn fetch_page_content(url: &str) -> Result<String, AppError> {
        let chrome_bin =
            std::env::var("CHROME_BIN").unwrap_or_else(|_| "/usr/bin/chromium".to_string());

        let config = BrowserConfig::builder()
            .chrome_executable(chrome_bin)
            .no_sandbox()
            .arg("--disable-dev-shm-usage")
            .arg("--disable-gpu")
            .arg("--headless=new")
            .arg("--disable-setuid-sandbox")
            .arg("--disable-software-rasterizer")
            .arg("--disable-extensions")
            .arg("--disable-popup-blocking")
            .arg("--ignore-certificate-errors")
            .arg("--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36")
            .build()
            .map_err(|err| {
                tracing::warn!("Falha ao configurar Chromium headless: {err}");
                AppError::Unprocessable(format!("Erro ao configurar navegador headless: {err}"))
            })?;

        tracing::info!(url = %url, "Iniciando Chromium Headless para consultar portal SEFAZ...");

        let (mut browser, mut handler) = Browser::launch(config).await.map_err(|err| {
            tracing::warn!("Falha ao iniciar processo Chromium headless: {err}");
            AppError::Unprocessable(
                "Navegador Chromium não pôde ser iniciado no servidor. Utilize a opção 'Importar XML da Nota'."
                    .to_string(),
            )
        })?;

        tokio::task::spawn(async move {
            while let Some(h) = handler.next().await {
                if h.is_err() {
                    break;
                }
            }
        });

        // 1. Cria a aba inicial em about:blank para injetar interceptador de alert/dialog
        let page = browser.new_page("about:blank").await.map_err(|err| {
            tracing::warn!("Falha ao abrir aba no Chromium: {err}");
            AppError::Unprocessable(
                "Falha ao conectar ao portal da SEFAZ pelo navegador headless. Utilize a opção 'Importar XML da Nota'."
                    .to_string(),
            )
        })?;

        // 2. Neutraliza alertas de JS (alert, confirm, prompt) da SEFAZ que poderiam travar o Chromium
        let _ = page
            .evaluate_on_new_document(
                r#"
                window.__sefaz_alert_detected = false;
                window.__sefaz_alert_message = '';
                window.alert = function(msg) {
                    window.__sefaz_alert_detected = true;
                    window.__sefaz_alert_message = String(msg || '');
                    console.warn('[SEFAZ alert interceptado]:', msg);
                };
                window.confirm = function(msg) {
                    window.__sefaz_alert_detected = true;
                    window.__sefaz_alert_message = String(msg || '');
                    return true;
                };
                window.prompt = function() { return null; };
                "#,
            )
            .await;

        // 3. Navega para a URL da NFC-e
        page.goto(url).await.map_err(|err| {
            tracing::warn!("Falha ao navegar no Chromium para {url}: {err}");
            AppError::Unprocessable(
                "Falha ao conectar ao portal da SEFAZ pelo navegador headless. Utilize a opção 'Importar XML da Nota'."
                    .to_string(),
            )
        })?;

        // 4. Polling com detecção precoce de erro da SEFAZ (limite de 15 segundos)
        let start = std::time::Instant::now();
        let timeout = Duration::from_secs(15);
        let mut rendered = false;

        while start.elapsed() < timeout {
            // Verifica se a tabela de itens da nota já foi renderizada
            if page.find_element("#tabResult tr").await.is_ok()
                || page.find_element("tr[id^=\"Item\"]").await.is_ok()
                || page.find_element("table.tabelaItens tr").await.is_ok()
                || page.find_element(".txtTit").await.is_ok()
                || page.find_element("#conteudo").await.is_ok()
            {
                rendered = true;
                break;
            }

            // Verifica se um alert com erro da SEFAZ foi disparado
            if let Ok(alert_msg) = page.evaluate("window.__sefaz_alert_message || ''").await {
                if let Ok(msg) = alert_msg.into_value::<String>() {
                    let lower = msg.to_lowercase();
                    if is_sefaz_error_content(&lower) {
                        tracing::warn!(alert = %msg, "Alerta de erro da SEFAZ detectado: abortando imediatamente.");
                        let _ = page.close().await;
                        let _ = browser.close().await;
                        return Err(AppError::Unprocessable(SEFAZ_UNAVAILABLE_MSG.to_string()));
                    }
                }
            }

            // Verifica se a página retornou uma tela de erro da SEFAZ no HTML (Erro 500, indisponibilidade)
            if let Ok(current_html) = page.content().await {
                let lower = current_html.to_lowercase();
                if is_sefaz_error_content(&lower) {
                    tracing::warn!(
                        "Página de erro da SEFAZ detectada no HTML: abortando imediatamente."
                    );
                    let _ = page.close().await;
                    let _ = browser.close().await;
                    return Err(AppError::Unprocessable(SEFAZ_UNAVAILABLE_MSG.to_string()));
                }
            }

            tokio::time::sleep(Duration::from_millis(400)).await;
        }

        let html = match page.content().await {
            Ok(content) => content,
            Err(err) => {
                tracing::warn!("Falha ao obter HTML do Chromium: {err}");
                let _ = page.close().await;
                let _ = browser.close().await;
                return Err(AppError::Unprocessable(
                    "Falha ao ler conteúdo do portal da SEFAZ.".to_string(),
                ));
            }
        };

        let _ = page.close().await;
        let _ = browser.close().await;

        let lower = html.to_lowercase();
        if is_sefaz_error_content(&lower) {
            return Err(AppError::Unprocessable(SEFAZ_UNAVAILABLE_MSG.to_string()));
        }

        if !rendered {
            if lower.contains("captcha")
                || lower.contains("recaptcha")
                || lower.contains("hcaptcha")
            {
                return Err(AppError::Unprocessable(
                    "O portal da SEFAZ solicitou desafio de Captcha no QR Code. Por favor, utilize a opção 'Importar XML da Nota' para carregar os dados instantaneamente."
                        .to_string(),
                ));
            }

            return Err(AppError::Unprocessable(
                "Tempo limite de 15 segundos atingido sem que os dados da nota fossem renderizados pela SEFAZ. Utilize a opção 'Importar XML da Nota'."
                    .to_string(),
            ));
        }

        Ok(html)
    }
}
