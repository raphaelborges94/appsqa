const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'sqahub',
  password: 'op90OP()',
  port: 5432,
});

async function checkUsersTable() {
  const client = await pool.connect();

  try {
    console.log('🔍 Verificando tabela de usuários\n');

    // Verificar se existe tabela users
    const tableCheck = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename = 'users';
    `);

    if (tableCheck.rows.length > 0) {
      console.log('✅ Tabela "users" existe\n');

      // Mostrar estrutura
      const structure = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position;
      `);

      console.log('📋 Estrutura da tabela users:');
      structure.rows.forEach(col => {
        console.log(`   ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
      });

      // Contar usuários
      const count = await client.query('SELECT COUNT(*) FROM users');
      console.log(`\n👥 Total de usuários: ${count.rows[0].count}\n`);

      // Mostrar alguns usuários
      const users = await client.query('SELECT id, email, name, active FROM users LIMIT 5');
      if (users.rows.length > 0) {
        console.log('Usuários cadastrados:');
        users.rows.forEach(u => {
          console.log(`   - ${u.email} (${u.name}) - ${u.active ? 'Ativo' : 'Inativo'}`);
        });
      }
    } else {
      console.log('❌ Tabela "users" NÃO existe\n');
      console.log('📝 Será necessário criar a tabela users');
    }

  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkUsersTable();
