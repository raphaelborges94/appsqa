/* server/routes/dataset.js */
'use strict';

const express = require('express');
const router = express.Router();

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

/* =========================================================
   Localiza o arquivo de conexões (igual ao db.js)
   ========================================================= */
async function findConnectionsFile() {
  const envDataDir = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : null;
  const cwd = process.cwd();

  const candidates = [
    envDataDir && path.join(envDataDir, 'connections.json'),
    envDataDir && path.join(envDataDir, 'entities', 'connections.json'),
    path.join(cwd, 'data', 'connections.json'),
    path.join(cwd, 'data', 'entities', 'connections.json'),
    path.join(cwd, 'server', 'data', 'connections.json'),
    path.join(cwd, 'server', 'data', 'entities', 'connections.json'),

    // Retrocompatibilidade
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
   Carrega conexão por ID
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
   Mapeia tipos de dados SQL para tipos genéricos
   ========================================================= */
function mapFieldType(sqlType, dialect) {
  const typeStr = String(sqlType || '').toLowerCase();

  // Tipos numéricos
  if (
    typeStr.includes('int') ||
    typeStr.includes('numeric') ||
    typeStr.includes('decimal') ||
    typeStr.includes('float') ||
    typeStr.includes('double') ||
    typeStr.includes('real') ||
    typeStr.includes('money')
  ) {
    return 'number';
  }

  // Tipos de data/hora
  if (
    typeStr.includes('date') ||
    typeStr.includes('time') ||
    typeStr.includes('timestamp')
  ) {
    return 'date';
  }

  // Tipos booleanos
  if (typeStr.includes('bool') || typeStr.includes('bit')) {
    return 'boolean';
  }

  // Padrão: string
  return 'string';
}

/* =========================================================
   Detecta se campo é agregável (numérico)
   ========================================================= */
function isAggregable(type) {
  return type === 'number';
}

/* =========================================================
   ROTAS
   ========================================================= */

/* Valida dataset: POST /api/dataset/validate */
router.post('/validate', async (req, res) => {
  try {
    const { connection_id, source_type, table_name, sql_query } = req.body || {};

    if (!connection_id) {
      return res.status(400).json({
        success: false,
        message: 'connection_id é obrigatório',
      });
    }

    if (!source_type) {
      return res.status(400).json({
        success: false,
        message: 'source_type é obrigatório',
      });
    }

    if (source_type !== 'query' && !table_name) {
      return res.status(400).json({
        success: false,
        message: 'table_name é obrigatório para source_type diferente de query',
      });
    }

    if (source_type === 'query' && !sql_query) {
      return res.status(400).json({
        success: false,
        message: 'sql_query é obrigatório para source_type query',
      });
    }

    // Carrega conexão
    const conn = await loadConnectionById(connection_id);
    const { dialect, client, close } = await getClient(conn);

    // Monta a query de validação
    let queryText;
    if (source_type === 'query') {
      queryText = `SELECT * FROM (${sql_query}) AS subquery LIMIT 10`;
    } else {
      // table ou view
      queryText = `SELECT * FROM ${table_name} LIMIT 10`;
    }

    // Executa query por dialeto
    let result;
    let fields = [];
    let preview = [];
    let rowCount = 0;

    if (dialect === 'postgres') {
      result = await client.query(queryText);
      preview = result.rows;
      fields = result.fields.map((f) => ({
        name: f.name,
        type: mapFieldType(f.dataTypeID, 'postgres'),
        aggregable: isAggregable(mapFieldType(f.dataTypeID, 'postgres')),
      }));

      // Conta total de registros (aproximado)
      try {
        const countQuery = source_type === 'query'
          ? `SELECT COUNT(*) as count FROM (${sql_query}) AS subquery`
          : `SELECT COUNT(*) as count FROM ${table_name}`;
        const countResult = await client.query(countQuery);
        rowCount = parseInt(countResult.rows[0]?.count || 0);
      } catch (e) {
        console.warn('[dataset:validate] erro ao contar registros:', e.message);
        rowCount = preview.length;
      }
    } else if (dialect === 'mysql') {
      const [rows, fieldInfo] = await client.query(queryText);
      preview = rows;
      fields = fieldInfo.map((f) => ({
        name: f.name,
        type: mapFieldType(f.type, 'mysql'),
        aggregable: isAggregable(mapFieldType(f.type, 'mysql')),
      }));

      // Conta total
      try {
        const countQuery = source_type === 'query'
          ? `SELECT COUNT(*) as count FROM (${sql_query}) AS subquery`
          : `SELECT COUNT(*) as count FROM ${table_name}`;
        const [countRows] = await client.query(countQuery);
        rowCount = parseInt(countRows[0]?.count || 0);
      } catch (e) {
        console.warn('[dataset:validate] erro ao contar registros:', e.message);
        rowCount = preview.length;
      }
    } else if (dialect === 'mssql') {
      result = await client.request().query(queryText);
      preview = result.recordset;
      
      // MSSQL retorna metadados dos campos de forma diferente
      if (result.recordset.columns) {
        fields = Object.entries(result.recordset.columns).map(([name, col]) => ({
          name: name,
          type: mapFieldType(col.type?.name || col.type, 'mssql'),
          aggregable: isAggregable(mapFieldType(col.type?.name || col.type, 'mssql')),
        }));
      } else {
        // Fallback: detecta pelos valores
        const firstRow = preview[0] || {};
        fields = Object.keys(firstRow).map((name) => {
          const value = firstRow[name];
          const detectedType = typeof value === 'number' ? 'number' : 'string';
          return {
            name,
            type: detectedType,
            aggregable: detectedType === 'number',
          };
        });
      }

      // Conta total
      try {
        const countQuery = source_type === 'query'
          ? `SELECT COUNT(*) as count FROM (${sql_query}) AS subquery`
          : `SELECT COUNT(*) as count FROM ${table_name}`;
        const countResult = await client.request().query(countQuery);
        rowCount = parseInt(countResult.recordset[0]?.count || 0);
      } catch (e) {
        console.warn('[dataset:validate] erro ao contar registros:', e.message);
        rowCount = preview.length;
      }
    } else if (dialect === 'sqlite') {
      const stmt = client.prepare(queryText);
      preview = stmt.all();
      
      // SQLite não fornece tipo diretamente, inferimos dos valores
      if (preview.length > 0) {
        const firstRow = preview[0];
        fields = Object.keys(firstRow).map((name) => {
          const value = firstRow[name];
          let detectedType = 'string';
          if (typeof value === 'number') detectedType = 'number';
          else if (typeof value === 'boolean') detectedType = 'boolean';
          else if (value instanceof Date) detectedType = 'date';
          
          return {
            name,
            type: detectedType,
            aggregable: detectedType === 'number',
          };
        });
      } else {
        // Sem dados, usa PRAGMA table_info
        if (source_type !== 'query' && table_name) {
          const infoStmt = client.prepare(`PRAGMA table_info(${table_name})`);
          const cols = infoStmt.all();
          fields = cols.map((col) => ({
            name: col.name,
            type: mapFieldType(col.type, 'sqlite'),
            aggregable: isAggregable(mapFieldType(col.type, 'sqlite')),
          }));
        }
      }

      // Conta total
      try {
        const countQuery = source_type === 'query'
          ? `SELECT COUNT(*) as count FROM (${sql_query})`
          : `SELECT COUNT(*) as count FROM ${table_name}`;
        const countStmt = client.prepare(countQuery);
        const countResult = countStmt.get();
        rowCount = parseInt(countResult?.count || 0);
      } catch (e) {
        console.warn('[dataset:validate] erro ao contar registros:', e.message);
        rowCount = preview.length;
      }
    } else {
      throw new Error(`Dialeto não suportado para validação: ${dialect}`);
    }

    await close();

    res.json({
      success: true,
      fields,
      preview,
      row_count: rowCount,
      message: `Dataset validado com sucesso! ${fields.length} campos encontrados.`,
    });
  } catch (e) {
    console.error('[dataset:validate] erro:', e);
    res.status(400).json({
      success: false,
      message: e.message || 'Erro ao validar dataset',
      error: e.message,
    });
  }
});

/* Busca dados: POST /api/dataset/fetch */
router.post('/fetch', async (req, res) => {
  try {
    const { connection_id, source_type, table_name, sql_query, limit = 1000 } = req.body || {};

    if (!connection_id) {
      return res.status(400).json({
        success: false,
        error: 'connection_id é obrigatório',
      });
    }

    const conn = await loadConnectionById(connection_id);
    const { dialect, client, close } = await getClient(conn);

    const queryLimit = Math.min(Number(limit) || 1000, 10000); // Máximo 10k registros

    let queryText;
    if (source_type === 'query') {
      queryText = `SELECT * FROM (${sql_query}) AS subquery LIMIT ${queryLimit}`;
    } else {
      queryText = `SELECT * FROM ${table_name} LIMIT ${queryLimit}`;
    }

    let rows = [];

    if (dialect === 'postgres') {
      const result = await client.query(queryText);
      rows = result.rows;
    } else if (dialect === 'mysql') {
      const [mysqlRows] = await client.query(queryText);
      rows = mysqlRows;
    } else if (dialect === 'mssql') {
      const result = await client.request().query(queryText);
      rows = result.recordset;
    } else if (dialect === 'sqlite') {
      const stmt = client.prepare(queryText);
      rows = stmt.all();
    }

    await close();

    res.json({
      success: true,
      rows,
      count: rows.length,
    });
  } catch (e) {
    console.error('[dataset:fetch] erro:', e);
    res.status(400).json({
      success: false,
      error: e.message || 'Erro ao buscar dados',
    });
  }
});

module.exports = router;