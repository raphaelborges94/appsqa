/* server/routes/db.js */
'use strict';

const express = require('express');
const router = express.Router();

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

/* =========================================================
   Localiza o arquivo de conexões (storage em JSON)
   Compatível com o entities.js (connections.json)
   ========================================================= */
async function findConnectionsFile() {
  const envDataDir = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : null;
  const cwd = process.cwd();

  const candidates = [
    // Formato atual usado pelo fileStore/entities.js
    envDataDir && path.join(envDataDir, 'connections.json'),
    envDataDir && path.join(envDataDir, 'entities', 'connections.json'),

    path.join(cwd, 'data', 'connections.json'),
    path.join(cwd, 'data', 'entities', 'connections.json'),
    path.join(cwd, 'server', 'data', 'connections.json'),
    path.join(cwd, 'server', 'data', 'entities', 'connections.json'),

    // Retrocompatibilidade com Connection.json (antigo)
    envDataDir && path.join(envDataDir, 'Connection.json'),
    envDataDir && path.join(envDataDir, 'entities', 'Connection.json'),
    path.join(cwd, 'data', 'Connection.json'),
    path.join(cwd, 'data', 'entities', 'Connection.json'),
    path.join(cwd, 'server', 'data', 'Connection.json'),
    path.join(cwd, 'server', 'data', 'entities', 'Connection.json'),
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/* =========================================================
   Carrega conexão por ID e "achata" o config
   (host, port, database, etc saem na raiz do objeto)
   ========================================================= */
async function loadConnectionById(id) {
  const filePath = await findConnectionsFile();
  if (!filePath) {
    throw new Error('Arquivo de conexões não encontrado (connections.json)');
  }

  const raw = await fsp.readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw);

  const items = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.items)
    ? parsed.items
    : Array.isArray(parsed.data)
    ? parsed.data
    : [];

  const found = items.find((x) => String(x.id) === String(id));
  if (!found) throw new Error('Conexão não encontrada');

  const cfg =
    found.config && typeof found.config === 'object'
      ? found.config
      : {};

  // Junta as props de config na raiz (sem perder o resto)
  return {
    ...found,
    ...cfg,
  };
}

/* =========================================================
   Cliente por dialeto
   ========================================================= */
async function getClient(conn) {
  const type = (conn?.type || '').toLowerCase();

  if (type.includes('postgres')) {
    const { Client } = require('pg');
    const client = new Client({
      host: conn.host,
      port: Number(conn.port || 5432),
      user: conn.user || conn.username,
      password: conn.password,
      database: conn.database || conn.db || conn.name,
      ssl: conn.ssl ? { rejectUnauthorized: false } : false,
    });
    await client.connect();
    return { dialect: 'postgres', client, close: () => client.end() };
  }

  if (type.includes('mysql')) {
    const mysql = require('mysql2/promise');
    const client = await mysql.createConnection({
      host: conn.host,
      port: Number(conn.port || 3306),
      user: conn.user || conn.username,
      password: conn.password,
      database: conn.database || conn.db || conn.name,
      ssl: conn.ssl ? { rejectUnauthorized: false } : undefined,
    });
    return { dialect: 'mysql', client, close: () => client.end() };
  }

  if (type.includes('mssql') || type.includes('sqlserver')) {
    const sql = require('mssql');
    const pool = await sql.connect({
      server: conn.host,
      port: Number(conn.port || 1433),
      user: conn.user || conn.username,
      password: conn.password,
      database: conn.database || conn.db || conn.name,
      options: {
        encrypt: !!conn.ssl,
        trustServerCertificate: !!conn.ssl,
      },
    });
    return { dialect: 'mssql', client: pool, close: () => pool.close() };
  }

  if (type.includes('sqlite')) {
    const Database = require('better-sqlite3');
    const dbPath = conn.database || conn.db || conn.name;
    if (!dbPath) {
      throw new Error('Caminho do arquivo SQLite não informado');
    }
    const db = new Database(dbPath);
    return { dialect: 'sqlite', client: db, close: () => db.close() };
  }

  throw new Error(`Tipo de conexão não suportado: ${conn.type || 'desconhecido'}`);
}

/* =========================================================
   ROTAS
   (este router é montado em /api/db lá no index.js)
   ========================================================= */

/* Teste de conexão: POST /api/db/test-connection */
router.post('/test-connection', async (req, res) => {
  try {
    const {
      host,
      port,
      user,
      username,
      password,
      database,
      db,
      ssl,
      type,
    } = req.body || {};

    const { dialect, client, close } = await getClient({
      host,
      port,
      user: user || username,
      username: user || username,
      password,
      database: database || db,
      db: database || db,
      ssl,
      type,
    });

    // SELECT 1 por dialeto
    if (dialect === 'sqlite') {
      client.prepare('SELECT 1').get();
    } else if (dialect === 'mysql') {
      await client.query('SELECT 1');
    } else if (dialect === 'mssql') {
      await client.request().query('SELECT 1');
    } else {
      await client.query('SELECT 1');
    }

    await close();
    res.json({
      success: true,
      dialect,
      message: 'Conexão bem-sucedida',
    });
  } catch (e) {
    console.error('[db:test-connection] erro:', e);
    res.status(400).json({
      success: false,
      message: e.message || 'Erro ao testar conexão',
    });
  }
});

/* Lista tabelas/views: POST /api/db/list-objects */
router.post('/list-objects', async (req, res) => {
  try {
    const { connection_id } = req.body || {};
    if (!connection_id) {
      return res
        .status(400)
        .json({ success: false, error: 'connection_id é obrigatório' });
    }

    const conn = await loadConnectionById(connection_id);
    const { dialect, client, close } = await getClient(conn);

    let tables = [];
    let views = [];

    if (dialect === 'postgres') {
      const schemaFilter = conn.schema && String(conn.schema).trim()
        ? String(conn.schema).trim()
        : null;

      const whereCommon = schemaFilter
        ? `table_schema = $1`
        : `table_schema NOT IN ('pg_catalog','information_schema')`;

      const params = schemaFilter ? [schemaFilter] : [];

      const tablesSQL = `
        SELECT table_schema, table_name, table_type
        FROM information_schema.tables
        WHERE ${whereCommon}
        ORDER BY table_schema, table_name;
      `;
      const rs = await client.query(tablesSQL, params);

      tables = rs.rows
        .filter((r) => r.table_type === 'BASE TABLE')
        .map((r) =>
          schemaFilter
            ? r.table_name
            : `${r.table_schema}.${r.table_name}`
        );

      views = rs.rows
        .filter((r) => r.table_type === 'VIEW')
        .map((r) =>
          schemaFilter
            ? r.table_name
            : `${r.table_schema}.${r.table_name}`
        );
    } else if (dialect === 'mysql') {
      const [rows] = await client.query(
        `SELECT TABLE_NAME as table_name, TABLE_TYPE as table_type
         FROM information_schema.tables
         WHERE TABLE_SCHEMA = ?
         ORDER BY TABLE_NAME;`,
        [conn.database || conn.db || conn.name]
      );
      tables = rows
        .filter((r) => r.table_type === 'BASE TABLE')
        .map((r) => r.table_name);
      views = rows
        .filter((r) => r.table_type === 'VIEW')
        .map((r) => r.table_name);
    } else if (dialect === 'mssql') {
      const rs = await client.request().query(`
        SELECT TABLE_SCHEMA AS table_schema, TABLE_NAME AS table_name, TABLE_TYPE AS table_type
        FROM INFORMATION_SCHEMA.TABLES
        ORDER BY TABLE_SCHEMA, TABLE_NAME;
      `);
      tables = rs.recordset
        .filter((r) => r.table_type === 'BASE TABLE')
        .map((r) => `${r.table_schema}.${r.table_name}`);
      views = rs.recordset
        .filter((r) => r.table_type === 'VIEW')
        .map((r) => `${r.table_schema}.${r.table_name}`);
    } else if (dialect === 'sqlite') {
      const stmt = client.prepare(`
        SELECT name, type
        FROM sqlite_master
        WHERE type IN ('table','view')
        ORDER BY name;
      `);
      const rows = stmt.all();
      tables = rows.filter((r) => r.type === 'table').map((r) => r.name);
      views = rows.filter((r) => r.type === 'view').map((r) => r.name);
    } else {
      throw new Error(`Dialeto não suportado para list-objects: ${dialect}`);
    }

    await close();
    res.json({ success: true, tables, views });
  } catch (e) {
    console.error('[db:list-objects] erro:', e);
    res
      .status(400)
      .json({ success: false, error: e.message || String(e) });
  }
});

/* (Opcional) health deste router: GET /api/db/health */
router.get('/health', (_req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

module.exports = router;
