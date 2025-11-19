const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'sqahub',
  password: 'op90OP()',
  port: 5432,
});

async function checkAllScreens() {
  const client = await pool.connect();

  try {
    console.log('🔍 Verificando TODAS as telas no banco\n');

    const result = await client.query(`
      SELECT
        id,
        nome,
        tabela_nome,
        screen_type,
        campo_nome,
        campo_pai,
        campo_codigo,
        is_subtable,
        ativa
      FROM screens
      ORDER BY nome;
    `);

    console.log(`📋 Total de telas: ${result.rows.length}\n`);

    result.rows.forEach((s, idx) => {
      console.log(`${idx + 1}. [${s.screen_type?.toUpperCase() || 'NULL'}] ${s.nome}`);
      console.log(`   Tabela: ${s.tabela_nome}`);
      console.log(`   ID: ${s.id}`);
      console.log(`   Ativa: ${s.ativa}`);
      if (s.screen_type === 'tree') {
        console.log(`   Campo Nome: ${s.campo_nome || 'NULL'}`);
        console.log(`   Campo Pai: ${s.campo_pai || 'NULL'}`);
        console.log(`   Campo Código: ${s.campo_codigo || 'NULL'}`);
      }
      console.log('');
    });

    // Resumo por tipo
    const summary = await client.query(`
      SELECT
        COALESCE(screen_type, 'NULL') as tipo,
        COUNT(*) as total,
        COUNT(CASE WHEN ativa THEN 1 END) as ativas
      FROM screens
      GROUP BY screen_type
      ORDER BY screen_type;
    `);

    console.log('📊 Resumo por tipo:');
    summary.rows.forEach(s => {
      console.log(`   ${s.tipo}: ${s.total} total (${s.ativas} ativas)`);
    });

  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkAllScreens();
