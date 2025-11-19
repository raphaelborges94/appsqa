/* server/index.js */
'use strict';

/** 1) Variáveis de ambiente (.env.local > .env) */
try {
  const fs = require('fs');
  const path = require('path');
  const dotenv = require('dotenv');

  const explicit = process.env.DOTENV_CONFIG_PATH;
  const localPath = explicit || path.resolve(process.cwd(), '.env.local');
  const envPath = fs.existsSync(localPath)
    ? localPath
    : (fs.existsSync(path.resolve(process.cwd(), '.env'))
        ? path.resolve(process.cwd(), '.env')
        : null);

  if (envPath) {
    dotenv.config({ path: envPath });
    console.log(`[env] carregado de ${envPath}`);
  } else {
    console.log('[env] nenhum .env.local/.env encontrado (usando variáveis do processo).');
  }
} catch (e) {
  console.warn('[env] falha ao carregar dotenv:', e?.message);
}

/** 2) Imports padrão e rotas */
const express = require('express');
const cors = require('cors');

const entitiesRouter = require('./routes/entities');
const dbRouter = require('./routes/db');
const datasetRouter = require('./routes/dataset');
const usersRouter = require('./routes/users');
const empresasRouter = require('./routes/empresas');
const ssoRouter = require('./routes/sso');

// Middleware de autenticação do BI (JWT próprio)
const { requireAuth } = require('./middlewares/auth');

/** 3) App e middlewares */
const app = express();
app.set('trust proxy', true);

// CORS (se CORS_ORIGIN não vier, libera geral)
if (process.env.CORS_ORIGIN) {
  app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
} else {
  app.use(cors());
}

app.use(express.json({ limit: process.env.JSON_LIMIT || '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Log simples em dev
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[api] ${req.method} ${req.originalUrl}`);
    next();
  });
}

/** 4) Rotas */

// === Rotas públicas (não exigem token do BI) ===

// Health simples
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    ts: new Date().toISOString(),
    node: process.version,
    env: process.env.NODE_ENV || 'development',
  });
});

// Rotas de SSO (integração com SQAHUB): /api/sso
app.use('/api/sso', ssoRouter);

// === A partir daqui, tudo sob /api requer autenticação do BI ===
app.use('/api', requireAuth);

// CRUD genérico das entidades salvas em disco
// /api/entities/Connection, /api/entities/DataSource, etc.
app.use('/api/entities', entitiesRouter);

// Rotas de banco: /api/db/test-connection, /api/db/list-objects, /api/db/health
app.use('/api/db', dbRouter);

// Rotas de dataset: /api/dataset/validate, /api/dataset/fetch
app.use('/api/dataset', datasetRouter);

// Rotas de usuários (PostgreSQL): /api/users
app.use('/api/users', usersRouter);

// Rotas de empresas (PostgreSQL): /api/empresas
app.use('/api/empresas', empresasRouter);

// 404 somente para caminhos sob /api que não bateram em nenhuma rota acima
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Handler global de erros
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[api:error]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    status,
  });
});

/** 5) Boot */
const PORT = Number(process.env.PORT) || 5174;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`[self-hosted] API rodando em http://localhost:${PORT}/api`);
});
