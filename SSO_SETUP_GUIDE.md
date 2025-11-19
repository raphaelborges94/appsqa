# 🚀 Guia de Configuração - Sistema SSO Ecossistema SQA

## 📋 Sumário

1. [Pré-requisitos](#pré-requisitos)
2. [Instalação](#instalação)
3. [Configuração do Banco de Dados](#configuração-do-banco-de-dados)
4. [Configuração das Variáveis de Ambiente](#configuração-das-variáveis-de-ambiente)
5. [Executando as Migrações](#executando-as-migrações)
6. [Iniciando os Serviços](#iniciando-os-serviços)
7. [Testando o SSO](#testando-o-sso)
8. [Deploy em Produção](#deploy-em-produção)
9. [Troubleshooting](#troubleshooting)

---

## 🔧 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** >= 18.x
- **PostgreSQL** >= 14.x
- **npm** >= 9.x
- **Git** (opcional, para controle de versão)

### Verificar Versões

```bash
node --version    # Deve retornar v18.x ou superior
npm --version     # Deve retornar 9.x ou superior
psql --version    # Deve retornar 14.x ou superior
```

---

## 📦 Instalação

### 1. Navegar até a pasta raiz do projeto

```bash
cd "C:\Users\rapha\OneDrive\Área de Trabalho\SQA\Conciliador Contábil\Fontes"
```

### 2. Instalar dependências do SQAHUB

```bash
cd "SQA HUB"
npm install
```

### 3. Instalar dependências do SQABI

```bash
cd "../SQA BI"
npm install
```

### 4. Instalar dependência adicional no BI (node-fetch)

O servidor do BI precisa do `node-fetch` para fazer requisições HTTP ao HUB:

```bash
cd server
npm install node-fetch@3.3.2
cd ..
```

---

## 🗄️ Configuração do Banco de Dados

### 1. Criar o Banco de Dados

Entre no PostgreSQL como superusuário:

```bash
psql -U postgres
```

Execute os comandos:

```sql
-- Criar banco de dados (se ainda não existir)
CREATE DATABASE sqahub;

-- Conectar ao banco
\c sqahub

-- Verificar se as tabelas existem
\dt
```

### 2. Verificar/Criar Usuário

```sql
-- Criar usuário (se necessário)
CREATE USER seu_usuario WITH PASSWORD 'sua_senha_segura';

-- Conceder permissões
GRANT ALL PRIVILEGES ON DATABASE sqahub TO seu_usuario;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO seu_usuario;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO seu_usuario;
```

---

## ⚙️ Configuração das Variáveis de Ambiente

### SQAHUB - Configurar `.env.local`

Navegue até a pasta do SQAHUB:

```bash
cd "SQA HUB"
```

Crie ou edite o arquivo `.env.local` com base no `.env.example`:

```bash
# Copiar o exemplo
cp .env.example .env.local

# Editar com seu editor favorito
# Windows: notepad .env.local
# VS Code: code .env.local
```

**Configurações mínimas necessárias**:

```bash
# ===== Database =====
PGHOST=localhost
PGPORT=5432
PGDATABASE=sqahub
PGUSER=postgres
PGPASSWORD=sua_senha_aqui

# ===== Backend =====
PORT=8547
NODE_ENV=development

# ===== JWT & SSO =====
JWT_SECRET=mude_este_secret_em_producao_use_string_aleatoria_longa
SSO_SECRET=mude_este_sso_secret_em_producao_diferente_do_jwt

# ===== Frontend =====
VITE_API_URL=http://localhost:8547

# ===== SSO Service URLs =====
SQA_BI_URL=http://localhost:5173
```

### SQABI - Configurar `.env.local`

Navegue até a pasta do SQABI:

```bash
cd "../SQA BI"
```

O arquivo `.env.local` deve conter:

```bash
# ===== Frontend =====
VITE_SELF_HOSTED=true
VITE_API_BASE=http://localhost:5174

# ===== Backend =====
PORT=5174
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# ===== Database (mesmo do HUB) =====
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=sua_senha_aqui
PGDATABASE=sqahub

# ===== SSO Configuration =====
SQAHUB_API_URL=http://localhost:8547
```

---

## 🔄 Executando as Migrações

As migrações criam as tabelas necessárias no banco de dados.

### 1. Navegar até a pasta do SQAHUB

```bash
cd "SQA HUB"
```

### 2. Executar as migrações

```bash
node src/backend/migrate.js
```

**Saída esperada**:

```
✅ Migration 001_initial_schema.sql executada com sucesso
✅ Migration 002_oauth2_oidc.sql executada com sucesso
✅ Migration 003_screen_builder.sql executada com sucesso
✅ Migration 004_branding_menu.sql executada com sucesso
✅ Migration 005_fix_testedoze_to_uuid.sql executada com sucesso
✅ Migration 006_add_screen_type.sql executada com sucesso
✅ Migration 007_enhance_users_table.sql executada com sucesso
✅ Migration 008_add_cpf_to_users.sql executada com sucesso
✅ Migration 009_add_grupo_to_users.sql executada com sucesso
✅ Migration 010_create_sessions_table.sql executada com sucesso
✅ Migration 011_create_passwords_table.sql executada com sucesso
✅ Migration 012_create_sso_tokens_table.sql executada com sucesso
🎉 Todas as migrações foram executadas com sucesso!
```

### 3. Verificar tabelas criadas

Entre no PostgreSQL:

```bash
psql -U postgres -d sqahub
```

Liste as tabelas:

```sql
\dt

-- Deve mostrar a tabela sso_tokens entre outras
```

Verifique a estrutura da tabela SSO:

```sql
\d sso_tokens
```

---

## 🚀 Iniciando os Serviços

### Opção 1: Terminal Único (Recomendado para Desenvolvimento)

#### SQAHUB

```bash
cd "SQA HUB"
npm run dev
```

Este comando inicia:
- Frontend (Vite): `http://localhost:8546`
- Backend (Express): `http://localhost:8547`

#### SQABI (em outro terminal)

```bash
cd "SQA BI"
npm run dev
```

Este comando inicia:
- Frontend (Vite): `http://localhost:5173`
- Backend (Express): `http://localhost:5174`

### Opção 2: Terminais Separados

**Terminal 1 - SQAHUB Frontend**:
```bash
cd "SQA HUB"
npm run dev:frontend
```

**Terminal 2 - SQAHUB Backend**:
```bash
cd "SQA HUB"
npm run dev:backend
```

**Terminal 3 - SQABI Web**:
```bash
cd "SQA BI"
npm run dev:web
```

**Terminal 4 - SQABI API**:
```bash
cd "SQA BI"
npm run dev:api
```

### Verificar que os serviços estão rodando

**SQAHUB**:
- Frontend: http://localhost:8546
- Backend: http://localhost:8547/api/health

**SQABI**:
- Frontend: http://localhost:5173
- Backend: http://localhost:5174/api/health

---

## 🧪 Testando o SSO

### Passo 1: Criar um Usuário de Teste

Entre no banco de dados:

```bash
psql -U postgres -d sqahub
```

Crie um usuário:

```sql
INSERT INTO users (id, email, full_name, role, created_at)
VALUES (
  gen_random_uuid(),
  'admin@sqahub.com',
  'Administrador',
  'admin',
  CURRENT_TIMESTAMP
);
```

### Passo 2: Fazer Login no SQAHUB

1. Acesse: http://localhost:8546
2. Digite o email: `admin@sqahub.com`
3. Clique em "Enviar Link de Acesso"
4. **Se DEV_BYPASS_EMAIL estiver configurado**, você será autenticado automaticamente
5. **Caso contrário**, verifique seu email para o link de acesso

### Passo 3: Acessar o Construtor de BI

1. No menu lateral, clique em **"Construtores de Tela"**
2. Clique em **"Construtor de BI"** (último item da lista)
3. Na página que abrir, clique em **"Abrir SQABI em Nova Janela"**

### Passo 4: Verificar Autenticação Automática

1. Uma nova janela/aba deve abrir
2. Você deve ver a página de callback SSO com loading
3. Após alguns segundos, deve ser redirecionado para o dashboard do BI
4. Você está autenticado automaticamente! ✅

### Passo 5: Verificar Logs

**Console do SQAHUB**:
```
📨 POST /api/sso/generate-token
[SSO] Token gerado para usuário admin@sqahub.com (uuid) -> sqa-bi
📨 POST /api/sso/validate-token
[SSO] Token validado com sucesso: admin@sqahub.com (uuid) -> sqa-bi
```

**Console do SQABI**:
```
[api] POST /api/sso/validate
[SSO] Token validado: admin@sqahub.com (uuid)
```

---

## 🏭 Deploy em Produção

### 1. Configurações de Segurança

**SQAHUB `.env` (produção)**:

```bash
# Alterar secrets
JWT_SECRET=gere_uma_chave_aleatoria_muito_longa_e_segura_aqui
SSO_SECRET=gere_outra_chave_aleatoria_diferente_e_muito_segura

# Configurar URLs de produção
SQA_BI_URL=https://bi.suaempresa.com
VITE_API_URL=https://hub.suaempresa.com

# Usar HTTPS
NODE_ENV=production

# Desabilitar bypass de desenvolvimento
DEV_BYPASS_EMAIL=
VITE_DEV_BYPASS_EMAIL=

# Configurar email real
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=sua_api_key_do_sendgrid
EMAIL_FROM=SQA HUB <noreply@suaempresa.com>
```

**SQABI `.env` (produção)**:

```bash
# URLs de produção
SQAHUB_API_URL=https://hub.suaempresa.com
VITE_API_BASE=https://bi.suaempresa.com/api

# Produção
NODE_ENV=production

# CORS restritivo
CORS_ORIGIN=https://bi.suaempresa.com
```

### 2. Build dos Projetos

**SQAHUB**:
```bash
cd "SQA HUB"
npm run build
```

**SQABI**:
```bash
cd "SQA BI"
npm run build
```

### 3. Executar em Produção

**Com PM2 (Recomendado)**:

```bash
# Instalar PM2 globalmente
npm install -g pm2

# SQAHUB Backend
cd "SQA HUB"
pm2 start src/backend/server.js --name sqahub-backend

# SQABI Backend
cd "../SQA BI"
pm2 start server/index.js --name sqabi-backend

# Servir os frontends com nginx ou outro servidor HTTP
```

### 4. Configurar Nginx (Opcional)

**SQAHUB** (`/etc/nginx/sites-available/sqahub`):

```nginx
server {
    listen 80;
    server_name hub.suaempresa.com;

    # Frontend
    location / {
        root /var/www/sqahub/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8547;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**SQABI** (`/etc/nginx/sites-available/sqabi`):

```nginx
server {
    listen 80;
    server_name bi.suaempresa.com;

    # Frontend
    location / {
        root /var/www/sqabi/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5174;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. Habilitar SSL (Certbot/Let's Encrypt)

```bash
# Instalar certbot
sudo apt install certbot python3-certbot-nginx

# Obter certificados
sudo certbot --nginx -d hub.suaempresa.com
sudo certbot --nginx -d bi.suaempresa.com
```

---

## 🐛 Troubleshooting

### Erro: "Cannot find module 'node-fetch'"

**Solução**:
```bash
cd "SQA BI/server"
npm install node-fetch@3.3.2
```

### Erro: "relation 'sso_tokens' does not exist"

**Solução**: Execute as migrações:
```bash
cd "SQA HUB"
node src/backend/migrate.js
```

### Erro: "ECONNREFUSED" ao acessar o BI

**Causa**: SQAHUB não está rodando ou URL incorreta.

**Solução**:
1. Verifique se o SQAHUB está rodando: http://localhost:8547/api/health
2. Verifique a variável `SQAHUB_API_URL` no `.env.local` do BI

### Token SSO expira antes de usar

**Causa**: Tokens SSO têm validade de 5 minutos.

**Solução**: Aumente o tempo de expiração em `routes/sso.js`:
```javascript
const SSO_TOKEN_EXPIRY = 10 * 60; // 10 minutos
```

### Frontend do BI não carrega

**Causa**: Porta 5173 já está em uso.

**Solução**:
```bash
# Matar processo na porta 5173 (Windows)
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5173 | xargs kill -9
```

---

## 📚 Documentação Adicional

- **Documentação SSO Completa**: `SSO_DOCUMENTATION.md`
- **Autenticação**: `SETUP_AUTH.md`
- **OAuth2/OIDC**: `OAUTH_DOCUMENTATION.md`
- **Segurança**: `SECURITY_CHECKLIST.md`

---

## 🎯 Próximos Passos

Após configurar o SSO básico:

1. ✅ Testar autenticação entre HUB e BI
2. ✅ Configurar permissões de usuário
3. ✅ Implementar logout global
4. ✅ Adicionar mais serviços (Finance, CRM, HR)
5. ✅ Configurar monitoramento e alertas
6. ✅ Realizar testes de penetração
7. ✅ Documentar procedimentos de backup

---

## 📞 Suporte

Para dúvidas ou problemas:
- Consulte a documentação completa em `SSO_DOCUMENTATION.md`
- Verifique os logs do servidor (console)
- Abra uma issue no GitHub (se aplicável)

---

**Boa sorte com seu ecossistema SQA! 🚀**
