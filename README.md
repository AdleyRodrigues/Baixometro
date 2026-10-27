# Baixômetro

> Gerenciador pessoal de preços de supermercado, local-first, open-source-ready.

O **Baixômetro** é um aplicativo mobile-first projetado para permitir o escaneamento de QR Code de NFC-e (nota fiscal de consumidor eletrônica), registro automático de itens de compra, categorização de gastos e acompanhamento histórico da evolução de preços por produto e por estabelecimento. Desenvolvido para uso pessoal inicial com visão de crowdsourcing colaborativo no futuro.

---

## 🚀 Status do Projeto

**Fase 0 — Fundação** (Bootstrap da infraestrutura, monorepo, API mínima e SPA PWA).

---

## 🛠️ Stack Tecnológica

- **Frontend:** React 19, Vite 6, TypeScript, `@vite-plugin-pwa` (PWA instalável e mobile-first)
- **Backend:** Rust, Axum 0.8, SQLx 0.8 (PostgreSQL), Tokio, `tower-http`, `ts-rs`
- **Banco de Dados:** PostgreSQL 16
- **Infraestrutura:** Docker Compose para desenvolvimento local
- **Monorepo:** pnpm workspaces (JavaScript/TypeScript) + Cargo workspace (Rust) + Makefile

---

## 🏃 Como Rodar Localmente

### Pré-requisitos
- Docker & Docker Compose
- Node.js 22+ e pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)
- Rust (Cargo) 1.83+
- Make (ou Docker Compose diretamente)

### Passos rápidos

1. Clone o repositório e configure as variáveis de ambiente:
   ```bash
   cp .env.example .env
   ```

2. Inicie todos os serviços com o Makefile:
   ```bash
   make dev
   ```
   *(Ou caso prefira subir apenas o banco primeiro: `make up` e depois `make dev`)*

---

## 🌐 URLs Locais

| Serviço | URL | Descrição |
|---|---|---|
| **Frontend Web (PWA)** | [http://localhost:5173](http://localhost:5173) | Interface React do Baixômetro |
| **API Health Check** | [http://localhost:3000/health](http://localhost:3000/health) | Endpoint de verificação de integridade |
| **PWA Manifest** | [http://localhost:5173/manifest.webmanifest](http://localhost:5173/manifest.webmanifest) | Manifesto da aplicação web instalável |
| **PostgreSQL** | `localhost:5432` | Banco de dados relacional (`baixometro`) |

---

## 📋 Comandos do Makefile

- `make dev` — Constrói e inicializa todos os containers em primeiro plano com hot reload.
- `make up` — Inicializa containers em background (detached mode).
- `make down` — Para e remove os containers da aplicação.
- `make logs` — Acompanha os logs em tempo real de todos os serviços.
- `make shell-api` — Abre um terminal bash interativo no container da API.
- `make psql` — Conecta diretamente na CLI interativa do PostgreSQL.
- `make clean` — Para os serviços e remove volumes e redes órfãs.

---

## 📄 Licença

Distribuído sob a licença MIT. Consulte [LICENSE](LICENSE) para obter mais informações.
