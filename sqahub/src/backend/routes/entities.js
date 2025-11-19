import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../auth.js';
import { tableExists } from '../dynamicTableManager.js';

const router = express.Router();

/**
 * GET /api/entities/:tableName
 * Listar todos os registros de uma entidade
 */
router.get('/:tableName', authMiddleware, async (req, res) => {
  try {
    // Converter para minúsculas pois PostgreSQL armazena nomes de tabelas em lowercase
    const tableName = req.params.tableName.toLowerCase();
    const { sort, filter, limit = 100, offset = 0 } = req.query;

    console.log('📋 GET /api/entities/' + tableName, { sort, filter, limit, offset });

    // Verificar se tabela física existe
    const physicalTableExists = await tableExists(tableName);

    if (!physicalTableExists) {
      console.log('❌ Tabela não existe:', tableName);
      return res.status(404).json({ error: 'Table not found: ' + tableName });
    }

    console.log('✅ Tabela existe:', tableName);

    // Construir query
    let queryText = `SELECT * FROM ${tableName}`;
    const queryParams = [];
    let paramIndex = 1;

    // Filtros
    if (filter) {
      try {
        const filterObj = JSON.parse(filter);
        const filterConditions = [];
        Object.entries(filterObj).forEach(([key, value]) => {
          filterConditions.push(`${key} = $${paramIndex}`);
          queryParams.push(value);
          paramIndex++;
        });
        if (filterConditions.length > 0) {
          queryText += ` WHERE ${filterConditions.join(' AND ')}`;
        }
      } catch (e) {
        console.error('Invalid filter JSON:', e);
      }
    }

    // Ordenação - verificar dinamicamente quais colunas existem
    if (sort) {
      const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
      const sortDir = sort.startsWith('-') ? 'DESC' : 'ASC';
      queryText += ` ORDER BY ${sortField} ${sortDir}`;
    } else {
      // Tentar ordenar por campos comuns de timestamp, ou id como fallback
      // Usamos SQL dinâmico seguro para evitar erro se a coluna não existir
      queryText += ` ORDER BY id DESC`;
    }

    // Paginação
    queryText += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(parseInt(limit), parseInt(offset));

    console.log('🔧 SQL:', queryText);
    console.log('🔧 Params:', queryParams);

    const result = await query(queryText, queryParams);

    console.log('✅ Registros encontrados:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error listing entities:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      detail: error.detail || error.hint
    });
  }
});

/**
 * GET /api/entities/:tableName/:id
 * Obter um registro específico
 */
router.get('/:tableName/:id', authMiddleware, async (req, res) => {
  try {
    const tableName = req.params.tableName.toLowerCase();
    const { id } = req.params;

    const result = await query(
      `SELECT * FROM ${tableName} WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting entity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/entities/:tableName
 * Criar novo registro
 */
router.post('/:tableName', authMiddleware, async (req, res) => {
  try {
    const tableName = req.params.tableName.toLowerCase();
    const data = req.body;

    console.log('📝 POST /api/entities/' + tableName, data);

    // Verificar se tabela física existe
    const physicalTableExists = await tableExists(tableName);
    if (!physicalTableExists) {
      return res.status(404).json({ error: 'Table not found: ' + tableName });
    }

    // Buscar colunas da tabela para saber quais campos aceitar
    const columnsResult = await query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = $1 AND table_schema = 'public'`,
      [tableName]
    );
    const existingColumns = new Set(columnsResult.rows.map(r => r.column_name));

    // Remover campos de sistema que são auto-gerados ou não existem
    const {
      id,
      dhinc,
      dhalter,
      created_at,
      updated_at,
      created_by,
      updated_by,
      ...cleanData
    } = data;

    // Filtrar apenas campos que existem na tabela
    const filteredData = {};
    Object.entries(cleanData).forEach(([key, value]) => {
      if (existingColumns.has(key)) {
        filteredData[key] = value;
      }
    });

    console.log('✅ Campos filtrados:', Object.keys(filteredData));

    // Se não há dados para inserir, erro
    if (Object.keys(filteredData).length === 0) {
      return res.status(400).json({
        error: 'No valid fields to insert',
        receivedFields: Object.keys(data),
        tableColumns: Array.from(existingColumns)
      });
    }

    // Construir query INSERT
    const columns = Object.keys(filteredData);
    const values = Object.values(filteredData);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    const insertSQL = `INSERT INTO ${tableName} (${columns.join(', ')})
       VALUES (${placeholders})
       RETURNING *`;

    console.log('🔧 SQL:', insertSQL);
    console.log('🔧 Values:', values);

    const result = await query(insertSQL, values);

    console.log('✅ Registro criado:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error creating entity:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      detail: error.detail || error.hint
    });
  }
});

/**
 * PUT /api/entities/:tableName/:id
 * Atualizar registro
 */
router.put('/:tableName/:id', authMiddleware, async (req, res) => {
  try {
    const tableName = req.params.tableName.toLowerCase();
    const { id } = req.params;
    const data = req.body;

    console.log('✏️ PUT /api/entities/' + tableName + '/' + id, data);

    // Verificar se tabela física existe
    const physicalTableExists = await tableExists(tableName);
    if (!physicalTableExists) {
      return res.status(404).json({ error: 'Table not found: ' + tableName });
    }

    // Buscar colunas da tabela
    const columnsResult = await query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = $1 AND table_schema = 'public'`,
      [tableName]
    );
    const existingColumns = new Set(columnsResult.rows.map(r => r.column_name));

    // Remover campos de sistema que não podem ser atualizados
    const {
      id: _id,
      dhinc,
      dhalter,
      created_at,
      created_by,
      updated_at,
      updated_by,
      ...cleanData
    } = data;

    // Filtrar apenas campos que existem na tabela
    const filteredData = {};
    Object.entries(cleanData).forEach(([key, value]) => {
      if (existingColumns.has(key)) {
        filteredData[key] = value;
      }
    });

    console.log('✅ Campos filtrados para update:', Object.keys(filteredData));

    // Se não há dados para atualizar, erro
    if (Object.keys(filteredData).length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update',
        receivedFields: Object.keys(data),
        tableColumns: Array.from(existingColumns)
      });
    }

    // Construir query UPDATE
    const columns = Object.keys(filteredData);
    const values = Object.values(filteredData);
    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');

    const updateSQL = `UPDATE ${tableName}
       SET ${setClause}
       WHERE id = $${columns.length + 1}
       RETURNING *`;

    console.log('🔧 SQL:', updateSQL);
    console.log('🔧 Values:', [...values, id]);

    const result = await query(updateSQL, [...values, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    console.log('✅ Registro atualizado:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error updating entity:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      detail: error.detail || error.hint
    });
  }
});

/**
 * DELETE /api/entities/:tableName/:id
 * Deletar registro
 */
router.delete('/:tableName/:id', authMiddleware, async (req, res) => {
  try {
    const tableName = req.params.tableName.toLowerCase();
    const { id } = req.params;

    const result = await query(
      `DELETE FROM ${tableName} WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entity not found' });
    }

    res.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    console.error('Error deleting entity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/entities/:tableName
 * Deletar múltiplos registros
 */
router.delete('/:tableName', authMiddleware, async (req, res) => {
  try {
    const { tableName } = req.params;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    // Construir placeholders para query
    const placeholders = ids.map((_, i) => `$${i + 2}`).join(',');

    const result = await query(
      `DELETE FROM dynamic_data WHERE table_name = $1 AND id IN (${placeholders}) RETURNING id`,
      [tableName, ...ids]
    );

    res.json({
      success: true,
      deletedCount: result.rows.length,
      deletedIds: result.rows.map(r => r.id),
    });
  } catch (error) {
    console.error('Error deleting entities:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/entities/:tableName/count
 * Contar registros
 */
router.get('/:tableName/count', authMiddleware, async (req, res) => {
  try {
    const { tableName } = req.params;
    const { filter } = req.query;

    // Buscar screen_id pelo table_name
    const screenResult = await query(
      'SELECT id FROM screens WHERE tabela_nome = $1',
      [tableName]
    );

    if (screenResult.rows.length === 0) {
      return res.status(404).json({ error: 'Screen not found for table: ' + tableName });
    }

    const screenId = screenResult.rows[0].id;

    let queryText = `SELECT COUNT(*) as count FROM dynamic_data WHERE screen_id = $1 AND table_name = $2`;
    const queryParams = [screenId, tableName];
    let paramIndex = 3;

    // Filtros (JSONB)
    if (filter) {
      try {
        const filterObj = JSON.parse(filter);
        Object.entries(filterObj).forEach(([key, value]) => {
          queryText += ` AND data->>'${key}' = $${paramIndex}`;
          queryParams.push(String(value));
          paramIndex++;
        });
      } catch (e) {
        console.error('Invalid filter JSON:', e);
      }
    }

    const result = await query(queryText, queryParams);

    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error counting entities:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
