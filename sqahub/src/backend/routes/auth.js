import express from 'express';
import crypto from 'crypto';
import { query } from '../db.js';
import { generateToken, authMiddleware, createSession, endSession } from '../auth.js';
import { sendPasswordlessEmail, sendWelcomeEmail } from '../email.js';

const router = express.Router();

console.log('📝 Carregando auth routes...');

/**
 * POST /api/auth/passwordless/request
 * Solicitar login passwordless por email
 */
router.post('/passwordless/request', async (req, res) => {
  console.log('🔐 POST /passwordless/request chamado', { body: req.body });
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Verificar se é o email de bypass (desenvolvimento/testes)
    const bypassEmail = process.env.DEV_BYPASS_EMAIL;
    const isBypass = bypassEmail && email.toLowerCase() === bypassEmail.toLowerCase();

    // Verificar se usuário existe
    const userResult = await query(
      'SELECT id, email, full_name FROM users WHERE email = $1',
      [email]
    );

    let user;
    let isNewUser = false;

    if (userResult.rows.length === 0) {
      // Criar novo usuário
      const newUserResult = await query(
        'INSERT INTO users (email, full_name, password) VALUES ($1, $2, $3) RETURNING id, email, full_name',
        [email, email.split('@')[0], crypto.randomBytes(32).toString('hex')]
      );
      user = newUserResult.rows[0];
      isNewUser = true;

      // Enviar email de boas-vindas (não para bypass)
      if (!isBypass) {
        await sendWelcomeEmail(email, user.full_name);
      }
    } else {
      user = userResult.rows[0];
    }

    // Se for email de bypass, retornar token JWT diretamente
    if (isBypass) {
      const jwtToken = generateToken(user);

      // Registrar sessão
      await createSession(user.id, jwtToken, req.ip, req.headers['user-agent']);

      console.log(`🔓 Bypass auth para email de teste: ${email}`);

      return res.json({
        success: true,
        message: 'Development bypass - authenticated directly',
        isNewUser,
        bypass: true,
        user,
        token: jwtToken,
      });
    }

    // Fluxo normal - Gerar token passwordless
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    await query(
      'INSERT INTO passwordless_tokens (email, token, expires_at, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5)',
      [email, token, expiresAt, req.ip, req.headers['user-agent']]
    );

    // Enviar email com magic link
    await sendPasswordlessEmail(email, token);

    res.json({
      success: true,
      message: 'Email sent successfully',
      isNewUser,
    });
  } catch (error) {
    console.error('Passwordless request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/passwordless/verify
 * Verificar token passwordless e fazer login
 */
router.post('/passwordless/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Buscar token
    const tokenResult = await query(
      'SELECT * FROM passwordless_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const passwordlessToken = tokenResult.rows[0];

    // Buscar usuário
    const userResult = await query(
      'SELECT id, email, full_name, created_at FROM users WHERE email = $1',
      [passwordlessToken.email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Marcar token como usado
    await query(
      'UPDATE passwordless_tokens SET used = TRUE WHERE id = $1',
      [passwordlessToken.id]
    );

    // Gerar JWT
    const jwtToken = generateToken(user);

    // Registrar sessão
    await createSession(user.id, jwtToken, req.ip, req.headers['user-agent']);

    res.json({
      user,
      token: jwtToken,
    });
  } catch (error) {
    console.error('Passwordless verify error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/me
 * Obter dados do usuário autenticado
 */
router.get('/me', authMiddleware, async (req, res) => {
  console.log('📥 GET /me chamado');
  res.json({ user: req.user });
});

/**
 * GET /api/auth/passwordless/request (debug)
 */
router.get('/passwordless/request', (req, res) => {
  console.log('📥 GET /passwordless/request chamado');
  res.json({ message: 'Use POST para solicitar login' });
});

/**
 * POST /api/auth/logout
 * Fazer logout (encerrar sessão)
 */
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // Encerrar sessão
    await endSession(req.token);
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
