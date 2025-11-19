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
    console.log('🔄 Executando Migration 007: Enhance users table\n');

    const sqlPath = path.join(__dirname, 'migrations', '007_enhance_users_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);

    console.log('✅ Migration executada com sucesso!\n');

    // Verificar resultado
    const result = await client.query(`
      SELECT
        id,
        email,
        name,
        role,
        active,
        created_at
      FROM users
      ORDER BY created_at DESC;
    `);

    console.log('📊 Usuários no sistema:\n');
    result.rows.forEach(u => {
      console.log(`   [${u.role.toUpperCase()}] ${u.email}`);
      console.log(`   Nome: ${u.name}`);
      console.log(`   Ativo: ${u.active ? 'Sim' : 'Não'}`);
      console.log(`   ID: ${u.id}\n`);
    });

  } catch (err) {
    console.error('❌ Erro ao executar migration:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
