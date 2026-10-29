# Baixômetro 🛒📉

> **Gerenciador pessoal de preços de supermercado, mobile-first, local-first e open-source.**

O **Baixômetro** ajuda você a acompanhar a evolução real do preço dos produtos que compra no supermercado, identificar inflação por item ("alertas de alta"), comparar estabelecimentos por **R$/kg ou R$/L** e visualizar para onde vai o seu orçamento mensal — escaneando o QR Code da **NFC-e** diretamente pelo celular ou lançando notas manualmente.

---

## ✨ Funcionalidades Principais

- **📷 Scanner de QR Code NFC-e (Mobile-First):** Leitura da chave de acesso de 44 dígitos direto pela câmera do celular (`html5-qrcode`) com pré-preenchimento para revisão antes de salvar.
- **🧠 Inteligência e Matching de Produtos:**
  - Vinculação automática de itens por código de barras (**GTIN/EAN**) ou apelidos históricos (`product_aliases`), além de vínculo manual.
  - Cálculo normalizado automático do preço por quilo ou litro (**R$/kg ou L**), extraindo gramaturas de descrições como `500g`, `5kg`, `1.5L`, `900ml`.
- **🚨 Alertas de Inflação Pessoal (`GET /alerts`):** Destaque imediato no topo do Dashboard para produtos cujo preço subiu mais de **10%** em relação à média dos últimos 30 dias.
- **📊 Dashboard Analítico em Tempo Real (Recharts):**
  - Filtro dinâmico por período (**Mês Atual**, **Últimos 3 meses**, **Ano**).
  - Cálculo de **Economia vs. Média de 30 dias**.
  - Gráfico de área da **Evolução Mensal de Gastos** (últimos 6 meses).
  - Gráfico **Donut (`PieChart`)** de proporção nas **Top 5 Categorias**.
  - Ranking dos **Top 5 Mercados** e lista de **Produtos Monitorados**.
- **📈 Histórico de Preços por Produto (`/products/:id`):** Gráfico `LineChart` comparativo entre mercados ao longo do tempo, menor preço histórico e alternância entre `R$/kg·L` e preço unitário.
- **🧾 Histórico e Detalhamento de Notas (`/receipts` e `/receipts/:id`):** Busca instantânea por nome do mercado ou data e visualização completa dos itens comprados.
- **🔒 Contratos Tipados Fim a Fim (`ts-rs`):** Structs Rust geram automaticamente as interfaces TypeScript consumidas pelo frontend em `packages/shared-types`.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologias |
|---|---|
| **Frontend (`apps/web`)** | React 19, Vite 6, TypeScript, React Router 7, Recharts, `html5-qrcode`, `vite-plugin-pwa` |
| **Backend (`apps/api`)** | Rust, Axum 0.8, SQLx 0.8 (PostgreSQL + migrations embutidas), Tokio, `rust_decimal`, `ts-rs` |
| **Banco de Dados** | PostgreSQL 16 |
| **Infra & CI/CD** | Docker & Docker Compose (Dev & Prod Multi-stage), Nginx, GitHub Actions |
| **Contexto de IA** | Graphify (`python -m graphify`) para mapeamento em grafo da arquitetura |

---

## 🏃 Como Rodar Localmente (Desenvolvimento)

### Pré-requisitos
- **Docker** e **Docker Compose**
- *(Opcional fora do Docker)* **Node.js 22+** com `pnpm` (`corepack enable`) e **Rust 1.89+**
- **Make** (opcional, para atalhos)

### Passo a passo

1. **Clone o repositório e crie o arquivo `.env`:**
   ```bash
   git clone https://github.com/AdleyRodrigues/Baixometro.git
   cd Baixometro
   cp .env.example .env
   ```

2. **Suba o ambiente de desenvolvimento:**
   ```bash
   # Sobe em background:
   make up
   # Ou em primeiro plano com build e logs:
   make dev
   ```
   *(Sem `make`, execute diretamente: `docker compose -f infra/docker-compose.yml --env-file .env up --build`)*

3. **Acesse no navegador ou celular:**
   - **Frontend (HTTP ou HTTPS na mesma porta):** [http://localhost:5173](http://localhost:5173) ou [https://localhost:5173](https://localhost:5173)
   - **API Health Check:** [http://localhost:3000/health](http://localhost:3000/health)

> 💡 **Dica para câmera no celular:** O servidor Vite em modo dev suporta conexões **HTTP e HTTPS simultaneamente na porta `5173`** com certificados válidos gerados pelo `mkcert`. Para usar a câmera do leitor de QR Code no celular via rede local, configure o certificado raiz uma única vez seguindo as instruções abaixo.

### 📱 Como instalar o Certificado HTTPS (mkcert) no Celular (Android e iOS)

O Vite utiliza certificados emitidos localmente pelo `mkcert`. No computador host, a CA local é instalada automaticamente no repositório de certificados do sistema operacional. Para que os navegadores do seu smartphone (Android/iOS) também reconheçam a conexão `https://<IP-DO-SEU-PC>:5173` como 100% confiável e liberem o uso da câmera sem barreiras:

#### 1. Baixar o Certificado Raiz no Celular
Conecte o smartphone na mesma rede Wi-Fi do computador e abra no navegador:
```
http://<IP-DO-SEU-PC>:5173/rootCA.crt
```
*(ou `http://<IP-DO-SEU-PC>:5173/rootCA.pem`)*. O download começará imediatamente.

#### 2. Instalar no Android
1. Vá em **Configurações** > **Segurança e Privacidade** (ou **Segurança**).
2. Toque em **Mais configurações de segurança** > **Criptografia e credenciais** (ou **Instalar do armazenamento**).
3. Selecione **Instalar um certificado** > **Certificado CA**.
4. Caso surja um aviso de segurança do sistema, confirme tocando em **Instalar mesmo assim**.
5. Selecione o arquivo `rootCA.crt` baixado e autentique com seu PIN ou biometria.

#### 3. Instalar no iOS (iPhone / iPad)
1. Baixe o certificado pelo **Safari** acessando a URL acima e toque em **Permitir** quando perguntar sobre o perfil de configuração.
2. Abra os **Ajustes** > toque em **Perfil Baixado** (no topo) ou vá em **Geral** > **VPN e Gerenciamento de Dispositivos**.
3. Selecione o perfil `mkcert development CA` e toque em **Instalar** no canto superior direito (insira a senha do aparelho).
4. **Habilitar confiança total (obrigatório no iOS):** Vá em **Ajustes** > **Geral** > **Sobre** > **Ajustes de Confiança de Certificados** (no final da página).
5. Na seção *Ativar confiança total para certificados raiz*, ative a chave ao lado de **mkcert root** e confirme.

#### 4. Usar no Celular
Acesse **`https://<IP-DO-SEU-PC>:5173`** no Chrome ou Safari do seu smartphone: a página abrirá com HTTPS seguro e a câmera abrirá instantaneamente ao clicar em "Escanear QR Code" ou "Nova Nota".

---

## 🚀 Como colocar o Baixômetro no ar (Deploy em Produção)

O Baixômetro está pronto para ir ao ar tanto em uma **VPS (via Docker Compose)** quanto em plataformas de **PaaS (Render, Fly.io, Railway)** usando bancos de dados PostgreSQL gerenciados (**Neon**, **Supabase**, **Render Postgres**).

- **Migrations Automáticas:** A API Rust executa `sqlx::migrate!` automaticamente na inicialização (`main.rs`), criando todas as tabelas e categorias padrão no banco novo sem intervenção manual.
- **SPA Routing no Nginx:** O arquivo [`infra/docker/nginx.conf`](infra/docker/nginx.conf) redireciona todas as rotas do React Router (`/dashboard`, `/settings`, `/receipts/new`, etc.) para o `index.html` (`try_files $uri $uri/ /index.html;`), evitando erros `404` ao atualizar a página.

---

### Opção 1: Deploy em uma VPS com Docker Compose (DigitalOcean, Contabo, Hetzner)

1. **Acesse sua VPS via SSH e clone o repositório:**
   ```bash
   git clone https://github.com/AdleyRodrigues/Baixometro.git
   cd Baixometro
   ```

2. **Crie e configure o arquivo `.env` de produção:**
   ```bash
   cp .env.example .env
   nano .env
   ```
   Defina senhas fortes e um segredo JWT seguro (`openssl rand -hex 32`):
   ```env
   POSTGRES_USER=baixometro
   POSTGRES_PASSWORD=sua_senha_forte_do_postgres
   POSTGRES_DB=baixometro
   DATABASE_URL=postgres://baixometro:sua_senha_forte_do_postgres@postgres:5432/baixometro

   PORT=3000
   API_PORT=3000
   RUST_LOG=info,baixometro_api=info
   JWT_SECRET=cole_aqui_o_resultado_de_openssl_rand_base64_32
   VITE_PIX_KEY=sua_chave_pix_aqui_ou_deixe_em_branco

   # Usando o Nginx embutido como proxy reverso (/api -> api:3000):
   VITE_API_URL=/api
   ```
   *(Se preferir usar um banco gerenciado externo como **Neon** ou **Supabase**, basta colocar a string `postgres://...?sslmode=require` diretamente em `DATABASE_URL`.)*

   > 💡 **Checklist de Produção:** Consulte o guia passo a passo em [**GO_LIVE_CHECKLIST.md**](GO_LIVE_CHECKLIST.md) para o roteiro completo de publicação.

3. **Suba os containers otimizados de produção em background:**
   ```bash
   docker compose -f infra/docker-compose.prod.yml --env-file .env up --build -d
   ```

4. **Verifique se os serviços estão online:**
   - **Aplicação Web (Nginx na porta `80`):** `http://SEU_IP_OU_DOMINIO`
   - **Healthcheck Público da API:** `http://SEU_IP_OU_DOMINIO/api/health` (ou `http://SEU_IP_OU_DOMINIO:3000/health`)

Para encerrar os containers de produção:
```bash
docker compose -f infra/docker-compose.prod.yml down
```

---

### Opção 2: Deploy em PaaS (Render, Fly.io ou Railway) + Banco Gerenciado (Neon / Supabase)

#### A) Deploy de 1 Clique no Render (`render.yaml`)
O repositório inclui o Blueprint [`render.yaml`](render.yaml) na raiz:
1. No painel do **Render**, clique em **New + → Blueprint** e conecte seu repositório do GitHub.
2. O Render criará automaticamente o banco `baixometro-db`, o serviço Docker `baixometro-api` (gerando `JWT_SECRET` automaticamente e injetando `DATABASE_URL`) e o site estático `baixometro-web`.
3. Nas variáveis do `baixometro-web`, defina `VITE_API_URL` com a URL pública gerada para o `baixometro-api` (ex.: `https://baixometro-api.onrender.com`).

#### B) Deploy no Fly.io (`fly.toml`)
O repositório inclui o arquivo [`fly.toml`](fly.toml) pré-configurado para a região `gru` (São Paulo):
```bash
# 1. Crie o app no Fly.io
fly launch --no-deploy

# 2. Configure a URL do seu banco gerenciado (ex.: Neon/Supabase) e o JWT_SECRET
fly secrets set DATABASE_URL="postgres://usuario:senha@ep-xyz.neon.tech/neondb?sslmode=require" \
                JWT_SECRET="$(openssl rand -base64 32)"

# 3. Faça o deploy da API
fly deploy
```
Para o frontend (`Dockerfile.web.prod`), injete a URL pública do backend no build:
```bash
docker build -f infra/docker/Dockerfile.web.prod \
  --build-arg VITE_API_URL="https://baixometro-api.fly.dev" \
  -t baixometro-web:prod .
```

---

## 📋 Comandos Úteis (`Makefile`)

| Comando | Descrição |
|---|---|
| `make dev` | Constrói e inicializa o ambiente de desenvolvimento com hot-reload |
| `make up` | Inicia os containers de desenvolvimento em segundo plano (`-d`) |
| `make down` | Para e remove os containers de desenvolvimento |
| `make reset-db` | Zera completamente os volumes do banco (`down -v`) e sobe o Postgres limpo |
| `make logs` | Exibe os logs em tempo real de todos os serviços |
| `make shell-api` | Abre um terminal interativo dentro do container `baixometro-api` |
| `make psql` | Abre o cliente interativo `psql` conectado ao banco `baixometro` |
| `make prod-up` | Constrói e sobe a stack de produção (`infra/docker-compose.prod.yml`) |
| `make prod-down` | Encerra a stack de produção |
| `make clean` | Remove containers, volumes e redes órfãs do ambiente de desenvolvimento |

---

## 🤝 Como Contribuir e Arquitetura

- Leia o guia de contribuição em [**CONTRIBUTING.md**](CONTRIBUTING.md).
- Entenda as decisões técnicas e o modelo de dados em [**ARCHITECTURE.md**](ARCHITECTURE.md).

---

## 📄 Licença

Distribuído sob a licença **MIT**. Consulte [LICENSE](LICENSE) para mais detalhes.
