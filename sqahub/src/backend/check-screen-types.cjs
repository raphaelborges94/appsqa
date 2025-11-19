const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'sqahub',
  password: 'op90OP()',
  port: 5432,
});

async function checkScreenTypes() {
  const client = await pool.connect();

  try {
    console.log('🔍 Verificando tipos de tela\n');

    const result = await client.query(`
      SELECT
        id,
        nome,
        tabela_nome,
        screen_type,
        campo_nome,
        is_subtable,
        ativa
      FROM screens
      ORDER BY screen_type, nome;
    `);

    console.log('📋 Telas no banco:\n');
    result.rows.forEach(s => {
      console.log(`[${s.screen_type.toUpperCase()}] ${s.nome}`);
      console.log(`   Tabela: ${s.tabela_nome}`);
      console.log(`   ID: ${s.id}`);
      if (s.screen_type === 'tree') {
        console.log(`   Campo Nome: ${s.campo_nome}`);
      }
      console.log('');
    });

    // Resumo
    const summary = await client.query(`
      SELECT
        screen_type,
        COUNT(*) as total
      FROM screens
      GROUP BY screen_type
      ORDER BY screen_type;
    `);

    console.log('📊 Resumo:');
    summary.rows.forEach(s => {
      console.log(`   ${s.screen_type}: ${s.total} tela(s)`);
    });

  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkScreenTypes();
