# 🔍 Auditoria Global de Tratamento de Erros — Baixômetro

Documento de mapeamento, diagnóstico e catálogo de padronização de erros do ecossistema **Baixômetro** (Backend Rust Axum e Frontend React PWA).

---

## 1. Visão Geral e Objetivos

Esta auditoria tem por objetivo eliminar falhas silenciosas, travamentos de tela (*loading infinito*) e mensagens técnicas opacas para o usuário comum.

### Princípios de UX para Erros no Baixômetro
Toda resposta de erro apresentada ao usuário deve responder com clareza a três perguntas fundamentais:
1. **O que aconteceu?** (explicado em linguagem humana e acessível).
2. **Por que aconteceu?** (contexto do motivo sem culpar o usuário).
3. **O que fazer agora?** (ação clara e direta para prosseguir, como *"Importar XML"* ou *"Tentar novamente"*).

---

## 2. Erros de Backend (Rust / Axum)

### 2.1 Autenticação e Sessão (`apps/api/src/auth.rs`)

| Arquivo / Função | Linha | HTTP Status | Mensagem Atual | Código Padronizado | Ação / Contexto |
|---|---|---|---|---|---|
| `auth.rs::hash_password` | L76 | 500 | `Falha ao gerar hash Argon2: {err}` | `AUTH_INTERNAL_HASH_ERROR` | Falha interna no hasher de senhas. |
| `auth.rs::create_jwt` | L108 | 500 | `Falha ao assinar JWT: {err}` | `AUTH_INTERNAL_TOKEN_ERROR` | Falha ao assinar payload JWT. |
| `auth.rs::verify_jwt` | L119 | 401 | `Sessão inválida ou expirada` | `AUTH_INVALID_TOKEN` | Token expirado ou assinatura inválida. |
| `auth.rs::verify_jwt` | L122 | 401 | `Identificador de usuário inválido no token` | `AUTH_MALFORMED_CLAIMS` | UUID do usuário corrompido nos claims. |
| `auth.rs::auth_middleware` | L132 | 401 | `Token de autenticação não fornecido` | `AUTH_MISSING_TOKEN` | Header `Authorization` ausente. |
| `auth.rs::auth_middleware` | L140 | 401 | `Cabeçalho Authorization inválido. Formato esperado: Bearer <token>` | `AUTH_MALFORMED_HEADER` | Header sem prefixo `Bearer`. |
| `auth.rs::register` | L158 | 400 | `O nome é obrigatório` | `AUTH_NAME_REQUIRED` | Validação de campo vazio no cadastro. |
| `auth.rs::register` | L163 | 400 | `Informe um e-mail válido` | `AUTH_EMAIL_INVALID` | E-mail sem `@` ou domínio. |
| `auth.rs::register` | L167 | 400 | `A senha deve ter pelo menos 6 caracteres` | `AUTH_PASSWORD_TOO_SHORT` | Senha fraca no cadastro. |
| `auth.rs::register` | L180 | 409 | `Já existe um usuário cadastrado com este e-mail` | `AUTH_EMAIL_ALREADY_EXISTS` | Conflito de unicidade de e-mail. |
| `auth.rs::login` | L212 | 400 | `Informe o e-mail e a senha` | `AUTH_MISSING_CREDENTIALS` | Campos obrigatórios de login vazios. |
| `auth.rs::login` | L228 | 401 | `E-mail ou senha incorretos` | `AUTH_INVALID_CREDENTIALS` | Usuário não localizado no banco. |
| `auth.rs::login` | L231 | 401 | `E-mail ou senha incorretos` | `AUTH_INVALID_CREDENTIALS` | Hash de senha incompatível (Argon2). |
| `auth.rs::update_user_settings` | L270 | 404 | `Usuário não encontrado` | `USER_NOT_FOUND` | Usuário do token não existe mais no banco. |

---

### 2.2 Categorias (`apps/api/src/routes/categories.rs`)

| Arquivo / Função | Linha | HTTP Status | Mensagem Atual | Código Padronizado | Ação / Contexto |
|---|---|---|---|---|---|
| `categories.rs::create_category` | L32 | 400 | `O nome da categoria é obrigatório` | `CATEGORY_NAME_REQUIRED` | Validação de nome nulo/vazio. |
| `categories.rs::create_category` | L38 | 400 | `O nome da categoria deve ter no máximo 60 caracteres` | `CATEGORY_NAME_TOO_LONG` | Limite de tamanho de string. |
| `categories.rs::update_category` | L71 | 400 | `O nome da categoria é obrigatório` | `CATEGORY_NAME_REQUIRED` | Validação na edição de categoria. |
| `categories.rs::update_category` | L99 | 404 | `Categoria não encontrada` | `CATEGORY_NOT_FOUND` | ID da categoria inexistente. |
| `categories.rs::delete_category` | L115 | 404 | `Categoria não encontrada` | `CATEGORY_NOT_FOUND` | Tentativa de exclusão de ID inválido. |

---

### 2.3 Produtos e Mesclagem (`apps/api/src/routes/products.rs`)

| Arquivo / Função | Linha | HTTP Status | Mensagem Atual | Código Padronizado | Ação / Contexto |
|---|---|---|---|---|---|
| `products.rs::get_product_history` | L65 | 404 | `Produto não encontrado` | `PRODUCT_NOT_FOUND` | Histórico de ID inexistente. |
| `products.rs::update_product` | L100 | 400 | `O nome do produto é obrigatório` | `PRODUCT_NAME_REQUIRED` | Validação de nome ao atualizar produto. |
| `products.rs::update_product` | L141 | 404 | `Produto não encontrado` | `PRODUCT_NOT_FOUND` | ID do produto inexistente. |
| `products.rs::merge_products` | L153 | 400 | `O produto de origem e destino não podem ser o mesmo` | `PRODUCT_MERGE_SAME_ID` | Validação de idempotência da mesclagem. |
| `products.rs::merge_products` | L166 | 404 | `Produto de origem não encontrado` | `PRODUCT_SOURCE_NOT_FOUND` | Produto A da mesclagem não existe. |
| `products.rs::merge_products` | L174 | 404 | `Produto de destino não encontrado` | `PRODUCT_TARGET_NOT_FOUND` | Produto B da mesclagem não existe. |
| `products.rs::delete_product` | L256 | 404 | `Produto não encontrado` | `PRODUCT_NOT_FOUND` | Tentativa de excluir ID inexistente. |
| `products.rs::delete_product` | L266 | 409 | `Não é possível excluir produto que já possui histórico de preços...` | `PRODUCT_IN_USE` | Bloqueio de integridade relacional. |

---

### 2.4 Notas Fiscais e Repositório (`apps/api/src/routes/receipts.rs` & `repository/receipts.rs`)

| Arquivo / Função | Linha | HTTP Status | Mensagem Atual | Código Padronizado | Ação / Contexto |
|---|---|---|---|---|---|
| `receipts.rs::get_receipt` | L69 | 404 | `Nota fiscal não encontrada` | `RECEIPT_NOT_FOUND` | Detalhe de nota com ID inexistente. |
| `receipts.rs::preview_receipt` | L124 | 400 | `Requisição multipart inválida: {err}` | `RECEIPT_MULTIPART_INVALID` | Erro de leitura de FormData no preview. |
| `receipts.rs::preview_receipt` | L145 | 400 | `Nenhum arquivo XML foi enviado na requisição.` | `RECEIPT_XML_EMPTY` | Upload multipart sem o campo `file`. |
| `receipts.rs::preview_receipt` | L155 | 400 | `Payload JSON inválido para preview da nota: {err}` | `RECEIPT_JSON_INVALID` | Body JSON corrompido ou malformado. |
| `receipts.rs::preview_receipt` | L166 | 400 | `A chave de acesso ou URL do QR Code é obrigatória.` | `RECEIPT_ACCESS_KEY_REQUIRED` | Payload sem chave ou URL da SEFAZ. |
| `receipts.rs::import_receipt` | L197 | 409 | `Nota fiscal já importada anteriormente` | `RECEIPT_DUPLICATE` | Deduplicação por chave de 44 dígitos. |
| `receipts.rs::import_receipt_xml`| L236 | 400 | `Nenhum arquivo XML foi enviado na requisição.` | `RECEIPT_XML_EMPTY` | Upload direto de XML sem arquivo. |
| `receipt_repository.rs` | L72 | 400 | `O nome do supermercado é obrigatório` | `RECEIPT_STORE_NAME_REQUIRED` | Criação de nota sem mercado. |
| `receipt_repository.rs` | L78 | 400 | `A nota deve conter ao menos um item` | `RECEIPT_NO_ITEMS` | Criação de nota com lista vazia. |
| `receipt_repository.rs` | L86 | 400 | `A descrição do item #{idx + 1} é obrigatória` | `RECEIPT_ITEM_DESC_REQUIRED` | Item de nota sem descrição. |
| `receipt_repository.rs` | L92 | 400 | `Quantidade inválida para o item #{idx + 1}` | `RECEIPT_ITEM_QTY_INVALID` | Quantidade <= 0 ou decimal inválido. |
| `receipt_repository.rs` | L125 | 409 | `Esta nota já foi registrada anteriormente` | `RECEIPT_DUPLICATE` | Conflito na persistência atômica. |

---

### 2.5 Importadores e SEFAZ (`apps/api/src/importers/`)

| Arquivo / Função | Linha | HTTP Status | Mensagem Atual | Código Padronizado | Ação / Contexto |
|---|---|---|---|---|---|
| `headless.rs::fetch_page_content` | L62 | 422 | `Erro ao configurar navegador headless: {err}` | `SEFAZ_HEADLESS_CONFIG_ERROR` | Falha ao instanciar BrowserConfig. |
| `headless.rs::fetch_page_content` | L69 | 422 | `Navegador Chromium não pôde ser iniciado no servidor...` | `SEFAZ_HEADLESS_LAUNCH_ERROR` | Processo do Chromium ausente no host. |
| `headless.rs::fetch_page_content` | L86 | 422 | `Falha ao conectar ao portal da SEFAZ pelo navegador...` | `SEFAZ_CONNECTION_FAILED` | Erro de rede ou DNS no portal da SEFAZ. |
| `headless.rs::fetch_page_content` | L147 | 422 | `O sistema da SEFAZ está temporariamente indisponível...` | `SEFAZ_UNAVAILABLE` | Alerta JS de erro detectado e abortado. |
| `headless.rs::fetch_page_content` | L161 | 422 | `O sistema da SEFAZ está temporariamente indisponível...` | `SEFAZ_UNAVAILABLE` | Erro 500 ou indisponibilidade no HTML. |
| `headless.rs::fetch_page_content` | L193 | 422 | `O portal da SEFAZ solicitou desafio de Captcha no QR Code...` | `SEFAZ_CAPTCHA_REQUIRED` | Captcha visual bloqueando leitura. |
| `headless.rs::fetch_page_content` | L199 | 422 | `Tempo limite de 15 segundos atingido sem que os dados...` | `SEFAZ_TIMEOUT` | Timeout de renderização do portal. |
| `html.rs::fetch_receipt` | L50 | 400 | `A URL ou chave informada não contém uma chave...` | `SEFAZ_INVALID_KEY` | Chave sem 44 dígitos numéricos. |
| `html.rs::parse_sefaz_html` | L119 | 422 | `O sistema da SEFAZ está temporariamente indisponível...` | `SEFAZ_UNAVAILABLE` | Parser HTML detectou página de erro. |
| `html.rs::parse_sefaz_html` | L128 | 422 | `O portal da SEFAZ solicitou verificação de Captcha...` | `SEFAZ_CAPTCHA_REQUIRED` | Parser HTML detectou recaptcha. |
| `html.rs::parse_sefaz_html` | L251 | 422 | `Não foi possível extrair os itens da nota fiscal...` | `SEFAZ_LAYOUT_UNRECOGNIZED` | Layout HTML desconhecido/mudança SEFAZ. |
| `xml.rs::parse_nfce_xml` | L17 | 400 | `Arquivo XML vazio.` | `RECEIPT_XML_EMPTY` | Upload de arquivo com 0 bytes. |
| `xml.rs::parse_nfce_xml` | L156 | 422 | `Falha na estrutura do XML da NFC-e: {err}` | `RECEIPT_XML_MALFORMED` | XML com tags corrompidas ou inválidas. |
| `xml.rs::parse_nfce_xml` | L165 | 422 | `O XML enviado não contém os dados obrigatórios de uma NFC-e...` | `RECEIPT_XML_NOT_NFCE` | XML válido mas sem emitente ou itens. |

---

### 2.6 Camada de Banco de Dados (`apps/api/src/error.rs`)

| Condição SQLx | HTTP Status | Mensagem Atual | Código Padronizado |
|---|---|---|---|
| `db_err.is_unique_violation()` | 409 | `Registro já existe` | `DB_UNIQUE_VIOLATION` |
| `db_err.is_foreign_key_violation()` | 400 | `Referência inválida (ex.: categoria inexistente)` | `DB_FOREIGN_KEY_VIOLATION` |
| `db_err.is_check_violation()` | 400 | `Valor fora do intervalo permitido` | `DB_CHECK_VIOLATION` |
| Erro SQLx genérico | 500 | `Erro interno do servidor` | `INTERNAL_SERVER_ERROR` |

---

## 3. Erros de Frontend (React / TypeScript)

### 3.1 Camada de Comunicação API (`apps/web/src/api.ts`)

| Origem / Cenário | Tipo de Erro | Mensagem Atual | Código Padronizado | Tratamento no Frontend |
|---|---|---|---|---|
| `fetch()` falha de conexão | `TypeError: Failed to fetch` | `Erro de conexão com o servidor` | `NETWORK_DISCONNECTED` | Alerta de conectividade / offline. |
| `fetch()` com timeout | `AbortError: The user aborted a request.` | `Tempo limite de 20s esgotado` | `NETWORK_TIMEOUT` | Modal de sugestão de XML / retry. |
| HTTP 401 não autenticado | `ApiError(401)` | `Sessão inválida ou expirada` | `AUTH_UNAUTHORIZED` | Limpa localStorage e abre login inline. |
| HTTP 409 nota duplicada | `ApiError(409)` | `Esta nota já foi registrada...` | `RECEIPT_DUPLICATE` | Abre modal com link para ver nota existente. |
| HTTP 422 SEFAZ indisponível | `ApiError(422)` | `O sistema da SEFAZ está...` | `SEFAZ_UNAVAILABLE` | Abre `SefazErrorModal` com fallback XML. |
| HTTP 500 interno | `ApiError(500)` | `Erro interno do servidor` | `INTERNAL_SERVER_ERROR` | Banner avisando instabilidade momentânea. |

---

### 3.2 Validação de Formulários e Interação de UI

| Componente / Hook | Linha | Validação / Ação | Mensagem Atual | Código Padronizado |
|---|---|---|---|---|
| `AuthModal.tsx` | L59 | Campos vazios | `Preencha todos os campos obrigatórios.` | `FORM_REQUIRED_FIELDS` |
| `AuthModal.tsx` | L65 | Nome ausente no registro | `Informe seu nome para criar a conta.` | `FORM_NAME_REQUIRED` |
| `AuthModal.tsx` | L69 | Senha curta | `A senha deve ter pelo menos 6 caracteres.` | `FORM_PASSWORD_TOO_SHORT` |
| `useNewReceipt.ts` | L304 | Nome do supermercado vazio | `Informe o nome do supermercado.` | `RECEIPT_STORE_NAME_REQUIRED` |
| `useNewReceipt.ts` | L310 | Descrição do item vazia | `Informe a descrição do item #{idx + 1}.` | `RECEIPT_ITEM_DESC_REQUIRED` |
| `useNewReceipt.ts` | L314 | Quantidade inválida | `Quantidade inválida para "${description}".` | `RECEIPT_ITEM_QTY_INVALID` |
| `useNewReceipt.ts` | L318 | Preço unitário inválido | `Preço unitário inválido para "${description}".` | `RECEIPT_ITEM_PRICE_INVALID` |
| `useNewReceipt.ts` | L333 | Lista de itens vazia | `Adicione ao menos um item à nota fiscal.` | `RECEIPT_NO_ITEMS` |
| `SettingsCategoriesPage.tsx` | L114 | Exclusão de categoria com erro | `alert('Falha ao excluir categoria')` *(crítico UX)* | `CATEGORY_DELETE_ERROR` |
| `SettingsProductsPage.tsx` | L156 | Exclusão de produto com erro | `alert('Falha ao excluir produto')` *(crítico UX)* | `PRODUCT_DELETE_ERROR` |

---

## 4. Diagnóstico de Lacunas e Plano de Ação

1. **Ausência de Códigos de Máquina no Backend:** O `ErrorResponse` anterior retornava apenas `error: String`, forçando o frontend a comparar trechos de texto em português (ex: `msg.contains("indisponível")`).
   - *Solução:* Padronizar a resposta para `{ "error": { "code": "...", "message": "...", "details": "..." } }`.
2. **Uso de `alert()` Nativo no Navegador:** Componentes de configurações utilizavam o `alert()` nativo do navegador ao falhar na exclusão de categorias ou produtos.
   - *Solução:* Substituir por estados visuais no padrão do design system.
3. **Ausência de Error Boundary Global:** Qualquer falha de renderização no React provocava tela branca inteira no SPA.
   - *Solução:* Implementar componente global [`ErrorBoundary.tsx`](file:///c:/Projects%20Github/Baixometro/apps/web/src/components/ErrorBoundary.tsx) com recuperação graciosa.
4. **Catálogo Centralizado de UX:** Centralizar todas as mensagens em [`apps/web/src/lib/errorMessages.ts`](file:///c:/Projects%20Github/Baixometro/apps/web/src/lib/errorMessages.ts) seguindo rigorosamente a tríade *"O que houve / Por que / O que fazer"*.

