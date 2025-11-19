'use strict';

const jwt = require('jsonwebtoken');
const { query } = require('../db');

const BI_JWT_SECRET = process.env.BI_JWT_SECRET || process.env.JWT_SECRET || 'dev-change-me';
const ALGORITHMS = ['HS256'];

// Intervalo mínimo entre verificações do Hub (em milissegundos)
// Para evitar sobrecarga, só verificamos a cada 2 minutos
const HUB_CHECK_INTERVAL = 2 * 60 * 1000; // 2 minutos

/**
 * Verifica se a sessão do Hub ainda está ativa
 *
 * @param {string} userId - ID do usuário
 * @returns {Promise<boolean>} True se sessão do Hub está ativa
 */
async function isHubSessionActive(userId) {
  try {
    const result = await query(
      `SELECT is_active, expires_at, last_activity
       FROM user_sessions
       WHERE user_id = $1
       AND is_active = TRUE
       AND expires_at > NOW()
       ORDER BY last_activity DESC
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const session = result.rows[0];

    // Verificar timeout de inatividade (1 hora, conforme lógica do Hub)
    const lastActivity = new Date(session.last_activity);
    const now = new Date();
    const inactiveMinutes = (now - lastActivity) / (1000 * 60);

    if (inactiveMinutes > 60) {
      // Sessão do Hub expirou por inatividade
      return false;
    }

    return true;
  } catch (error) {
    console.error('[auth] Erro ao verificar sessão do Hub:', error.message);
    // Em caso de erro de conexão com DB, permitir acesso temporariamente
    // mas logar o erro para investigação
    return true;
  }
}

/**
 * Atualiza timestamp de última verificação do Hub e última atividade
 *
 * @param {string} biToken - Token JWT do BI
 * @returns {Promise<void>}
 */
async function updateBISessionActivity(biToken) {
  try {
    await query(
      `UPDATE bi_sessions
       SET last_activity = NOW(),
           last_hub_check = NOW(),
           updated_at = NOW()
       WHERE bi_token = $1 AND is_active = TRUE`,
      [biToken]
    );
  } catch (error) {
    // Erro não crítico, apenas logar
    console.error('[auth] Erro ao atualizar atividade da sessão BI:', error.message);
  }
}

/**
 * Invalida a sessão do BI
 *
 * @param {string} biToken - Token JWT do BI
 * @param {string} reason - Motivo do logout
 * @returns {Promise<void>}
 */
async function invalidateBISession(biToken, reason = 'hub_logout') {
  try {
    await query(
      `UPDATE bi_sessions
       SET is_active = FALSE,
           logout_at = NOW(),
           logout_reason = $2,
           updated_at = NOW()
       WHERE bi_token = $1`,
      [biToken, reason]
    );
  } catch (error) {
    console.error('[auth] Erro ao invalidar sessão BI:', error.message);
  }
}

/**
 * Verifica se precisa checar o status do Hub
 *
 * @param {Date|null} lastHubCheck - Última verificação do Hub
 * @returns {boolean} True se deve verificar o Hub
 */
function shouldCheckHub(lastHubCheck) {
  if (!lastHubCheck) return true;

  const now = new Date();
  const lastCheck = new Date(lastHubCheck);
  const timeSinceCheck = now - lastCheck;

  return timeSinceCheck >= HUB_CHECK_INTERVAL;
}

/**
 * Middleware de autenticação com verificação de sessão do Hub
 *
 * Fluxo:
 * 1. Valida o JWT do BI (biToken)
 * 2. Verifica se a sessão do BI existe e está ativa no banco
 * 3. A cada 2 minutos, verifica se a sessão do Hub ainda está ativa
 * 4. Se sessão do Hub estiver inativa, invalida sessão do BI
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
async function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  const token = match ? match[1] : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'unauthorized',
      message: 'Missing Bearer token'
    });
  }

  try {
    // 1. Validar JWT
    const payload = jwt.verify(token, BI_JWT_SECRET, { algorithms: ALGORITHMS });

    // 2. Verificar se a sessão do BI existe e está ativa
    const sessionResult = await query(
      `SELECT id, user_id, is_active, expires_at, last_hub_check, logout_reason
       FROM bi_sessions
       WHERE bi_token = $1`,
      [token]
    );

    if (sessionResult.rows.length === 0) {
      // Sessão não encontrada no banco
      return res.status(401).json({
        success: false,
        error: 'session_not_found',
        message: 'Sessão não encontrada. Faça login novamente.'
      });
    }

    const session = sessionResult.rows[0];

    // Verificar se a sessão está ativa
    if (!session.is_active) {
      const reason = session.logout_reason || 'unknown';
      const messages = {
        hub_logout: 'Sessão encerrada: logout realizado no Hub',
        hub_inactive: 'Sessão encerrada: sessão do Hub inativa',
        hub_down: 'Sessão encerrada: Hub indisponível',
        manual: 'Sessão encerrada manualmente',
        expired: 'Sessão expirada',
      };

      return res.status(401).json({
        success: false,
        error: 'session_inactive',
        message: messages[reason] || 'Sessão inativa. Faça login novamente.',
        reason: reason
      });
    }

    // 3. Verificar se precisa checar o status do Hub
    if (shouldCheckHub(session.last_hub_check)) {
      const hubActive = await isHubSessionActive(session.user_id);

      if (!hubActive) {
        // Sessão do Hub inativa - invalidar sessão do BI
        await invalidateBISession(token, 'hub_inactive');

        return res.status(401).json({
          success: false,
          error: 'hub_session_inactive',
          message: 'Sessão do Hub não está mais ativa. Faça login novamente.'
        });
      }

      // Atualizar timestamp de última verificação
      await updateBISessionActivity(token);
    } else {
      // Apenas atualizar last_activity (sem verificar Hub)
      await query(
        `UPDATE bi_sessions
         SET last_activity = NOW(), updated_at = NOW()
         WHERE bi_token = $1`,
        [token]
      );
    }

    // 4. Tudo OK - continuar
    req.user = payload;
    req.sessionId = session.id;
    return next();

  } catch (err) {
    const isExpired = err && err.name === 'TokenExpiredError';

    if (isExpired) {
      // Marcar sessão como expirada no banco
      await invalidateBISession(token, 'expired').catch(() => {});
    }

    return res.status(401).json({
      success: false,
      error: isExpired ? 'token_expired' : 'invalid_token',
      message: isExpired ? 'Token expirado' : 'Token inválido'
    });
  }
}

module.exports = {
  requireAuth,
  isHubSessionActive,
  invalidateBISession,
  updateBISessionActivity
};
