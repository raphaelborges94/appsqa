/**
 * SSO Routes - Single Sign-On entre microserviços
 *
 * Rotas para autenticação SSO entre SQAHUB e outros serviços do ecossistema SQA
 * Implementação profissional de SaaS Microservices com tokens JWT temporários
 *
 * @module routes/sso
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { authMiddleware } from '../auth.js';

const router = express.Router();

// Configurações de segurança SSO
const SSO_TOKEN_EXPIRY = 5 * 60; // 5 minutos em segundos
const SSO_SECRET = process.env.SSO_SECRET || process.env.JWT_SECRET;

// Serviços permitidos no ecossistema
const ALLOWED_SERVICES = ['sqa-bi', 'sqa-finance', 'sqa-crm', 'sqa-hr'];

/**
 * POST /api/sso/generate-token
 * Gera um token SSO temporário para autenticação em outro serviço
 *
 * @auth Requer autenticação (authMiddleware)
 * @body {string} service - Nome do serviço de destino (ex: 'sqa-bi')
 * @returns {object} Token SSO e URL de redirecionamento
 */
router.post('/generate-token', authMiddleware, async (req, res) => {
  try {
    const { service } = req.body;
    const userId = req.user.id;

    // Validação do serviço
    if (!service) {
      return res.status(400).json({
        success: false,
        error: 'Service name is required',
        message: 'O nome do serviço é obrigatório'
      });
    }

    if (!ALLOWED_SERVICES.includes(service)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid service',
        message: `Serviço '${service}' não é permitido. Serviços válidos: ${ALLOWED_SERVICES.join(', ')}`
      });
    }

    // Buscar dados completos do usuário
    const userResult = await pool.query(
      'SELECT id, email, full_name, role, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'Usuário não encontrado'
      });
    }

    const user = userResult.rows[0];

    // Gerar token JWT SSO com claims específicos
    const expiresAt = new Date(Date.now() + SSO_TOKEN_EXPIRY * 1000);
    const ssoPayload = {
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      service: service,
      type: 'sso',
      iss: 'sqahub', // Issuer
      aud: service,  // Audience
      exp: Math.floor(expiresAt.getTime() / 1000),
      iat: Math.floor(Date.now() / 1000),
      jti: `sso-${Date.now()}-${Math.random().toString(36).substring(2, 15)}` // JWT ID único
    };

    const ssoToken = jwt.sign(ssoPayload, SSO_SECRET);

    // Capturar informações de contexto
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    // Armazenar token no banco de dados
    const insertResult = await pool.query(
      `INSERT INTO sso_tokens
       (user_id, token, service, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, created_at`,
      [userId, ssoToken, service, ipAddress, userAgent, expiresAt]
    );

    const tokenRecord = insertResult.rows[0];

    // Log de auditoria
    console.log(`[SSO] Token gerado para usuário ${user.email} (${userId}) -> ${service}`);

    // Construir URL de redirecionamento baseado no serviço
    const serviceUrls = {
      'sqa-bi': process.env.SQA_BI_URL || 'http://localhost:5173',
      'sqa-finance': process.env.SQA_FINANCE_URL || 'http://localhost:5175',
      'sqa-crm': process.env.SQA_CRM_URL || 'http://localhost:5176',
      'sqa-hr': process.env.SQA_HR_URL || 'http://localhost:5177',
    };

    const redirectUrl = `${serviceUrls[service]}/sso/callback?token=${ssoToken}`;

    return res.status(200).json({
      success: true,
      data: {
        token: ssoToken,
        tokenId: tokenRecord.id,
        expiresAt: expiresAt.toISOString(),
        expiresIn: SSO_TOKEN_EXPIRY,
        service: service,
        redirectUrl: redirectUrl,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role
        }
      },
      message: 'Token SSO gerado com sucesso'
    });

  } catch (error) {
    console.error('[SSO] Erro ao gerar token:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Erro ao gerar token SSO. Tente novamente.'
    });
  }
});

/**
 * POST /api/sso/validate-token
 * Valida um token SSO e retorna os dados do usuário
 *
 * @auth Não requer autenticação (validação pelo próprio token)
 * @body {string} token - Token SSO a ser validado
 * @body {string} service - Nome do serviço solicitante
 * @returns {object} Dados do usuário autenticado
 */
router.post('/validate-token', async (req, res) => {
  try {
    const { token, service } = req.body;

    // Validações básicas
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required',
        message: 'Token é obrigatório'
      });
    }

    if (!service) {
      return res.status(400).json({
        success: false,
        error: 'Service name is required',
        message: 'Nome do serviço é obrigatório'
      });
    }

    // Buscar token no banco de dados
    const tokenResult = await pool.query(
      `SELECT * FROM sso_tokens
       WHERE token = $1 AND service = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [token, service]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Token inválido ou não encontrado'
      });
    }

    const tokenRecord = tokenResult.rows[0];

    // Verificar se já foi usado (one-time use)
    if (tokenRecord.used) {
      console.warn(`[SSO] Tentativa de reutilização de token: ${tokenRecord.id}`);
      return res.status(401).json({
        success: false,
        error: 'Token already used',
        message: 'Este token já foi utilizado. Solicite um novo.'
      });
    }

    // Verificar expiração
    const now = new Date();
    const expiresAt = new Date(tokenRecord.expires_at);

    if (now > expiresAt) {
      console.warn(`[SSO] Token expirado: ${tokenRecord.id}`);
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'Token expirado. Solicite um novo.'
      });
    }

    // Verificar JWT
    let decoded;
    try {
      decoded = jwt.verify(token, SSO_SECRET);
    } catch (jwtError) {
      console.error('[SSO] Erro na verificação JWT:', jwtError);
      return res.status(401).json({
        success: false,
        error: 'Invalid JWT',
        message: 'Token JWT inválido'
      });
    }

    // Verificar claims do JWT
    if (decoded.service !== service) {
      return res.status(401).json({
        success: false,
        error: 'Service mismatch',
        message: 'Token não é válido para este serviço'
      });
    }

    if (decoded.type !== 'sso') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type',
        message: 'Tipo de token inválido'
      });
    }

    // Buscar dados atualizados do usuário
    const userResult = await pool.query(
      'SELECT id, email, full_name, role, created_at, last_login FROM users WHERE id = $1',
      [tokenRecord.user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'Usuário não encontrado'
      });
    }

    const user = userResult.rows[0];

    // Marcar token como usado
    await pool.query(
      'UPDATE sso_tokens SET used = TRUE, used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [tokenRecord.id]
    );

    // Log de auditoria
    console.log(`[SSO] Token validado com sucesso: ${user.email} (${user.id}) -> ${service}`);

    // Retornar dados do usuário autenticado
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          createdAt: user.created_at,
          lastLogin: user.last_login
        },
        service: service,
        tokenId: tokenRecord.id,
        validatedAt: new Date().toISOString()
      },
      message: 'Token SSO validado com sucesso'
    });

  } catch (error) {
    console.error('[SSO] Erro ao validar token:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Erro ao validar token SSO. Tente novamente.'
    });
  }
});

/**
 * DELETE /api/sso/revoke-token/:tokenId
 * Revoga um token SSO específico
 *
 * @auth Requer autenticação (authMiddleware)
 * @param {string} tokenId - ID do token a ser revogado
 * @returns {object} Confirmação de revogação
 */
router.delete('/revoke-token/:tokenId', authMiddleware, async (req, res) => {
  try {
    const { tokenId } = req.params;
    const userId = req.user.id;

    // Apenas o próprio usuário ou admin pode revogar tokens
    const tokenResult = await pool.query(
      'SELECT user_id FROM sso_tokens WHERE id = $1',
      [tokenId]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Token not found',
        message: 'Token não encontrado'
      });
    }

    const tokenOwnerId = tokenResult.rows[0].user_id;
    const isAdmin = req.user.role === 'admin';

    if (tokenOwnerId !== userId && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Você não tem permissão para revogar este token'
      });
    }

    // Marcar como usado (revogado)
    await pool.query(
      'UPDATE sso_tokens SET used = TRUE, used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [tokenId]
    );

    console.log(`[SSO] Token revogado: ${tokenId} por usuário ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'Token SSO revogado com sucesso'
    });

  } catch (error) {
    console.error('[SSO] Erro ao revogar token:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Erro ao revogar token SSO'
    });
  }
});

/**
 * GET /api/sso/active-tokens
 * Lista tokens SSO ativos do usuário autenticado
 *
 * @auth Requer autenticação (authMiddleware)
 * @returns {array} Lista de tokens SSO ativos
 */
router.get('/active-tokens', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const tokensResult = await pool.query(
      `SELECT id, service, ip_address, user_agent, expires_at, used, created_at
       FROM sso_tokens
       WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP
       ORDER BY created_at DESC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: {
        tokens: tokensResult.rows,
        count: tokensResult.rows.length
      }
    });

  } catch (error) {
    console.error('[SSO] Erro ao listar tokens ativos:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Erro ao listar tokens SSO'
    });
  }
});

export default router;
