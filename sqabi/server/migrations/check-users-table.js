#!/usr/bin/env node
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

async function checkTable() {
  const client = new Client({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || 'arcway',
  });

  try {
    await client.connect();

    // Verificar se a tabela users existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'users'
      );
    `);

    console.log('Tabela users existe?', tableCheck.rows[0].exists);

    if (tableCheck.rows[0].exists) {
      // Listar colunas
      const columns = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `);

      console.log('\nColunas existentes:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    }

  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await client.end();
  }
}

checkTable();
