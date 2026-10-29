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

> 💡 **Dica para câmera no celular:** O servidor Vite em modo dev suporta conexões **HTTP e HTTPS simultaneamente na porta `5173`**. Para abrir a câmera no celular via rede local, acesse `https://<IP-DA-SUA-MAQUINA>:5173` e aceite o certificado autoassinado.

---

## 🚀 Como Rodar em Produção (Docker Multi-Stage)

O projeto conta com imagens otimizadas de produção ([`Dockerfile.api.prod`](infra/docker/Dockerfile.api.prod) com binário Rust `--release` em `debian:bookworm-slim` e [`Dockerfile.web.prod`](infra/docker/Dockerfile.web.prod) servindo o bundle estático via `nginx:alpine` com proxy reverso para `/api`).

```bash
docker compose -f infra/docker-compose.prod.yml up --build -d
```

- **App Web (Nginx + Proxy `/api`):** [http://localhost](http://localhost) (porta `80`)
- **API Direta:** [http://localhost:3000/health](http://localhost:3000/health) (porta `3000`)

Para encerrar os containers de produção:
```bash
docker compose -f infra/docker-compose.prod.yml down
```

---

## 📋 Comandos Úteis (`Makefile`)

| Comando | Descrição |
|---|---|
| `make dev` | Constrói e inicializa o ambiente de desenvolvimento com hot-reload |
| `make up` | Inicia os containers de desenvolvimento em segundo plano (`-d`) |
| `make down` | Para e remove os containers de desenvolvimento |
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
