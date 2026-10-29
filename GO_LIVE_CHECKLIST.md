# 🚀 Checklist de Go-Live — Baixômetro

Guia passo a passo para colocar o **Baixômetro** no ar em produção, configurar o banco de dados em nuvem, variáveis de segurança, chaves de apoio e instalar o Progressive Web App (PWA) no smartphone.

---

## 📋 Resumo dos 6 Passos

1. [Gerar `JWT_SECRET` Seguro](#passo-1-gerar-o-jwt_secret-seguro)
2. [Criar o Banco de Dados PostgreSQL Gerenciado](#passo-2-criar-o-banco-postgresql-gerenciado)
3. [Configurar as Variáveis de Ambiente](#passo-3-configurar-as-variveis-de-ambiente)
4. [Conectar ao Repositório e Fazer o Deploy](#passo-4-conectar-ao-repositrio-e-fazer-o-deploy)
5. [Configurar Domínio Próprio e SSL (Opcional)](#passo-5-configurar-domnio-prprio-e-ssl-opcional)
6. [Instalar o PWA no Celular e Teste Real](#passo-6-instalar-o-pwa-no-celular-e-teste-real)

---

## Passo 1: Gerar o `JWT_SECRET` Seguro

O token JWT assina as sessões dos usuários. Nunca utilize senhas padrão em produção.

Execute no seu terminal (Linux, macOS ou WSL/Git Bash no Windows):

```bash
openssl rand -base64 32
```

Exemplo de saída:
```text
k8j3+vN9aQ1tL8wP5zY2xR4mC7uE0oG2hF9sD6bV1wE=
```

Guarde essa chave em um gerenciador de segredos. Ela será informada no backend.

---

## Passo 2: Criar o Banco PostgreSQL Gerenciado

A API roda com SQLx e aplica todas as migrações automaticamente no momento da inicialização (`sqlx::migrate!`). Escolha um dos provedores gratuitos ou gerenciados:

### Opção A: Neon Database (Recomendado Serverless)
1. Crie uma conta gratuita em [neon.tech](https://neon.tech).
2. Crie um novo projeto (ex: `baixometro-prod`).
3. Copie a connection string fornecida no dashboard:
   ```text
   postgres://usuario:senha@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### Opção B: Supabase
1. Crie um projeto em [supabase.com](https://supabase.com).
2. Vá em **Project Settings → Database** e copie a URI de conexão (Modo *Session* ou *Direct* com porta `5432` ou `6543`).

### Opção C: Render Postgres
Se optar pelo Blueprint do Render (`render.yaml`), o banco gerenciado `baixometro-db` é criado e provisionado automaticamente.

---

## Passo 3: Configurar as Variáveis de Ambiente

Crie o seu arquivo `.env` de produção baseado no `.env.example`:

| Variável | Onde Configurar | Exemplo de Valor | Descrição |
|---|---|---|---|
| `DATABASE_URL` | Backend | `postgres://user:pass@host/db?sslmode=require` | Conexão com o PostgreSQL |
| `JWT_SECRET` | Backend | *(Gerado no Passo 1)* | Segredo para assinatura de tokens JWT |
| `RUST_LOG` | Backend | `info,baixometro_api=info` | Nível de logs da aplicação |
| `PORT` | Backend | `3000` | Porta interna da API |
| `VITE_API_URL` | Frontend | `https://api.seudominio.com` ou `/api` | URL pública da API REST |
| `VITE_PIX_KEY` | Frontend | `sua-chave-pix@banco.com.br` | Chave Pix para doações (opcional) |

> 💡 **Nota sobre `VITE_PIX_KEY`:** Se você não configurar essa variável, o card de Pix na tela de Apoio (`/settings/support`) será automaticamente ocultado, exibindo apenas os botões de GitHub Sponsors e Ko-fi.

---

## Passo 4: Conectar ao Repositório e Fazer o Deploy

### Opção 1: Render (Deploy com Blueprint Automático)
1. Acesse [render.com](https://render.com) e conecte sua conta do GitHub.
2. Clique em **New + → Blueprint** e selecione o repositório `Baixometro`.
3. O Render lerá o arquivo [`render.yaml`](render.yaml) na raiz:
   - Criará a instância PostgreSQL gerenciada (`baixometro-db`).
   - Criará o serviço `baixometro-api` com 2GB de RAM (necessário para o Chromium Headless de bypass da SEFAZ).
   - Criará o serviço estático `baixometro-web` rodando o SPA com Nginx.
4. Após o primeiro build da API, configure `VITE_API_URL` no serviço web com a URL pública gerada para o backend (ex: `https://baixometro-api.onrender.com`).

### Opção 2: Fly.io (Deploy CLI)
1. Instale o Flyctl e autentique-se:
   ```bash
   fly auth login
   ```
2. Inicialize a API com base no [`fly.toml`](fly.toml):
   ```bash
   fly launch --no-deploy
   fly secrets set DATABASE_URL="sua_connection_string" \
                   JWT_SECRET="$(openssl rand -base64 32)"
   fly deploy
   ```
3. O `fly.toml` já reserva `1024mb` de RAM para a execução sem falhas do Chromium Headless.

### Opção 3: VPS Própria (Docker Compose)
1. Clone o repositório no seu servidor (Ubuntu/Debian):
   ```bash
   git clone https://github.com/AdleyRodrigues/Baixometro.git /opt/baixometro
   cd /opt/baixometro
   ```
2. Configure o arquivo `.env` com suas credenciais.
3. Suba os containers com:
   ```bash
   docker compose -f infra/docker-compose.prod.yml --env-file .env up --build -d
   ```
4. O container `baixometro-web-prod` escuta na porta `80` e faz proxy reverso de `/api` para a porta interna `3000`.

---

## Passo 5: Configurar Domínio Próprio e SSL (Opcional)

1. **DNS:** Aponte um registro `A` ou `CNAME` no seu provedor de domínio (ex: Cloudflare, Registro.br, Route53) para o IP da sua VPS ou para o CNAME do Render/Fly.io.
2. **SSL:**
   - No Render / Fly.io: O certificado TLS/SSL Let's Encrypt é emitido de forma 100% automática.
   - Na VPS: Utilize o Certbot (`certbot --nginx -d app.seudominio.com`) ou Cloudflare Flexible SSL.
3. **Importância do HTTPS:** A API da Câmera (`navigator.mediaDevices.getUserMedia`) e as chamadas PWA **exigem** conexão segura HTTPS no smartphone.

---

## Passo 6: Instalar o PWA no Celular e Teste Real

Com o app publicado em HTTPS:

1. **Abra no Smartphone:** Acesse a URL de produção no navegador do celular (Chrome no Android ou Safari no iOS).
2. **Instalação PWA:**
   - **Android (Chrome):** Toque no banner "Adicionar Baixômetro à tela inicial" ou no menu de 3 pontos → *"Instalar aplicativo"*.
   - **iOS (Safari):** Toque no botão de Compartilhar (quadrado com seta para cima) → *"Adicionar à Tela de Início"*.
3. **Teste no Supermercado:**
   - Faça uma compra e pegue o comprovante fiscal com QR Code da SEFAZ (NFC-e).
   - Abra o Baixômetro pelo ícone na tela inicial do celular.
   - Toque em **Nova Nota** (`/receipts/new`).
   - Aponte a câmera para o QR Code da nota:
     - O backend headless Rust carregará a página da SEFAZ, aguardará a renderização dos itens e extrairá produtos, preços e quantidades.
     - Revise os itens importados e toque em **Salvar Nota**.
4. Parabéns! Seu **Baixômetro** pessoal e colaborativo está 100% no ar e operante! 🛒🎉

