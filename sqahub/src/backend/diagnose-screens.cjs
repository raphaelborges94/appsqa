const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'sqahub',
  password: 'op90OP()',
  port: 5432,
});

async function diagnoseScreens() {
  const client = await pool.connect();

  try {
    console.log('🔍 Diagnóstico de Telas\n');

    // 1. Buscar TODAS as telas
    const allScreens = await client.query(`
      SELECT
        id,
        nome,
        tabela_nome,
        campo_nome,
        campo_pai,
        campo_codigo,
        is_subtable,
        ativa
      FROM screens
      WHERE ativa = true
      ORDER BY nome;
    `);

    console.log(`📋 Total de telas ativas: ${allScreens.rows.length}\n`);

    // 2. Separar por tipo
    const crudScreens = allScreens.rows.filter(s => !s.campo_nome && !s.is_subtable);
    const treeScreens = allScreens.rows.filter(s => s.campo_nome && !s.is_subtable);
    const subtables = allScreens.rows.filter(s => s.is_subtable);

    console.log('🗂️  TELAS CRUD (sem campo_nome):');
    crudScreens.forEach(s => {
      console.log(`   - ${s.nome} (${s.tabela_nome}) [ID: ${s.id.substring(0, 8)}...]`);
    });

    console.log('\n🌳 TELAS DE ÁRVORE (com campo_nome):');
    treeScreens.forEach(s => {
      console.log(`   - ${s.nome} (${s.tabela_nome})`);
      console.log(`     campo_nome: ${s.campo_nome}`);
      console.log(`     campo_pai: ${s.campo_pai}`);
      console.log(`     campo_codigo: ${s.campo_codigo}`);
      console.log(`     ID: ${s.id}\n`);
    });

    console.log(`📊 SUBTELAS: ${subtables.length}`);
    subtables.forEach(s => {
      console.log(`   - ${s.nome} (${s.tabela_nome})`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Resumo:');
    console.log(`   CRUD: ${crudScreens.length} telas`);
    console.log(`   Árvore: ${treeScreens.length} telas`);
    console.log(`   Subtelas: ${subtables.length} telas`);

    if (treeScreens.length === 0) {
      console.log('\n⚠️  PROBLEMA: Nenhuma tela de árvore encontrada!');
      console.log('   Verifique se as telas têm campo_nome preenchido.');
    }

  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

diagnoseScreens();
