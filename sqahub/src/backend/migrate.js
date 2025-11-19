import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigrations = async () => {
  try {
    console.log('🔄 Iniciando migrations...');

    // Criar tabela de controle de migrations se não existir
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ler arquivos de migration
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`📂 Encontradas ${files.length} migrations`);

    for (const file of files) {
      // Verificar se migration já foi executada
      const result = await pool.query(
        'SELECT id FROM migrations WHERE name = $1',
        [file]
      );

      if (result.rows.length > 0) {
        console.log(`⏭️  Migration ${file} já executada`);
        continue;
      }

      console.log(`▶️  Executando migration: ${file}`);

      // Ler e executar SQL
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await pool.query(sql);

      // Registrar migration como executada
      await pool.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [file]
      );

      console.log(`✅ Migration ${file} executada com sucesso`);
    }

    console.log('✨ Todas as migrations foram executadas!');
  } catch (error) {
    console.error('❌ Erro ao executar migrations:', error);
    throw error;
  } finally {
    await pool.end();
  }
};

runMigrations();
