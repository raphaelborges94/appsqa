const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'sqahub',
  password: 'op90OP()',
  port: 5432,
});

async function findUsersScreen() {
  const client = await pool.connect();

  try {
    console.log('🔍 Procurando tela de usuários...\n');

    // Buscar tela que pareça ser de usuários
    const result = await client.query(`
      SELECT id, nome, tabela_nome
      FROM screens
      WHERE nome ILIKE '%user%'
         OR nome ILIKE '%usuário%'
         OR nome ILIKE '%usuario%'
         OR tabela_nome ILIKE '%user%'
         OR tabela_nome ILIKE '%usuario%';
    `);

    if (result.rows.length > 0) {
      console.log('✅ Telas encontradas:');
      result.rows.forEach(s => {
        console.log(`   - ${s.nome} (${s.tabela_nome})`);
        console.log(`     ID: ${s.id}\n`);
      });
    } else {
      console.log('⚠️  Nenhuma tela de usuários encontrada.');
      console.log('\n📋 Todas as telas disponíveis:');

      const allScreens = await client.query(`
        SELECT id, nome, tabela_nome
        FROM screens
        ORDER BY nome;
      `);

      allScreens.rows.forEach(s => {
        console.log(`   - ${s.nome} (${s.tabela_nome})`);
        console.log(`     ID: ${s.id}\n`);
      });
    }

  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

findUsersScreen();
