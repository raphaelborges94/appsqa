/**
 * SSO Routes - Validação de tokens SSO do SQAHUB
 *
 * Endpoint para validar tokens SSO gerados pelo SQAHUB
 * e autenticar usuários no SQABI
 *
 * @module routes/sso
 */

'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const router = express.Router();

// URL do SQAHUB para validação de tokens
const SQAHUB_API_URL = process.env.SQAHUB_API_URL || 'http://localhost:8547';

// Config do JWT próprio do BI (token de sessão do BI)
const BI_JWT_SECRET = process.env.BI_JWT_SECRET || process.env.JWT_SECRET || 'dev-change-me';
const BI_JWT_EXPIRES_IN = process.env.BI_JWT_EXPIRES_IN || '2h';
const BI_JWT_ISS = process.env.BI_JWT_ISS || 'sqa-bi';
const BI_JWT_AUD = process.env.BI_JWT_AUD || 'sqa-bi';

// --- helpers ---------------------------------------------------------------

/**
 * Converte string de expiração (ex: '6h', '2d', '30m') para milissegundos
 *
 * @param {string} expiresIn - String de expiração (ex: '6h', '2d', '30m')
 * @returns {number} Milissegundos
 */
function parseExpiration(expiresIn) {
  if (typeof expiresIn === 'number') return expiresIn;

  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 6 * 60 * 60 * 1000; // Default: 6 horas

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const units = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * (units[unit] || units.h);
}

/** Resolve um fetch utilizável (global do Node ≥18 ou fallback para node-fetch, se instalado) */
async function resolveFetch() {
  if (typeof globalThis.fetch === 'function') return globalThis.fetch;
  try {
    const mod = await import('node-fetch');
    return mod.default;
  } catch (err) {
    throw new Error(
      'Fetch API não disponível e "node-fetch" não está instalado. ' +
      'Instale com: npm i node-fetch@^3'
    );
  }
}

/** Faz fetch com timeout via AbortController */
async function fetchWithTimeout(fetchFn, url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetchFn(url, { ...options, signal: controller.signal });
    return resp;
  } finally {
    clearTimeout(id);
  }
}

/** Tenta parsear JSON; se falhar, devolve texto cru em { raw } */
async function safeJson(resp) {
  const text = await resp.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

// --- rotas -----------------------------------------------------------------

/**
 * POST /api/sso/validate
 * Valida um token SSO com o SQAHUB e retorna os dados do usuário + token do BI
 *
 * @body {string} token - Token SSO gerado pelo SQAHUB
 * @returns {object} Dados do usuário autenticado e biToken (JWT do BI)
 */
router.post('/validate', async (req, res) => {
  try {
    const { token } = req.body;

    // Validação básica
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required',
        message: 'Token SSO é obrigatório'
      });
    }

    const fetch = await resolveFetch();

    // Chama o HUB para validar o token
    const response = await fetchWithTimeout(
      fetch,
      `${SQAHUB_API_URL}/api/sso/validate-token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, service: 'sqa-bi' })
      },
      10000 // timeout 10s
    );

    const data = await safeJson(response);

    if (!response.ok || !data.success) {
      console.error('[SSO] Validação falhou:', data);
      return res.status(response.status || 401).json({
        success: false,
        error: data.error || 'Validation failed',
        message: data.message || 'Falha na validação do token SSO'
      });
    }

    // Token validado com sucesso pelo SQAHUB
    const userData = data.data && data.data.user ? data.data.user : null;
    if (!userData) {
      return res.status(500).json({
        success: false,
        error: 'Invalid HUB response',
        message: 'Resposta inesperada do SQAHUB'
      });
    }

    console.log(`[SSO] Token validado: ${userData.email} (${userData.id})`);

    // === Emite o token de sessão do BI (biToken) ===
    const biToken = jwt.sign(
      {
        sub: String(userData.id),
        email: userData.email,
        role: userData.role || 'user',
        name: userData.fullName || userData.name || userData.email
      },
      BI_JWT_SECRET,
      { expiresIn: BI_JWT_EXPIRES_IN, issuer: BI_JWT_ISS, audience: BI_JWT_AUD }
    );

    // Extrair informações da requisição
    const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Calcular expiração do token (converter BI_JWT_EXPIRES_IN para timestamp)
    const expiresInMs = parseExpiration(BI_JWT_EXPIRES_IN);
    const expiresAt = new Date(Date.now() + expiresInMs);

    // === Criar registro de sessão do BI vinculado ao Hub ===
    try {
      // Primeiro, invalidar sessões anteriores do BI para este usuário
      await query(
        `UPDATE bi_sessions
         SET is_active = FALSE,
             logout_at = NOW(),
             logout_reason = 'new_login',
             updated_at = NOW()
         WHERE user_id = $1 AND is_active = TRUE`,
        [userData.id]
      );

      // Criar nova sessão do BI
      await query(
        `INSERT INTO bi_sessions
         (user_id, bi_token, hub_user_id, ip_address, user_agent, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userData.id, biToken, userData.id, ipAddress, userAgent, expiresAt]
      );

      console.log(`[SSO] Sessão do BI criada para usuário ${userData.id}`);
    } catch (dbError) {
      console.error('[SSO] Erro ao criar sessão do BI:', dbError.message);
      // Continuar mesmo com erro no banco (degradação graceful)
    }

    // Retornar dados do usuário para o frontend
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: userData.id,
          email: userData.email,
          fullName: userData.fullName,
          role: userData.role,
          createdAt: userData.createdAt,
          lastLogin: userData.lastLogin
        },
        biToken,
        authenticatedAt: new Date().toISOString(),
        service: 'sqa-bi'
      },
      message: 'Autenticação SSO bem-sucedida'
    });

  } catch (error) {
    console.error('[SSO] Erro ao validar token:', error);

    // Erros de rede/conexão
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        error: 'Service unavailable',
        message: 'Não foi possível conectar ao SQAHUB. Verifique se o serviço está rodando.'
      });
    }
    // Abort (timeout)
    if (error.name === 'AbortError') {
      return res.status(504).json({
        success: false,
        error: 'Gateway timeout',
        message: 'Tempo esgotado ao verificar o token no SQAHUB.'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Erro ao validar token SSO. Tente novamente.'
    });
  }
});

/**
 * POST /api/sso/logout
 * Realiza logout do BI, invalidando a sessão no banco
 *
 * @returns {object} Confirmação de logout
 */
router.post('/logout', async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const match = auth.match(/^Bearer\s+(.+)$/i);
    const token = match ? match[1] : null;

    if (!token) {
      return res.status(200).json({
        success: true,
        message: 'Nenhuma sessão ativa para encerrar'
      });
    }

    // Invalidar sessão do BI
    await query(
      `UPDATE bi_sessions
       SET is_active = FALSE,
           logout_at = NOW(),
           logout_reason = 'manual',
           updated_at = NOW()
       WHERE bi_token = $1`,
      [token]
    );

    console.log('[SSO] Logout realizado via endpoint /api/sso/logout');

    return res.status(200).json({
      success: true,
      message: 'Logout realizado com sucesso'
    });

  } catch (error) {
    console.error('[SSO] Erro ao realizar logout:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Erro ao realizar logout'
    });
  }
});

/**
 * GET /api/sso/status
 * Verifica se o serviço SSO está funcionando
 *
 * @returns {object} Status do serviço SSO
 */
router.get('/status', async (req, res) => {
  try {
    const fetch = await resolveFetch();

    // Tentar conectar ao SQAHUB (com timeout curto)
    const response = await fetchWithTimeout(
      fetch,
      `${SQAHUB_API_URL}/api/health`,
      { method: 'GET' },
      5000
    );

    const hubStatus = response.ok;

    return res.status(200).json({
      success: true,
      data: {
        ssoEnabled: true,
        hubConnected: hubStatus,
        hubUrl: SQAHUB_API_URL,
        service: 'sqa-bi'
      },
      message: hubStatus ? 'SSO disponível' : 'SQAHUB não está respondendo'
    });

  } catch (error) {
    const isTimeout = error && error.name === 'AbortError';
    return res.status(200).json({
      success: true,
      data: {
        ssoEnabled: true,
        hubConnected: false,
        hubUrl: SQAHUB_API_URL,
        service: 'sqa-bi',
        error: isTimeout ? 'timeout' : (error && error.message) || 'erro'
      },
      message: 'SQAHUB não está acessível'
    });
  }
});

module.exports = router;
