# 🐳 Deployment Docker - Ecossistema SQA

## 📋 Visão Geral

Este documento descreve como fazer o deploy do **SQAHUB** e **SQABI** no mesmo container Docker para produção, conforme solicitado.

---

## 🏗️ Arquitetura de Deploy

```
┌──────────────────────────────────────────────────────────┐
│                    Docker Container                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────┐           ┌──────────────────┐      │
│  │   NGINX        │           │   PostgreSQL     │      │
│  │   (Reverse     │           │   (Database)     │      │
│  │    Proxy)      │           │                  │      │
│  │                │           │  Port: 5432      │      │
│  │  Port: 80/443  │           └──────────────────┘      │
│  └────────┬───────┘                     │               │
│           │                             │               │
│           │                             │               │
│  ┌────────▼───────┐           ┌─────────▼────────┐      │
│  │   SQAHUB       │◄─────────►│   SQABI          │      │
│  │                │    SSO    │                  │      │
│  │  Backend: 8547 │           │  Backend: 5174   │      │
│  │  Frontend: /   │           │  Frontend: /bi   │      │
│  └────────────────┘           └──────────────────┘      │
│                                                          │
└──────────────────────────────────────────────────────────┘
        │                            │
        │                            │
        ▼                            ▼
   Internet                      Internet
```

---

## 📁 Estrutura de Arquivos

```
project-root/
├── docker/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── docker-compose.yml
│   └── .env.production
├── SQA HUB/
│   ├── dist/                    # Build frontend
│   ├── src/backend/            # Backend Node.js
│   └── package.json
├── SQA BI/
│   ├── dist/                    # Build frontend
│   ├── server/                 # Backend Node.js
│   └── package.json
└── scripts/
    ├── build.sh
    ├── deploy.sh
    └── migrate.sh
```

---

## 🐳 Dockerfile

Crie o arquivo `docker/Dockerfile`:

```dockerfile
# Dockerfile - Ecossistema SQA
FROM node:18-alpine AS builder

# Instalar dependências de build
RUN apk add --no-cache python3 make g++

# Diretório de trabalho
WORKDIR /app

# ===== Build SQAHUB =====
COPY "SQA HUB/package*.json" ./sqahub/
WORKDIR /app/sqahub
RUN npm ci --only=production

COPY "SQA HUB/" ./
RUN npm run build

# ===== Build SQABI =====
WORKDIR /app/sqabi
COPY "SQA BI/package*.json" ./
RUN npm ci --only=production

COPY "SQA BI/" ./
RUN npm run build

# ===== Imagem Final =====
FROM node:18-alpine

# Instalar nginx e supervisor
RUN apk add --no-cache nginx supervisor postgresql-client

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Criar diretórios necessários
RUN mkdir -p /app/sqahub /app/sqabi /var/run/supervisor /var/log/supervisor

# Copiar builds do stage anterior
COPY --from=builder --chown=nodejs:nodejs /app/sqahub/dist /app/sqahub/dist
COPY --from=builder --chown=nodejs:nodejs /app/sqahub/src/backend /app/sqahub/backend
COPY --from=builder --chown=nodejs:nodejs /app/sqahub/node_modules /app/sqahub/node_modules

COPY --from=builder --chown=nodejs:nodejs /app/sqabi/dist /app/sqabi/dist
COPY --from=builder --chown=nodejs:nodejs /app/sqabi/server /app/sqabi/server
COPY --from=builder --chown=nodejs:nodejs /app/sqabi/node_modules /app/sqabi/node_modules

# Copiar configurações
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisord.conf

# Expor portas
EXPOSE 80 443

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/api/health || exit 1

# Iniciar com supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
```

---

## 🔧 Configuração do Nginx

Crie o arquivo `docker/nginx.conf`:

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss
               application/rss+xml font/truetype font/opentype
               application/vnd.ms-fontobject image/svg+xml;

    # ===== SQAHUB (HUB) =====
    server {
        listen 80 default_server;
        server_name _;

        # Frontend do HUB
        location / {
            root /app/sqahub/dist;
            try_files $uri $uri/ /index.html;

            # Cache de assets
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }

        # Backend do HUB
        location /api {
            proxy_pass http://localhost:8547;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }

        # OAuth endpoints
        location /oauth {
            proxy_pass http://localhost:8547;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # OpenID Connect Discovery
        location /.well-known {
            proxy_pass http://localhost:8547;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
        }

        # ===== SQABI (BI) =====
        # Frontend do BI
        location /bi {
            alias /app/sqabi/dist;
            try_files $uri $uri/ /bi/index.html;

            # Cache de assets
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }

        # Backend do BI
        location /bi/api {
            rewrite ^/bi/api/(.*)$ /api/$1 break;
            proxy_pass http://localhost:5174;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }

    # ===== SSL Configuration (se necessário) =====
    # server {
    #     listen 443 ssl http2;
    #     server_name suaempresa.com;
    #
    #     ssl_certificate /etc/nginx/ssl/cert.pem;
    #     ssl_certificate_key /etc/nginx/ssl/key.pem;
    #     ssl_protocols TLSv1.2 TLSv1.3;
    #     ssl_ciphers HIGH:!aNULL:!MD5;
    #
    #     # ... mesmas configurações de location acima
    # }
}
```

---

## 🔄 Configuração do Supervisor

Crie o arquivo `docker/supervisord.conf`:

```ini
[supervisord]
nodaemon=true
user=root
logfile=/var/log/supervisor/supervisord.log
pidfile=/var/run/supervisord.pid

[program:nginx]
command=/usr/sbin/nginx -g "daemon off;"
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/nginx.err.log
stdout_logfile=/var/log/supervisor/nginx.out.log

[program:sqahub-backend]
command=node /app/sqahub/backend/server.js
directory=/app/sqahub
autostart=true
autorestart=true
user=nodejs
environment=NODE_ENV="production"
stderr_logfile=/var/log/supervisor/sqahub-backend.err.log
stdout_logfile=/var/log/supervisor/sqahub-backend.out.log

[program:sqabi-backend]
command=node /app/sqabi/server/index.js
directory=/app/sqabi
autostart=true
autorestart=true
user=nodejs
environment=NODE_ENV="production"
stderr_logfile=/var/log/supervisor/sqabi-backend.err.log
stdout_logfile=/var/log/supervisor/sqabi-backend.out.log
```

---

## 🐙 Docker Compose

Crie o arquivo `docker/docker-compose.yml`:

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: sqa-postgres
    restart: always
    environment:
      POSTGRES_DB: ${PGDATABASE:-sqahub}
      POSTGRES_USER: ${PGUSER:-postgres}
      POSTGRES_PASSWORD: ${PGPASSWORD:-changeme}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Aplicação SQA (HUB + BI)
  sqa-app:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    container_name: sqa-app
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      # Database
      PGHOST: postgres
      PGPORT: 5432
      PGDATABASE: ${PGDATABASE:-sqahub}
      PGUSER: ${PGUSER:-postgres}
      PGPASSWORD: ${PGPASSWORD:-changeme}

      # HUB Backend
      PORT: 8547
      NODE_ENV: production
      JWT_SECRET: ${JWT_SECRET}
      SSO_SECRET: ${SSO_SECRET}

      # BI Backend
      SQAHUB_API_URL: http://localhost:8547

      # URLs de produção
      SQA_BI_URL: ${SQA_BI_URL:-http://localhost/bi}
      VITE_API_URL: ${VITE_API_URL:-http://localhost}

      # Email (Passwordless)
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASSWORD: ${SMTP_PASSWORD}
      EMAIL_FROM: ${EMAIL_FROM}

      # OAuth
      OAUTH_ISSUER: ${OAUTH_ISSUER:-http://localhost}
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - app_logs:/var/log/supervisor
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  postgres_data:
    driver: local
  app_logs:
    driver: local

networks:
  default:
    name: sqa-network
```

---

## ⚙️ Variáveis de Ambiente de Produção

Crie o arquivo `docker/.env.production`:

```bash
# ===== Database =====
PGHOST=postgres
PGPORT=5432
PGDATABASE=sqahub
PGUSER=postgres
PGPASSWORD=SENHA_SUPER_SEGURA_AQUI

# ===== Secrets =====
JWT_SECRET=gere_uma_chave_aleatoria_muito_longa_e_segura_256_bits
SSO_SECRET=gere_outra_chave_diferente_tambem_muito_segura_256_bits

# ===== URLs de Produção =====
SQA_BI_URL=https://suaempresa.com/bi
VITE_API_URL=https://suaempresa.com

# ===== Email (Passwordless) =====
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SUA_API_KEY_SENDGRID
EMAIL_FROM=SQA HUB <noreply@suaempresa.com>

# ===== OAuth =====
OAUTH_ISSUER=https://suaempresa.com
OAUTH_AUTHORIZATION_CODE_EXPIRES_IN=600
OAUTH_ACCESS_TOKEN_EXPIRES_IN=3600
OAUTH_REFRESH_TOKEN_EXPIRES_IN=2592000

# ===== Outros =====
NODE_ENV=production
TZ=America/Sao_Paulo
LOG_LEVEL=info
```

---

## 🚀 Scripts de Deploy

### Script de Build

Crie o arquivo `scripts/build.sh`:

```bash
#!/bin/bash
set -e

echo "🔨 Building SQAHUB..."
cd "SQA HUB"
npm ci
npm run build
cd ..

echo "🔨 Building SQABI..."
cd "SQA BI"
npm ci
npm run build
cd ..

echo "✅ Build completo!"
```

### Script de Migração

Crie o arquivo `scripts/migrate.sh`:

```bash
#!/bin/bash
set -e

echo "🔄 Executando migrations..."

# Aguardar PostgreSQL estar pronto
until docker-compose -f docker/docker-compose.yml exec -T postgres pg_isready -U postgres; do
  echo "Aguardando PostgreSQL..."
  sleep 2
done

# Executar migrations
docker-compose -f docker/docker-compose.yml exec -T sqa-app \
  node /app/sqahub/backend/migrate.js

echo "✅ Migrations executadas com sucesso!"
```

### Script de Deploy

Crie o arquivo `scripts/deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Iniciando deploy do Ecossistema SQA..."

# 1. Build das aplicações
./scripts/build.sh

# 2. Parar containers existentes
echo "🛑 Parando containers existentes..."
docker-compose -f docker/docker-compose.yml down

# 3. Build da imagem Docker
echo "🐳 Building Docker image..."
docker-compose -f docker/docker-compose.yml build --no-cache

# 4. Iniciar serviços
echo "▶️ Iniciando serviços..."
docker-compose -f docker/docker-compose.yml up -d

# 5. Aguardar serviços estarem prontos
echo "⏳ Aguardando serviços..."
sleep 10

# 6. Executar migrations
./scripts/migrate.sh

# 7. Verificar saúde dos serviços
echo "🏥 Verificando health checks..."
docker-compose -f docker/docker-compose.yml ps

echo "✅ Deploy concluído com sucesso!"
echo "🌐 Acesse: http://localhost"
echo "📊 BI: http://localhost/bi"
```

Dar permissão de execução:

```bash
chmod +x scripts/*.sh
```

---

## 📦 Deploy Passo a Passo

### 1. Preparar Ambiente

```bash
# Clonar repositório (se aplicável)
git clone <repo-url>
cd projeto

# Criar diretórios necessários
mkdir -p docker scripts
```

### 2. Criar Arquivos de Configuração

Crie todos os arquivos listados acima:
- `docker/Dockerfile`
- `docker/nginx.conf`
- `docker/supervisord.conf`
- `docker/docker-compose.yml`
- `docker/.env.production`
- `scripts/build.sh`
- `scripts/migrate.sh`
- `scripts/deploy.sh`

### 3. Configurar Variáveis de Ambiente

Edite `docker/.env.production` com suas credenciais reais.

**IMPORTANTE**: Gere secrets fortes:

```bash
# Gerar JWT_SECRET
openssl rand -base64 48

# Gerar SSO_SECRET
openssl rand -base64 48
```

### 4. Executar Deploy

```bash
# Tornar scripts executáveis
chmod +x scripts/*.sh

# Executar deploy
./scripts/deploy.sh
```

### 5. Verificar Deployment

```bash
# Verificar containers rodando
docker-compose -f docker/docker-compose.yml ps

# Verificar logs
docker-compose -f docker/docker-compose.yml logs -f sqa-app

# Testar endpoints
curl http://localhost/api/health
curl http://localhost/bi/api/health
```

### 6. Acessar Aplicações

- **SQAHUB**: http://localhost (ou https://suaempresa.com)
- **SQABI**: http://localhost/bi (ou https://suaempresa.com/bi)

---

## 🔒 Configurar SSL/HTTPS

### Opção 1: Let's Encrypt (Certbot)

```bash
# Instalar certbot no container
docker-compose -f docker/docker-compose.yml exec sqa-app \
  apk add certbot certbot-nginx

# Obter certificados
docker-compose -f docker/docker-compose.yml exec sqa-app \
  certbot --nginx -d suaempresa.com -d www.suaempresa.com

# Renovação automática
docker-compose -f docker/docker-compose.yml exec sqa-app \
  sh -c "echo '0 12 * * * /usr/bin/certbot renew --quiet' | crontab -"
```

### Opção 2: Certificado Próprio

Adicione ao `docker-compose.yml`:

```yaml
volumes:
  - ./ssl/cert.pem:/etc/nginx/ssl/cert.pem:ro
  - ./ssl/key.pem:/etc/nginx/ssl/key.pem:ro
```

---

## 📊 Monitoramento e Logs

### Ver Logs em Tempo Real

```bash
# Todos os serviços
docker-compose -f docker/docker-compose.yml logs -f

# Apenas SQAHUB
docker-compose -f docker/docker-compose.yml logs -f sqa-app

# Apenas PostgreSQL
docker-compose -f docker/docker-compose.yml logs -f postgres
```

### Acessar Logs do Supervisor

```bash
docker-compose -f docker/docker-compose.yml exec sqa-app \
  tail -f /var/log/supervisor/sqahub-backend.out.log

docker-compose -f docker/docker-compose.yml exec sqa-app \
  tail -f /var/log/supervisor/sqabi-backend.out.log
```

---

## 🔄 Backup e Restore

### Backup do Banco de Dados

```bash
# Criar backup
docker-compose -f docker/docker-compose.yml exec postgres \
  pg_dump -U postgres sqahub > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup automatizado (adicionar ao cron)
0 2 * * * cd /path/to/project && docker-compose -f docker/docker-compose.yml exec -T postgres pg_dump -U postgres sqahub | gzip > /backups/sqahub_$(date +\%Y\%m\%d).sql.gz
```

### Restore do Banco de Dados

```bash
# Restaurar backup
docker-compose -f docker/docker-compose.yml exec -T postgres \
  psql -U postgres sqahub < backup_20241117_120000.sql
```

---

## 🎯 Comandos Úteis

```bash
# Reiniciar aplicação
docker-compose -f docker/docker-compose.yml restart sqa-app

# Parar tudo
docker-compose -f docker/docker-compose.yml down

# Iniciar tudo
docker-compose -f docker/docker-compose.yml up -d

# Rebuild imagem
docker-compose -f docker/docker-compose.yml build --no-cache

# Limpar volumes (CUIDADO!)
docker-compose -f docker/docker-compose.yml down -v

# Ver status
docker-compose -f docker/docker-compose.yml ps

# Executar comando no container
docker-compose -f docker/docker-compose.yml exec sqa-app sh
```

---

## ✅ Checklist de Produção

- [ ] Secrets configurados (JWT_SECRET, SSO_SECRET)
- [ ] Banco de dados com senha forte
- [ ] SSL/HTTPS configurado
- [ ] Email SMTP configurado
- [ ] Backups automatizados
- [ ] Monitoramento configurado
- [ ] Logs sendo coletados
- [ ] Firewall configurado
- [ ] DNS apontando para servidor
- [ ] Health checks funcionando

---

**Deployment bem-sucedido! 🎉**
