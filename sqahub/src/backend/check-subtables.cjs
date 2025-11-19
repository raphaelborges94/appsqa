const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'sqahub',
  password: 'op90OP()',
  port: 5432,
});

async function checkSubtables() {
  const client = await pool.connect();

  try {
    console.log('🔍 Verificando subtelas (abas)\n');

    // Buscar a tela vamoveaba
    const vamoveaba = await client.query(`
      SELECT *
      FROM screens
      WHERE nome ILIKE '%vamove%' OR tabela_nome ILIKE '%vamove%';
    `);

    if (vamoveaba.rows.length > 0) {
      console.log('✅ Tela "vamoveaba" encontrada:\n');
      vamoveaba.rows.forEach(s => {
        console.log(`   Nome: ${s.nome}`);
        console.log(`   Tabela: ${s.tabela_nome}`);
        console.log(`   ID: ${s.id}`);
        console.log(`   screen_type: ${s.screen_type}`);
        console.log(`   is_subtable: ${s.is_subtable}`);
        console.log(`   parent_screen_id: ${s.parent_screen_id}`);
        console.log(`   ordem_aba: ${s.ordem_aba}`);
        console.log(`   Ativa: ${s.ativa}\n`);
      });
    } else {
      console.log('❌ Tela "vamoveaba" NÃO encontrada no banco!\n');
    }

    // Buscar TODAS as subtelas
    const allSubtables = await client.query(`
      SELECT
        s.id,
        s.nome,
        s.tabela_nome,
        s.screen_type,
        s.is_subtable,
        s.parent_screen_id,
        s.ordem_aba,
        s.ativa,
        p.nome as parent_nome
      FROM screens s
      LEFT JOIN screens p ON p.id = s.parent_screen_id
      WHERE s.is_subtable = true
      ORDER BY s.parent_screen_id, s.ordem_aba;
    `);

    console.log(`📋 Total de subtelas no banco: ${allSubtables.rows.length}\n`);

    if (allSubtables.rows.length > 0) {
      allSubtables.rows.forEach(s => {
        console.log(`   [${s.screen_type?.toUpperCase() || 'NULL'}] ${s.nome}`);
        console.log(`     Pai: ${s.parent_nome || 'NULL'} (${s.parent_screen_id || 'NULL'})`);
        console.log(`     Ordem: ${s.ordem_aba}`);
        console.log(`     Ativa: ${s.ativa}\n`);
      });
    }

    // Buscar tela pai (45a4d500-7557-48d6-87d0-51194da08b4c)
    const parentScreen = await client.query(`
      SELECT id, nome, tabela_nome
      FROM screens
      WHERE id = '45a4d500-7557-48d6-87d0-51194da08b4c';
    `);

    if (parentScreen.rows.length > 0) {
      console.log('🔍 Tela pai encontrada:');
      console.log(`   Nome: ${parentScreen.rows[0].nome}`);
      console.log(`   ID: ${parentScreen.rows[0].id}\n`);

      // Buscar filhas dessa tela
      const children = await client.query(`
        SELECT id, nome, tabela_nome, ordem_aba, ativa
        FROM screens
        WHERE parent_screen_id = '45a4d500-7557-48d6-87d0-51194da08b4c'
        ORDER BY ordem_aba;
      `);

      if (children.rows.length > 0) {
        console.log(`   ✅ ${children.rows.length} aba(s) vinculada(s):`);
        children.rows.forEach(c => {
          console.log(`      - ${c.nome} (ordem: ${c.ordem_aba}, ativa: ${c.ativa})`);
        });
      } else {
        console.log('   ⚠️  Nenhuma aba vinculada a esta tela.');
      }
    }

  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSubtables();
