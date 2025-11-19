const { Pool } = require('pg');

// Credenciais do .env.local
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'sqahub',
  password: 'op90OP()',
  port: 5432,
});

async function fixThreeScreen() {
  const client = await pool.connect();

  try {
    console.log('🔧 Corrigindo metadados da tela "three"...\n');

    // 1. Atualizar metadados
    const updateResult = await client.query(`
      UPDATE screens
      SET
        campo_nome = 'nome',
        campo_pai = 'pai_id',
        campo_codigo = 'codigo',
        permitir_raiz = true,
        nivel_maximo = 10
      WHERE id = '4a182349-8477-4d51-8732-ecfadec73a3e'
      RETURNING *;
    `);

    if (updateResult.rows.length > 0) {
      console.log('✅ Metadados atualizados:');
      const screen = updateResult.rows[0];
      console.log(`   Nome: ${screen.nome}`);
      console.log(`   Tabela: ${screen.tabela_nome}`);
      console.log(`   Campo Nome: ${screen.campo_nome}`);
      console.log(`   Campo Pai: ${screen.campo_pai}`);
      console.log(`   Campo Código: ${screen.campo_codigo}`);
      console.log(`   Permitir Raiz: ${screen.permitir_raiz}`);
      console.log(`   Nível Máximo: ${screen.nivel_maximo}\n`);

      // 2. Verificar se a tabela existe
      const tableCheck = await client.query(`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename = $1;
      `, [screen.tabela_nome]);

      if (tableCheck.rows.length === 0) {
        console.log(`⚠️  Tabela "${screen.tabela_nome}" não existe. Criando...\n`);

        // Criar tabela
        await client.query(`
          CREATE TABLE ${screen.tabela_nome} (
            id SERIAL PRIMARY KEY,
            nome VARCHAR(255) NOT NULL,
            pai_id INTEGER REFERENCES ${screen.tabela_nome}(id) ON DELETE CASCADE,
            codigo VARCHAR(50),
            dhinc TIMESTAMP DEFAULT NOW(),
            dhalter TIMESTAMP DEFAULT NOW()
          );
        `);

        // Criar índices
        await client.query(`
          CREATE INDEX idx_${screen.tabela_nome}_pai_id ON ${screen.tabela_nome}(pai_id);
        `);
        await client.query(`
          CREATE INDEX idx_${screen.tabela_nome}_codigo ON ${screen.tabela_nome}(codigo);
        `);

        console.log(`✅ Tabela "${screen.tabela_nome}" criada com sucesso!\n`);
      } else {
        console.log(`✅ Tabela "${screen.tabela_nome}" já existe.\n`);
      }

      console.log('🎉 Correção concluída! Recarregue o navegador (Ctrl+Shift+R)');
    } else {
      console.log('❌ Tela não encontrada com o ID especificado');
    }

  } catch (err) {
    console.error('❌ Erro:', err.message);
    console.error('Stack:', err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

fixThreeScreen();
