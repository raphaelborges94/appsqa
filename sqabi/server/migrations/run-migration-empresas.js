#!/usr/bin/env node
/* server/migrations/run-migration-empresas.js */
'use strict';

/**
 * Script para executar migração da tabela empresas
 * Uso: node server/migrations/run-migration-empresas.js
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
const envPath = path.resolve(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`✓ Variáveis carregadas de: ${envPath}`);
} else {
  console.warn('⚠ Arquivo .env.local não encontrado, usando variáveis do sistema');
}

async function runMigration() {
  const client = new Client({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || 'arcway',
  });

  try {
    console.log('\n📦 Conectando ao banco de dados...');
    console.log(`   Host: ${client.host}:${client.port}`);
    console.log(`   Database: ${client.database}`);
    console.log(`   User: ${client.user}`);

    await client.connect();
    console.log('✓ Conectado com sucesso!\n');

    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, '002_create_empresas_table.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Arquivo de migração não encontrado: ${sqlPath}`);
    }

    console.log(`📄 Executando migração: 002_create_empresas_table.sql`);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Executar SQL
    await client.query(sql);

    console.log('\n✅ Migração executada com sucesso!');

    // Verificar se a tabela foi criada
    const checkTable = await client.query(`
      SELECT
        table_name,
        (SELECT COUNT(*) FROM empresas) as record_count
      FROM information_schema.tables
      WHERE table_name = 'empresas'
    `);

    if (checkTable.rows.length > 0) {
      console.log(`\n📊 Status da tabela 'empresas':`);
      console.log(`   ✓ Tabela criada`);
      console.log(`   ✓ Registros: ${checkTable.rows[0].record_count}`);
    }

    // Listar colunas da tabela
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'empresas'
      ORDER BY ordinal_position
    `);

    console.log(`\n📋 Estrutura da tabela (${columns.rows.length} colunas):`);
    columns.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default.substring(0, 30)}` : '';
      console.log(`   • ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${nullable}${defaultVal}`);
    });

  } catch (error) {
    console.error('\n❌ Erro ao executar migração:');
    console.error(error.message);
    if (error.detail) console.error('Detalhes:', error.detail);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✓ Conexão fechada.\n');
  }
}

// Executar migração
runMigration().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
