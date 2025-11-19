const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'sqahub',
  password: 'op90OP()',
  port: 5432,
});

async function fixMeudeusScreens() {
  const client = await pool.connect();

  try {
    console.log('🔧 Corrigindo telas "meudeus"\n');

    // Atualizar todas as telas "meudeus" para screen_type = 'tree'
    const result = await client.query(`
      UPDATE screens
      SET screen_type = 'tree'
      WHERE nome = 'meudeus'
        AND screen_type != 'tree'
      RETURNING id, nome, tabela_nome, screen_type, campo_nome;
    `);

    if (result.rows.length > 0) {
      console.log(`✅ ${result.rows.length} tela(s) corrigida(s):\n`);
      result.rows.forEach(s => {
        console.log(`   - ${s.nome} (${s.tabela_nome})`);
        console.log(`     ID: ${s.id}`);
        console.log(`     Novo screen_type: ${s.screen_type}`);
        console.log(`     campo_nome: ${s.campo_nome || 'NULL'}\n`);
      });
    } else {
      console.log('⚠️  Nenhuma tela "meudeus" encontrada para corrigir.');
    }

    // Verificar estado final
    const verify = await client.query(`
      SELECT id, nome, screen_type, campo_nome
      FROM screens
      WHERE nome = 'meudeus'
      ORDER BY id;
    `);

    console.log('📋 Estado final das telas "meudeus":');
    verify.rows.forEach(s => {
      console.log(`   [${s.screen_type.toUpperCase()}] ${s.nome} - campo_nome: ${s.campo_nome || 'NULL'}`);
    });

  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixMeudeusScreens();
