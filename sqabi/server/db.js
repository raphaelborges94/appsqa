/**
 * Database Connection Module for BI
 * Conexão PostgreSQL compartilhada com o Hub (database: sqahub)
 *
 * @module server/db
 */

'use strict';

const { Pool } = require('pg');

// Configuração da pool de conexões PostgreSQL
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || 'sqahub',
  max: 20, // Máximo de conexões simultâneas
  idleTimeoutMillis: 30000, // Tempo de inatividade antes de fechar conexão
  connectionTimeoutMillis: 2000, // Timeout para obter conexão da pool
});

// Log de conexão bem-sucedida
pool.on('connect', () => {
  console.log('[db] Nova conexão PostgreSQL estabelecida');
});

// Log de erros
pool.on('error', (err) => {
  console.error('[db] Erro inesperado no pool PostgreSQL:', err);
});

/**
 * Executa uma query SQL
 *
 * @param {string} text - SQL query
 * @param {Array} params - Parâmetros da query
 * @returns {Promise<Object>} Resultado da query
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    if (process.env.LOG_LEVEL === 'debug') {
      console.log('[db:query]', { text, duration, rows: res.rowCount });
    }

    return res;
  } catch (error) {
    console.error('[db:query] Erro:', { text, error: error.message });
    throw error;
  }
}

/**
 * Obtém um client da pool para transações
 *
 * @returns {Promise<Object>} Client do pg
 */
async function getClient() {
  return await pool.connect();
}

/**
 * Testa a conexão com o banco
 *
 * @returns {Promise<boolean>} True se conectado, false caso contrário
 */
async function testConnection() {
  try {
    const result = await query('SELECT NOW() as now, current_database() as db');
    console.log('[db] Conexão OK:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('[db] Falha na conexão:', error.message);
    return false;
  }
}

/**
 * Encerra a pool de conexões (usado ao desligar o servidor)
 *
 * @returns {Promise<void>}
 */
async function shutdown() {
  console.log('[db] Encerrando pool de conexões...');
  await pool.end();
  console.log('[db] Pool encerrada');
}

// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = {
  query,
  getClient,
  pool,
  testConnection,
  shutdown,
};
