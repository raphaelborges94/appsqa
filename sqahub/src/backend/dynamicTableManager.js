import { query } from './db.js';

/**
 * Converte tipo do campo para tipo SQL
 */
async function fieldTypeToSQL(field) {
  const typeMap = {
    'uuid': 'UUID',
    'inteiro': 'INTEGER',
    'texto': field.tamanho_maximo ? `VARCHAR(${field.tamanho_maximo})` : 'TEXT',
    'decimal': 'DECIMAL(15, 2)',
    'data': 'DATE',
    'datetime': 'TIMESTAMP',
    'hora': 'TIME',
    'checkbox': 'BOOLEAN',
    'texto_longo': 'TEXT',
    'imagem': 'TEXT', // URL da imagem
    'anexo': 'TEXT', // URL do arquivo
  };

  // Para FK, buscar o tipo do ID da tabela referenciada
  if (field.tipo === 'fk' && field.fk_tabela_nome) {
    try {
      const result = await query(
        `SELECT data_type
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = $1
           AND column_name = 'id'`,
        [field.fk_tabela_nome]
      );

      if (result.rows.length > 0) {
        const idType = result.rows[0].data_type;
        // Mapear tipo PostgreSQL para tipo SQL
        if (idType === 'integer') return 'INTEGER';
        if (idType === 'uuid') return 'UUID';
        if (idType === 'bigint') return 'BIGINT';
      }
    } catch (error) {
      console.warn(`Não foi possível detectar tipo de ID da tabela ${field.fk_tabela_nome}, usando UUID como padrão`);
    }
    // Padrão UUID se não conseguir detectar
    return 'UUID';
  }

  return typeMap[field.tipo] || 'TEXT';
}

/**
 * Gera SQL para criar tabela
 */
export async function generateCreateTableSQL(tableName, fields) {
  const columns = [];

  // Adicionar campos do schema
  for (const field of fields) {
    let sqlType = await fieldTypeToSQL(field);
    const constraints = [];

    if (field.nome_campo === 'id') {
      // Se o tipo for inteiro, usar SERIAL (auto-increment)
      // Se for UUID ou outro tipo, usar UUID
      if (field.tipo === 'inteiro') {
        sqlType = 'SERIAL';
        constraints.push('PRIMARY KEY');
      } else {
        // Usar gen_random_uuid() que é nativo do PostgreSQL 13+
        sqlType = 'UUID';
        constraints.push('PRIMARY KEY DEFAULT gen_random_uuid()');
      }
    } else {
      if (field.obrigatorio) {
        constraints.push('NOT NULL');
      }

      if (field.unico) {
        constraints.push('UNIQUE');
      }

      if (field.valor_padrao) {
        if (field.tipo === 'checkbox') {
          constraints.push(`DEFAULT ${field.valor_padrao}`);
        } else if (field.tipo === 'datetime' && field.valor_padrao === 'NOW()') {
          constraints.push('DEFAULT NOW()');
        } else if (field.tipo === 'texto' || field.tipo === 'texto_longo') {
          constraints.push(`DEFAULT '${field.valor_padrao.replace(/'/g, "''")}'`);
        } else {
          constraints.push(`DEFAULT ${field.valor_padrao}`);
        }
      }

      // Foreign Key
      if (field.tipo === 'fk' && field.fk_screen_id && field.fk_tabela_nome) {
        // A constraint FK será adicionada depois
        constraints.push(`REFERENCES ${field.fk_tabela_nome}(id) ON DELETE SET NULL`);
      }
    }

    const columnDef = `${field.nome_campo} ${sqlType} ${constraints.join(' ')}`.trim();
    columns.push(columnDef);
  }

  // Não adicionar campos de auditoria automaticamente
  // Eles devem vir do schema de fields

  // Verificar se tem campos de auditoria para criar índices/triggers
  const hasCreatedAt = fields.find(f => f.nome_campo === 'created_at');
  const hasUpdatedAt = fields.find(f => f.nome_campo === 'updated_at');

  let sql = `
CREATE TABLE IF NOT EXISTS ${tableName} (
  ${columns.join(',\n  ')}
);`.trim();

  // Adicionar índices apenas se os campos existirem
  if (hasCreatedAt) {
    sql += `\n\nCREATE INDEX IF NOT EXISTS idx_${tableName}_created_at ON ${tableName}(created_at DESC);`;
  }
  if (hasUpdatedAt) {
    sql += `\n\nCREATE INDEX IF NOT EXISTS idx_${tableName}_updated_at ON ${tableName}(updated_at DESC);`;
  }

  // Adicionar trigger apenas se updated_at existir
  if (hasUpdatedAt) {
    sql += `\n\nCREATE TRIGGER ${tableName}_updated_at
  BEFORE UPDATE ON ${tableName}
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();`;
  }

  return sql;
}

/**
 * Gera SQL para adicionar coluna
 */
export async function generateAddColumnSQL(tableName, field) {
  const sqlType = await fieldTypeToSQL(field);
  const constraints = [];

  if (field.obrigatorio) {
    // Para colunas NOT NULL, primeiro adicionar sem constraint, depois atualizar
    return [
      `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${field.nome_campo} ${sqlType};`,
      field.valor_padrao
        ? `UPDATE ${tableName} SET ${field.nome_campo} = ${field.valor_padrao} WHERE ${field.nome_campo} IS NULL;`
        : null,
      `ALTER TABLE ${tableName} ALTER COLUMN ${field.nome_campo} SET NOT NULL;`,
    ].filter(Boolean);
  }

  if (field.unico) {
    constraints.push('UNIQUE');
  }

  if (field.valor_padrao) {
    if (field.tipo === 'checkbox') {
      constraints.push(`DEFAULT ${field.valor_padrao}`);
    } else if (field.tipo === 'datetime' && field.valor_padrao === 'NOW()') {
      constraints.push('DEFAULT NOW()');
    } else if (field.tipo === 'texto' || field.tipo === 'texto_longo') {
      constraints.push(`DEFAULT '${field.valor_padrao.replace(/'/g, "''")}'`);
    } else {
      constraints.push(`DEFAULT ${field.valor_padrao}`);
    }
  }

  const sql = `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${field.nome_campo} ${sqlType} ${constraints.join(' ')};`;
  return [sql];
}

/**
 * Gera SQL para remover coluna
 */
export function generateDropColumnSQL(tableName, fieldName) {
  return [`ALTER TABLE ${tableName} DROP COLUMN IF EXISTS ${fieldName};`];
}

/**
 * Gera SQL para modificar coluna
 */
export async function generateAlterColumnSQL(tableName, field) {
  const sqlType = await fieldTypeToSQL(field);
  const sqls = [];

  // Alterar tipo
  sqls.push(`ALTER TABLE ${tableName} ALTER COLUMN ${field.nome_campo} TYPE ${sqlType};`);

  // Alterar NOT NULL
  if (field.obrigatorio) {
    sqls.push(`ALTER TABLE ${tableName} ALTER COLUMN ${field.nome_campo} SET NOT NULL;`);
  } else {
    sqls.push(`ALTER TABLE ${tableName} ALTER COLUMN ${field.nome_campo} DROP NOT NULL;`);
  }

  // Alterar DEFAULT
  if (field.valor_padrao) {
    let defaultValue = field.valor_padrao;
    if (field.tipo === 'datetime' && defaultValue === 'NOW()') {
      defaultValue = 'NOW()';
    } else if (field.tipo === 'texto' || field.tipo === 'texto_longo') {
      defaultValue = `'${defaultValue.replace(/'/g, "''")}'`;
    }
    sqls.push(`ALTER TABLE ${tableName} ALTER COLUMN ${field.nome_campo} SET DEFAULT ${defaultValue};`);
  } else {
    sqls.push(`ALTER TABLE ${tableName} ALTER COLUMN ${field.nome_campo} DROP DEFAULT;`);
  }

  return sqls;
}

/**
 * Cria tabela física no banco
 */
export async function createPhysicalTable(tableName, fields) {
  try {
    const sql = await generateCreateTableSQL(tableName, fields);
    console.log(`📊 Criando tabela: ${tableName}`);
    console.log(sql);

    await query(sql);

    console.log(`✅ Tabela ${tableName} criada com sucesso`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Erro ao criar tabela ${tableName}:`, error);
    throw error;
  }
}

/**
 * Adiciona coluna à tabela física
 */
export async function addColumnToTable(tableName, field) {
  try {
    const sqls = await generateAddColumnSQL(tableName, field);
    console.log(`➕ Adicionando coluna ${field.nome_campo} à tabela ${tableName}`);

    for (const sql of sqls) {
      console.log(sql);
      await query(sql);
    }

    console.log(`✅ Coluna ${field.nome_campo} adicionada com sucesso`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Erro ao adicionar coluna ${field.nome_campo}:`, error);
    throw error;
  }
}

/**
 * Remove coluna da tabela física
 */
export async function dropColumnFromTable(tableName, fieldName) {
  try {
    const sqls = generateDropColumnSQL(tableName, fieldName);
    console.log(`➖ Removendo coluna ${fieldName} da tabela ${tableName}`);

    for (const sql of sqls) {
      console.log(sql);
      await query(sql);
    }

    console.log(`✅ Coluna ${fieldName} removida com sucesso`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Erro ao remover coluna ${fieldName}:`, error);
    throw error;
  }
}

/**
 * Verifica se tabela existe
 */
export async function tableExists(tableName) {
  try {
    const result = await query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = $1
      )`,
      [tableName]
    );
    return result.rows[0].exists;
  } catch (error) {
    console.error(`Erro ao verificar existência da tabela ${tableName}:`, error);
    return false;
  }
}

/**
 * Deleta tabela física
 */
export async function dropPhysicalTable(tableName) {
  try {
    console.log(`🗑️ Deletando tabela: ${tableName}`);
    await query(`DROP TABLE IF EXISTS ${tableName} CASCADE;`);
    console.log(`✅ Tabela ${tableName} deletada com sucesso`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Erro ao deletar tabela ${tableName}:`, error);
    throw error;
  }
}

/**
 * Sincroniza tabela física com fields atuais
 */
export async function syncPhysicalTable(tableName, fields) {
  try {
    console.log(`🔍 Verificando existência da tabela ${tableName}...`);
    const exists = await tableExists(tableName);

    if (!exists) {
      // Criar tabela nova
      console.log(`📋 Tabela ${tableName} não existe, criando com ${fields.length} campos...`);
      return await createPhysicalTable(tableName, fields);
    }

    console.log(`📋 Tabela ${tableName} já existe, sincronizando colunas...`);

    // Tabela já existe - verificar colunas
    const result = await query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1`,
      [tableName]
    );

    const existingColumns = result.rows.map(r => r.column_name);
    const fieldColumns = fields.map(f => f.nome_campo);

    console.log(`📊 Colunas existentes:`, existingColumns);
    console.log(`📊 Campos do schema:`, fieldColumns);

    // Adicionar colunas faltantes
    for (const field of fields) {
      if (!existingColumns.includes(field.nome_campo)) {
        console.log(`➕ Adicionando coluna faltante: ${field.nome_campo}`);
        await addColumnToTable(tableName, field);
      }
    }

    // Remover colunas extras (não remover colunas de sistema)
    const systemColumns = ['created_at', 'updated_at', 'created_by', 'updated_by'];
    for (const col of existingColumns) {
      if (!fieldColumns.includes(col) && !systemColumns.includes(col)) {
        console.log(`➖ Removendo coluna extra: ${col}`);
        await dropColumnFromTable(tableName, col);
      }
    }

    console.log(`✅ Tabela ${tableName} sincronizada com sucesso`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Erro ao sincronizar tabela ${tableName}:`, error);
    console.error(`Stack trace:`, error.stack);
    throw error;
  }
}
