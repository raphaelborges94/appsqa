import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { query } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Função para invalidar todas as sessões ativas de um usuário
export const invalidateUserSessions = async (userId) => {
  try {
    await query(
      'UPDATE user_sessions SET is_active = FALSE, logout_at = NOW() WHERE user_id = $1 AND is_active = TRUE',
      [userId]
    );
    console.log(`✅ Sessões anteriores do usuário ${userId} foram invalidadas`);
  } catch (error) {
    console.error('Error invalidating user sessions:', error);
  }
};

// Função para registrar sessão do usuário
export const createSession = async (userId, token, ipAddress, userAgent) => {
  try {
    // Primeiro, invalidar todas as sessões ativas do usuário
    await invalidateUserSessions(userId);

    // Calcular data de expiração baseada no JWT_EXPIRES_IN
    const expiresInMs = parseJwtExpiresIn(JWT_EXPIRES_IN);
    const expiresAt = new Date(Date.now() + expiresInMs);

    await query(
      `INSERT INTO user_sessions (user_id, token, ip_address, user_agent, login_at, expires_at, last_activity, is_active)
       VALUES ($1, $2, $3, $4, NOW(), $5, NOW(), TRUE)`,
      [userId, token, ipAddress, userAgent, expiresAt]
    );

    // Atualizar last_login do usuário
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [userId]
    );
  } catch (error) {
    console.error('Error creating session:', error);
  }
};

// Função para atualizar última atividade da sessão
export const updateSessionActivity = async (token) => {
  try {
    await query(
      'UPDATE user_sessions SET last_activity = NOW() WHERE token = $1 AND is_active = TRUE',
      [token]
    );
  } catch (error) {
    console.error('Error updating session activity:', error);
  }
};

// Função para encerrar sessão
export const endSession = async (token) => {
  try {
    await query(
      'UPDATE user_sessions SET is_active = FALSE, logout_at = NOW() WHERE token = $1',
      [token]
    );
  } catch (error) {
    console.error('Error ending session:', error);
  }
};

// Helper para converter JWT_EXPIRES_IN em milissegundos
const parseJwtExpiresIn = (expiresIn) => {
  const unit = expiresIn.slice(-1);
  const value = parseInt(expiresIn.slice(0, -1));

  const multipliers = {
    's': 1000,
    'm': 60 * 1000,
    'h': 60 * 60 * 1000,
    'd': 24 * 60 * 60 * 1000,
  };

  return value * (multipliers[unit] || multipliers['d']);
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    // Verificar se a sessão existe e está ativa
    const sessionResult = await query(
      `SELECT id, user_id, last_activity, is_active, expires_at
       FROM user_sessions
       WHERE token = $1 AND is_active = TRUE`,
      [token]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Session not found or inactive' });
    }

    const session = sessionResult.rows[0];

    // Verificar se a sessão está expirada
    if (new Date(session.expires_at) < new Date()) {
      await endSession(token);
      return res.status(401).json({ error: 'Session expired' });
    }

    // Verificar se houve inatividade de mais de 1 hora (3600 segundos)
    const lastActivity = new Date(session.last_activity);
    const now = new Date();
    const inactivitySeconds = (now - lastActivity) / 1000;
    const MAX_INACTIVITY_SECONDS = 60 * 60; // 1 hora

    if (inactivitySeconds > MAX_INACTIVITY_SECONDS) {
      await endSession(token);
      return res.status(401).json({ error: 'Session expired due to inactivity' });
    }

    // Buscar usuário no banco
    const result = await query(
      'SELECT id, email, full_name, created_at FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = result.rows[0];
    req.token = token;

    // Atualizar última atividade da sessão (não-bloqueante)
    updateSessionActivity(token);

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    // Buscar usu�rio no banco
    const result = await query(
      'SELECT id, email, full_name, created_at FROM users WHERE id = $1',
      [decoded.id]
    );

    req.user = result.rows.length > 0 ? result.rows[0] : null;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};
