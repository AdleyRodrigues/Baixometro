use std::time::Duration;

use chromiumoxide::browser::{Browser, BrowserConfig};
use futures::StreamExt;

use crate::error::AppError;

pub struct HeadlessBrowser;

impl HeadlessBrowser {
    /// Abre a URL em um navegador Chromium invisível (headless),
    /// aguarda até 15 segundos pela renderização da tabela de itens da NFC-e
    /// e extrai o HTML dinâmico completo gerado pelo Javascript da SEFAZ.
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

        let page = browser.new_page(url).await.map_err(|err| {
            tracing::warn!("Falha ao abrir aba no Chromium para {url}: {err}");
            AppError::Unprocessable(
                "Falha ao conectar ao portal da SEFAZ pelo navegador headless. Utilize a opção 'Importar XML da Nota'."
                    .to_string(),
            )
        })?;

        // Aguarda até 15 segundos para a tabela de itens ou conteúdo renderizar
        let start = std::time::Instant::now();
        let timeout = Duration::from_secs(15);
        let mut rendered = false;

        while start.elapsed() < timeout {
            if page.find_element("#tabResult tr").await.is_ok()
                || page.find_element("tr[id^=\"Item\"]").await.is_ok()
                || page.find_element("table.tabelaItens tr").await.is_ok()
                || page.find_element(".txtTit").await.is_ok()
                || page.find_element("#conteudo").await.is_ok()
            {
                rendered = true;
                break;
            }

            tokio::time::sleep(Duration::from_millis(500)).await;
        }

        let html = page.content().await.map_err(|err| {
            tracing::warn!("Falha ao obter HTML do Chromium: {err}");
            AppError::Unprocessable("Falha ao ler conteúdo do portal da SEFAZ.".to_string())
        })?;

        let _ = page.close().await;
        let _ = browser.close().await;

        if !rendered {
            let lower = html.to_lowercase();
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
