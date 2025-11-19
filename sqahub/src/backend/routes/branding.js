import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../auth.js';

const router = express.Router();

// ===============================
// MENU CONFIG ROUTES (DEVEM VIR ANTES DAS ROTAS COM /:id)
// ===============================

// GET /api/branding/menu-configs - Listar todas as configurações de menu
router.get('/menu-configs', authMiddleware, async (req, res) => {
  try {
    const { sort = '-created_at' } = req.query;
    const orderField = sort.startsWith('-') ? sort.substring(1) : sort;
    const orderDirection = sort.startsWith('-') ? 'DESC' : 'ASC';

    const result = await query(
      `SELECT * FROM menu_configs
       ORDER BY ${orderField} ${orderDirection}`,
      []
    );

    console.log(`📋 Listando ${result.rows.length} menu configs`);
    if (result.rows.length > 0) {
      console.log('📋 Primeira config:', {
        id: result.rows[0].id,
        is_active: result.rows[0].is_active,
        menu_structure_type: typeof result.rows[0].menu_structure,
        menu_structure_length: Array.isArray(result.rows[0].menu_structure) ? result.rows[0].menu_structure.length : 'not array'
      });
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar menu configs:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/branding/menu-configs/active - Buscar configuração ativa
router.get('/menu-configs/active', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM menu_configs WHERE is_active = TRUE LIMIT 1',
      []
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nenhuma configuração de menu ativa encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar menu config ativo:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/branding/menu-configs/:id - Buscar configuração específica
router.get('/menu-configs/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT * FROM menu_configs WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuração de menu não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar menu config:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/branding/menu-configs - Criar nova configuração
router.post('/menu-configs', authMiddleware, async (req, res) => {
  try {
    const { menu_structure, is_active } = req.body;

    // Se esta config for ativa, desativar todas as outras
    if (is_active) {
      await query('UPDATE menu_configs SET is_active = FALSE', []);
    }

    const result = await query(
      `INSERT INTO menu_configs (menu_structure, is_active, created_by)
       VALUES ($1::jsonb, $2, $3)
       RETURNING *`,
      [JSON.stringify(menu_structure), is_active, req.user.id]
    );

    console.log('✅ Menu config criada:', result.rows[0].id);
    console.log('📋 Menu structure salva:', JSON.stringify(result.rows[0].menu_structure, null, 2));
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar menu config:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/branding/menu-configs/:id - Atualizar configuração
router.put('/menu-configs/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { menu_structure, is_active } = req.body;

    console.log('🔄 Atualizando menu config:', id);
    console.log('📋 Menu structure recebida:', JSON.stringify(menu_structure, null, 2));

    // Se esta config for ativa, desativar todas as outras
    if (is_active) {
      await query('UPDATE menu_configs SET is_active = FALSE WHERE id != $1', [id]);
    }

    const result = await query(
      `UPDATE menu_configs SET
        menu_structure = $1::jsonb,
        is_active = $2,
        updated_by = $3
      WHERE id = $4
      RETURNING *`,
      [JSON.stringify(menu_structure), is_active, req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuração de menu não encontrada' });
    }

    console.log('✅ Menu config atualizada:', id);
    console.log('📋 Menu structure salva:', JSON.stringify(result.rows[0].menu_structure, null, 2));
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar menu config:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/branding/menu-configs/:id - Deletar configuração
router.delete('/menu-configs/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se é a configuração ativa
    const checkResult = await query(
      'SELECT is_active FROM menu_configs WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length > 0 && checkResult.rows[0].is_active) {
      return res.status(400).json({ error: 'Não é possível deletar a configuração de menu ativa' });
    }

    const result = await query(
      'DELETE FROM menu_configs WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuração de menu não encontrada' });
    }

    console.log('✅ Menu config deletada:', id);
    res.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    console.error('Erro ao deletar menu config:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===============================
// BRANDING CONFIG ROUTES
// ===============================

// GET /api/branding - Listar todas as configurações de branding
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { sort = '-created_at' } = req.query;
    const orderField = sort.startsWith('-') ? sort.substring(1) : sort;
    const orderDirection = sort.startsWith('-') ? 'DESC' : 'ASC';

    const result = await query(
      `SELECT * FROM branding_configs
       ORDER BY ${orderField} ${orderDirection}`,
      []
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar branding configs:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/branding/active - Buscar configuração ativa
router.get('/active', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM branding_configs WHERE is_active = TRUE LIMIT 1',
      []
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nenhuma configuração ativa encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar branding config ativo:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/branding/:id - Buscar configuração específica
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT * FROM branding_configs WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuração não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar branding config:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/branding - Criar nova configuração
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      app_name,
      app_subtitle,
      logo_url,
      primary_color,
      secondary_color,
      accent_color,
      sidebar_bg_color,
      sidebar_text_color,
      sidebar_active_bg,
      sidebar_active_text,
      favicon_url,
      company_name,
      support_email,
      support_phone,
      is_active
    } = req.body;

    // Se esta config for ativa, desativar todas as outras
    if (is_active) {
      await query('UPDATE branding_configs SET is_active = FALSE', []);
    }

    const result = await query(
      `INSERT INTO branding_configs (
        app_name, app_subtitle, logo_url, primary_color, secondary_color,
        accent_color, sidebar_bg_color, sidebar_text_color, sidebar_active_bg,
        sidebar_active_text, favicon_url, company_name, support_email,
        support_phone, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        app_name, app_subtitle, logo_url, primary_color, secondary_color,
        accent_color, sidebar_bg_color, sidebar_text_color, sidebar_active_bg,
        sidebar_active_text, favicon_url, company_name, support_email,
        support_phone, is_active, req.user.id
      ]
    );

    console.log('✅ Branding config criada:', result.rows[0].id);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar branding config:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/branding/:id - Atualizar configuração
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      app_name,
      app_subtitle,
      logo_url,
      primary_color,
      secondary_color,
      accent_color,
      sidebar_bg_color,
      sidebar_text_color,
      sidebar_active_bg,
      sidebar_active_text,
      favicon_url,
      company_name,
      support_email,
      support_phone,
      is_active
    } = req.body;

    // Se esta config for ativa, desativar todas as outras
    if (is_active) {
      await query('UPDATE branding_configs SET is_active = FALSE WHERE id != $1', [id]);
    }

    const result = await query(
      `UPDATE branding_configs SET
        app_name = $1,
        app_subtitle = $2,
        logo_url = $3,
        primary_color = $4,
        secondary_color = $5,
        accent_color = $6,
        sidebar_bg_color = $7,
        sidebar_text_color = $8,
        sidebar_active_bg = $9,
        sidebar_active_text = $10,
        favicon_url = $11,
        company_name = $12,
        support_email = $13,
        support_phone = $14,
        is_active = $15,
        updated_by = $16
      WHERE id = $17
      RETURNING *`,
      [
        app_name, app_subtitle, logo_url, primary_color, secondary_color,
        accent_color, sidebar_bg_color, sidebar_text_color, sidebar_active_bg,
        sidebar_active_text, favicon_url, company_name, support_email,
        support_phone, is_active, req.user.id, id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuração não encontrada' });
    }

    console.log('✅ Branding config atualizada:', id);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar branding config:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/branding/:id - Deletar configuração
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se é a configuração ativa
    const checkResult = await query(
      'SELECT is_active FROM branding_configs WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length > 0 && checkResult.rows[0].is_active) {
      return res.status(400).json({ error: 'Não é possível deletar a configuração ativa' });
    }

    const result = await query(
      'DELETE FROM branding_configs WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuração não encontrada' });
    }

    console.log('✅ Branding config deletada:', id);
    res.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    console.error('Erro ao deletar branding config:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
