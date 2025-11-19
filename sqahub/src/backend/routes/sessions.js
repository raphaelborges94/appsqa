import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../auth.js';

const router = express.Router();

/**
 * GET /api/sessions
 * Listar todas as sessões ativas
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Primeiro, marcar como inativas as sessões que excedem 1 hora de inatividade
    await query(
      `UPDATE user_sessions
       SET is_active = FALSE, logout_at = NOW()
       WHERE is_active = TRUE
       AND EXTRACT(EPOCH FROM (NOW() - last_activity)) > 3600`
    );

    const result = await query(
      `SELECT
        s.id,
        s.user_id,
        s.ip_address,
        s.user_agent,
        s.login_at,
        s.expires_at,
        s.last_activity,
        s.is_active,
        u.id as user_code,
        u.full_name as user_name,
        u.email as user_email,
        g.nome as grupo_nome,
        EXTRACT(EPOCH FROM (NOW() - s.login_at)) as logged_time_seconds,
        EXTRACT(EPOCH FROM (s.expires_at - NOW())) as time_to_expire_seconds,
        EXTRACT(EPOCH FROM (NOW() - s.last_activity)) as inactive_seconds
      FROM user_sessions s
      INNER JOIN users u ON s.user_id = u.id
      LEFT JOIN sqausugru g ON u.grupo_id = g.id
      WHERE s.is_active = TRUE
      AND s.expires_at > NOW()
      AND EXTRACT(EPOCH FROM (NOW() - s.last_activity)) <= 3600
      ORDER BY s.login_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/sessions/:id/terminate
 * Encerrar sessão de outro usuário (admin)
 */
router.post('/:id/terminate', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar a sessão
    const sessionResult = await query(
      'SELECT token FROM user_sessions WHERE id = $1',
      [id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Encerrar sessão
    await query(
      'UPDATE user_sessions SET is_active = FALSE, logout_at = NOW() WHERE id = $1',
      [id]
    );

    res.json({ success: true, message: 'Session terminated successfully' });
  } catch (error) {
    console.error('Error terminating session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
