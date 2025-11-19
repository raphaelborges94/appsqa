#!/usr/bin/env node
/**
 * Script para executar a migration de criação da tabela bi_sessions
 *
 * Uso:
 *   node server/migrations/run-bi-sessions-migration.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Carregar .env.local
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });

// Configuração do PostgreSQL
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || 'sqahub',
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🔄 Conectado ao PostgreSQL');
    console.log(`📦 Database: ${process.env.PGDATABASE}`);

    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, '001_create_bi_sessions_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🚀 Executando migration: 001_create_bi_sessions_table.sql');

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    console.log('✅ Migration executada com sucesso!');

    // Verificar se a tabela foi criada
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'bi_sessions'
      ORDER BY ordinal_position;
    `);

    console.log('\n📊 Estrutura da tabela bi_sessions:');
    console.table(result.rows);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao executar migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('\n✨ Migration concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Falha na migration:', error);
    process.exit(1);
  });
