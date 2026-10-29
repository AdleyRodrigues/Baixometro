# Guia de Contribuição — Baixômetro 🤝

Obrigado pelo interesse em contribuir com o **Baixômetro**! Este documento reúne o fluxo básico para abrir *issues*, enviar *Pull Requests* e validar suas alterações localmente.

---

## 🐛 Reportando Bugs e Sugerindo Melhorias (Issues)

1. Antes de abrir uma nova *issue*, verifique se já não existe uma discussão aberta sobre o mesmo tema.
2. Ao reportar um bug, inclua:
   - Passos claros para reproduzir o problema;
   - Logs relevantes da API (`docker logs baixometro-api`) ou do console do navegador;
   - Sistema operacional e navegador utilizados.

---

## 🔧 Fluxo de Desenvolvimento para Pull Requests

1. Faça um **fork** do repositório e crie uma branch descritiva a partir da `main`:
   ```bash
   git checkout -b feat/minha-melhoria
   # ou
   git checkout -b fix/correcao-calculo-preco
   ```

2. Suba o ambiente de desenvolvimento com Docker Compose:
   ```bash
   cp .env.example .env
   docker compose -f infra/docker-compose.yml --env-file .env up -d
   ```

3. **Se alterar modelos da API (`apps/api/src/models.rs`):**
   Regere os contratos TypeScript compartilhados em `packages/shared-types` rodando os testes da API:
   ```bash
   docker exec baixometro-api cargo test
   ```

---

## ✅ Checklist de Qualidade (Linters, Testes e Build)

Nosso pipeline de CI no GitHub Actions (`.github/workflows/ci.yml`) executa as validações abaixo em todo *push* e *Pull Request*. Certifique-se de que todos passam antes de abrir o PR:

### 1. Backend (Rust / Axum)
```bash
# Verificar formatação do código Rust
cargo fmt --all -- --check

# Executar testes unitários e exportação de tipos ts-rs
docker exec baixometro-api cargo test --workspace

# Compilar a API
docker exec baixometro-api cargo build
```

### 2. Frontend (React / Vite / TypeScript)
```bash
# Instalar dependências
pnpm install --frozen-lockfile

# Verificar tipos TypeScript (lint)
pnpm lint

# Testar o build de produção do frontend
pnpm build:web
```

### 3. Grafo de Código (Graphify — Opcional para Agentes de IA)
Caso utilize agentes de IA no desenvolvimento, atualize o grafo local (não versionado no Git):
```bash
python -m graphify update .
```

---

## 📝 Padrão de Commits

Utilizamos **Conventional Commits** em português ou inglês:
- `feat: adiciona filtro por mercado no histórico`
- `fix: corrige conversão de gramatura em ml`
- `docs: atualiza instruções de produção no README`
- `chore: atualiza dependências do workspace`

