import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../auth.js';

const router = express.Router();

/**
 * GET /api/users
 * Listar todos os usuários
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      `SELECT
        id, email, full_name, cpf, grupo_id, active, phone, avatar_url, last_login, created_at, updated_at
      FROM users
      ORDER BY created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users/:id
 * Buscar usuário por ID
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT
        id, email, full_name, cpf, grupo_id, active, phone, avatar_url, last_login, created_at, updated_at
      FROM users
      WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/users
 * Criar novo usuário
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      email,
      full_name,
      cpf,
      grupo_id = null,
      active = true,
      phone,
      avatar_url
    } = req.body;

    // Validações
    if (!email || !full_name || !cpf) {
      return res.status(400).json({ error: 'Email, full_name and cpf are required' });
    }

    // Verificar se email já existe
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 OR cpf = $2',
      [email, cpf]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email or CPF already exists' });
    }

    const result = await query(
      `INSERT INTO users (email, full_name, cpf, grupo_id, active, phone, avatar_url, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, email, full_name, cpf, grupo_id, active, phone, avatar_url, created_at, updated_at`,
      [email, full_name, cpf, grupo_id, active, phone, avatar_url]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/users/:id
 * Atualizar usuário
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      email,
      full_name,
      cpf,
      grupo_id,
      active,
      phone,
      avatar_url
    } = req.body;

    // Verificar se usuário existe
    const existing = await query('SELECT id FROM users WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Se está alterando email ou CPF, verificar se novo valor já existe
    if (email || cpf) {
      const emailCheck = await query(
        'SELECT id FROM users WHERE (email = $1 OR cpf = $2) AND id != $3',
        [email, cpf, id]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Email or CPF already exists' });
      }
    }

    const result = await query(
      `UPDATE users SET
        email = COALESCE($1, email),
        full_name = COALESCE($2, full_name),
        cpf = COALESCE($3, cpf),
        grupo_id = COALESCE($4, grupo_id),
        active = COALESCE($5, active),
        phone = COALESCE($6, phone),
        avatar_url = COALESCE($7, avatar_url),
        updated_at = NOW()
      WHERE id = $8
      RETURNING id, email, full_name, cpf, grupo_id, active, phone, avatar_url, created_at, updated_at`,
      [email, full_name, cpf, grupo_id, active, phone, avatar_url, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/users/:id
 * Deletar usuário (soft delete - marca como inativo)
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Não permitir deletar a si mesmo
    if (req.user.id === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Soft delete - marcar como inativo
    const result = await query(
      `UPDATE users SET
        active = false,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/users/:id/activate
 * Reativar usuário
 */
router.post('/:id/activate', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `UPDATE users SET
        active = true,
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, email, full_name, cpf, active`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error activating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
