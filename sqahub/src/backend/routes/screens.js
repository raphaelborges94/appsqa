import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../auth.js';
import {
  createPhysicalTable,
  addColumnToTable,
  dropColumnFromTable,
  dropPhysicalTable,
  syncPhysicalTable,
} from '../dynamicTableManager.js';

const router = express.Router();

/**
 * GET /api/screens
 * Listar todas as telas
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { sort = '-created_at' } = req.query;
    const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
    const sortDir = sort.startsWith('-') ? 'DESC' : 'ASC';

    const result = await query(
      `SELECT * FROM screens ORDER BY ${sortField} ${sortDir}`,
      []
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error listing screens:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/screens/:id
 * Obter uma tela específica
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM screens WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Screen not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting screen:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/screens
 * Criar nova tela
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      nome,
      descricao,
      tabela_nome,
      ativa = true,
      icone = 'Database',
      cor_primaria = '#64748B',
      is_subtable = false,
      parent_screen_id = null,
      ordem_aba = 0,
      campo_nome,
      campo_pai,
      campo_codigo,
      permitir_raiz = true,
      nivel_maximo = 10,
      screen_type, // Novo campo explícito
    } = req.body;

    // Determinar screen_type automaticamente se não foi fornecido
    const finalScreenType = screen_type || (
      is_subtable ? 'subtable' :
      (campo_nome ? 'tree' : 'crud')
    );

    const result = await query(
      `INSERT INTO screens (
        nome, descricao, tabela_nome, ativa, icone, cor_primaria,
        is_subtable, parent_screen_id, ordem_aba,
        campo_nome, campo_pai, campo_codigo, permitir_raiz, nivel_maximo,
        screen_type, created_by, name, title, entity_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        nome, descricao, tabela_nome, ativa, icone, cor_primaria,
        is_subtable, parent_screen_id, ordem_aba,
        campo_nome, campo_pai, campo_codigo, permitir_raiz, nivel_maximo,
        finalScreenType, // Novo campo
        req.user.id,
        nome, // name (compatibilidade)
        nome, // title (compatibilidade)
        tabela_nome // entity_name (compatibilidade)
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating screen:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/screens/:id
 * Atualizar uma tela
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nome,
      descricao,
      tabela_nome,
      ativa,
      icone,
      cor_primaria,
      is_subtable,
      parent_screen_id,
      ordem_aba,
      campo_nome,
      campo_pai,
      campo_codigo,
      permitir_raiz,
      nivel_maximo,
      screen_type, // Novo campo
    } = req.body;

    // Determinar screen_type automaticamente se não foi fornecido
    const finalScreenType = screen_type || (
      is_subtable ? 'subtable' :
      (campo_nome ? 'tree' : 'crud')
    );

    const result = await query(
      `UPDATE screens SET
        nome = COALESCE($1, nome),
        descricao = COALESCE($2, descricao),
        tabela_nome = COALESCE($3, tabela_nome),
        ativa = COALESCE($4, ativa),
        icone = COALESCE($5, icone),
        cor_primaria = COALESCE($6, cor_primaria),
        is_subtable = COALESCE($7, is_subtable),
        parent_screen_id = $8,
        ordem_aba = COALESCE($9, ordem_aba),
        campo_nome = $10,
        campo_pai = $11,
        campo_codigo = $12,
        permitir_raiz = COALESCE($13, permitir_raiz),
        nivel_maximo = COALESCE($14, nivel_maximo),
        screen_type = COALESCE($15, screen_type),
        name = COALESCE($1, name),
        title = COALESCE($1, title),
        entity_name = COALESCE($3, entity_name)
      WHERE id = $16
      RETURNING *`,
      [
        nome, descricao, tabela_nome, ativa, icone, cor_primaria,
        is_subtable, parent_screen_id, ordem_aba,
        campo_nome, campo_pai, campo_codigo, permitir_raiz, nivel_maximo,
        finalScreenType, // Novo campo
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Screen not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating screen:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/screens/:id
 * Deletar uma tela
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM screens WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Screen not found' });
    }

    res.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    console.error('Error deleting screen:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/screens/:screenId/fields
 * Listar campos de uma tela
 */
router.get('/:screenId/fields', authMiddleware, async (req, res) => {
  try {
    const { screenId } = req.params;

    const result = await query(
      'SELECT * FROM fields WHERE screen_id = $1 ORDER BY ordem ASC',
      [screenId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error listing fields:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/screens/:screenId/sync-table
 * Sincronizar tabela física com os fields da screen
 */
router.post('/:screenId/sync-table', authMiddleware, async (req, res) => {
  try {
    const { screenId } = req.params;

    // Buscar screen
    const screenResult = await query('SELECT * FROM screens WHERE id = $1', [screenId]);
    if (screenResult.rows.length === 0) {
      return res.status(404).json({ error: 'Screen not found' });
    }
    const screen = screenResult.rows[0];

    // Buscar fields
    const fieldsResult = await query(
      'SELECT * FROM fields WHERE screen_id = $1 ORDER BY ordem ASC',
      [screenId]
    );

    // Sincronizar tabela física
    console.log(`🔄 Sincronizando tabela ${screen.tabela_nome} com ${fieldsResult.rows.length} campos`);
    await syncPhysicalTable(screen.tabela_nome, fieldsResult.rows);

    res.json({ success: true, message: `Tabela ${screen.tabela_nome} sincronizada` });
  } catch (error) {
    console.error('❌ Error syncing table:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * POST /api/screens/:screenId/fields
 * Criar novo campo
 */
router.post('/:screenId/fields', authMiddleware, async (req, res) => {
  try {
    const { screenId } = req.params;
    const {
      nome_campo,
      label,
      tipo,
      obrigatorio = false,
      somente_leitura = false,
      unico = false,
      tamanho_maximo,
      valor_padrao,
      fk_screen_id,
      fk_display_field,
      ordem = 0,
      largura_coluna = '200px',
      visivel_tabela = true,
      visivel_form = true,
      placeholder,
      hint,
    } = req.body;

    const result = await query(
      `INSERT INTO fields (
        screen_id, nome_campo, label, tipo, obrigatorio, somente_leitura, unico,
        tamanho_maximo, valor_padrao, fk_screen_id, fk_display_field,
        ordem, largura_coluna, visivel_tabela, visivel_form, placeholder, hint,
        name, type, required, order_index
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *`,
      [
        screenId, nome_campo, label, tipo, obrigatorio, somente_leitura, unico,
        tamanho_maximo, valor_padrao, fk_screen_id, fk_display_field,
        ordem, largura_coluna, visivel_tabela, visivel_form, placeholder, hint,
        nome_campo, // name (compatibilidade)
        tipo, // type (compatibilidade)
        obrigatorio, // required (compatibilidade)
        ordem // order_index (compatibilidade)
      ]
    );

    const field = result.rows[0];

    // Adicionar coluna à tabela física (se existir)
    try {
      const screenResult = await query('SELECT tabela_nome FROM screens WHERE id = $1', [screenId]);
      if (screenResult.rows.length > 0) {
        const tableName = screenResult.rows[0].tabela_nome;

        // Verificar se a tabela existe antes de tentar adicionar coluna
        const { tableExists: checkExists } = await import('../dynamicTableManager.js');
        const exists = await checkExists(tableName);

        if (exists) {
          await addColumnToTable(tableName, field);
        } else {
          console.warn(`⚠️ Tabela ${tableName} ainda não existe. Execute syncTable para criá-la.`);
        }
      }
    } catch (tableError) {
      console.warn('Não foi possível adicionar coluna à tabela física:', tableError.message);
      // Não falhar a operação se a tabela física não existir ainda
    }

    res.status(201).json(field);
  } catch (error) {
    console.error('Error creating field:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/screens/:screenId/fields/:fieldId
 * Atualizar campo
 */
router.put('/:screenId/fields/:fieldId', authMiddleware, async (req, res) => {
  try {
    const { fieldId } = req.params;
    const {
      nome_campo,
      label,
      tipo,
      obrigatorio,
      somente_leitura,
      unico,
      tamanho_maximo,
      valor_padrao,
      fk_screen_id,
      fk_display_field,
      ordem,
      largura_coluna,
      visivel_tabela,
      visivel_form,
      placeholder,
      hint,
    } = req.body;

    const result = await query(
      `UPDATE fields SET
        nome_campo = COALESCE($1, nome_campo),
        label = COALESCE($2, label),
        tipo = COALESCE($3, tipo),
        obrigatorio = COALESCE($4, obrigatorio),
        somente_leitura = COALESCE($5, somente_leitura),
        unico = COALESCE($6, unico),
        tamanho_maximo = $7,
        valor_padrao = $8,
        fk_screen_id = $9,
        fk_display_field = $10,
        ordem = COALESCE($11, ordem),
        largura_coluna = COALESCE($12, largura_coluna),
        visivel_tabela = COALESCE($13, visivel_tabela),
        visivel_form = COALESCE($14, visivel_form),
        placeholder = $15,
        hint = $16,
        name = COALESCE($1, name),
        type = COALESCE($3, type),
        required = COALESCE($4, required),
        order_index = COALESCE($11, order_index)
      WHERE id = $17
      RETURNING *`,
      [
        nome_campo, label, tipo, obrigatorio, somente_leitura, unico,
        tamanho_maximo, valor_padrao, fk_screen_id, fk_display_field,
        ordem, largura_coluna, visivel_tabela, visivel_form, placeholder, hint,
        fieldId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Field not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating field:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/screens/:screenId/fields/:fieldId
 * Deletar campo
 */
router.delete('/:screenId/fields/:fieldId', authMiddleware, async (req, res) => {
  try {
    const { screenId, fieldId } = req.params;

    const result = await query(
      'DELETE FROM fields WHERE id = $1 RETURNING *',
      [fieldId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Field not found' });
    }

    const deletedField = result.rows[0];

    // Remover coluna da tabela física
    try {
      const screenResult = await query('SELECT tabela_nome FROM screens WHERE id = $1', [screenId]);
      if (screenResult.rows.length > 0) {
        const tableName = screenResult.rows[0].tabela_nome;
        await dropColumnFromTable(tableName, deletedField.nome_campo);
      }
    } catch (tableError) {
      console.warn('Não foi possível remover coluna da tabela física:', tableError.message);
    }

    res.json({ success: true, deleted: deletedField });
  } catch (error) {
    console.error('Error deleting field:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/screens/:screenId/buttons
 * Listar botões de ação de uma tela
 */
router.get('/:screenId/buttons', authMiddleware, async (req, res) => {
  try {
    const { screenId } = req.params;

    const result = await query(
      'SELECT * FROM action_buttons WHERE screen_id = $1 AND ativo = true ORDER BY ordem ASC',
      [screenId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error listing action buttons:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/screens/:screenId/buttons
 * Criar novo botão de ação
 */
router.post('/:screenId/buttons', authMiddleware, async (req, res) => {
  try {
    const { screenId } = req.params;
    const {
      nome,
      descricao,
      codigo_javascript,
      parametros = [],
      contexto = 'registro',
      icone = 'Zap',
      cor = '#3B82F6',
      ordem = 0,
      ativo = true,
    } = req.body;

    const result = await query(
      `INSERT INTO action_buttons (
        screen_id, nome, descricao, codigo_javascript, parametros,
        contexto, icone, cor, ordem, ativo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        screenId, nome, descricao, codigo_javascript, JSON.stringify(parametros),
        contexto, icone, cor, ordem, ativo
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating action button:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/screens/:screenId/buttons/:buttonId
 * Atualizar botão de ação
 */
router.put('/:screenId/buttons/:buttonId', authMiddleware, async (req, res) => {
  try {
    const { buttonId } = req.params;
    const {
      nome,
      descricao,
      codigo_javascript,
      parametros,
      contexto,
      icone,
      cor,
      ordem,
      ativo,
    } = req.body;

    const result = await query(
      `UPDATE action_buttons SET
        nome = COALESCE($1, nome),
        descricao = COALESCE($2, descricao),
        codigo_javascript = COALESCE($3, codigo_javascript),
        parametros = COALESCE($4, parametros),
        contexto = COALESCE($5, contexto),
        icone = COALESCE($6, icone),
        cor = COALESCE($7, cor),
        ordem = COALESCE($8, ordem),
        ativo = COALESCE($9, ativo)
      WHERE id = $10
      RETURNING *`,
      [
        nome, descricao, codigo_javascript, parametros ? JSON.stringify(parametros) : null,
        contexto, icone, cor, ordem, ativo,
        buttonId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Action button not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating action button:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/screens/:screenId/buttons/:buttonId
 * Deletar botão de ação
 */
router.delete('/:screenId/buttons/:buttonId', authMiddleware, async (req, res) => {
  try {
    const { buttonId } = req.params;

    const result = await query(
      'DELETE FROM action_buttons WHERE id = $1 RETURNING *',
      [buttonId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Action button not found' });
    }

    res.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    console.error('Error deleting action button:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
