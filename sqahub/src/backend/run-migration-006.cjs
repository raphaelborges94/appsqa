const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'sqahub',
  password: 'op90OP()',
  port: 5432,
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🔄 Executando Migration 006: Add screen_type\n');

    // Ler arquivo SQL
    const sqlPath = path.join(__dirname, 'migrations', '006_add_screen_type.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Executar SQL
    const result = await client.query(sql);

    console.log('✅ Migration executada com sucesso!\n');
    console.log('📊 Resultado:');

    // Mostrar resultado (última query do SQL)
    if (result && result.rows) {
      console.table(result.rows);
    }

  } catch (err) {
    console.error('❌ Erro ao executar migration:', err.message);
    console.error('Stack:', err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
