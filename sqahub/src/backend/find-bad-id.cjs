const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'sqahub',
  password: 'op90OP()',
  port: 5432,
});

async function findBadId() {
  const client = await pool.connect();

  try {
    console.log('🔍 Procurando ID problemático: 6914d466e7fd5cb9e8951dae\n');

    // Buscar em todas as tabelas possíveis
    const tables = ['screens', 'fields', 'buttons', 'menu_configs', 'branding'];

    for (const table of tables) {
      try {
        const result = await client.query(`
          SELECT * FROM ${table}
          WHERE id::text LIKE '%6914d466e7fd5cb9e8951dae%'
             OR id::text = '6914d466e7fd5cb9e8951dae';
        `);

        if (result.rows.length > 0) {
          console.log(`✅ Encontrado na tabela "${table}":`);
          console.log(result.rows);
          console.log('\n');
        }
      } catch (err) {
        // Tabela pode não existir
      }
    }

    // Verificar se há algum registro com screen_id ou parent_screen_id com esse valor
    const fieldsCheck = await client.query(`
      SELECT f.*, s.nome as screen_nome
      FROM fields f
      LEFT JOIN screens s ON s.id = f.screen_id
      WHERE f.screen_id::text LIKE '%6914d466%'
         OR f.fk_screen_id::text LIKE '%6914d466%';
    `);

    if (fieldsCheck.rows.length > 0) {
      console.log('📋 Fields com referência ao ID:');
      console.log(fieldsCheck.rows);
      console.log('\n');
    }

    // Verificar menu_configs
    const menuCheck = await client.query(`
      SELECT * FROM menu_configs;
    `);

    console.log('📜 Menu configs:');
    menuCheck.rows.forEach(menu => {
      console.log(`\nMenu ID: ${menu.id}`);
      console.log(`Is Active: ${menu.is_active}`);
      if (menu.menu_structure) {
        console.log('Menu Structure:');
        JSON.stringify(menu.menu_structure, null, 2)
          .split('\n')
          .forEach(line => {
            if (line.includes('6914d466')) {
              console.log('⚠️  ENCONTRADO:', line);
            }
          });
      }
    });

  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

findBadId();
