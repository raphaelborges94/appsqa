import express from 'express';
import { query } from '../db.js';
import { authMiddleware } from '../auth.js';
import {
  generateAuthorizationCode,
  validateAuthorizationCode,
  generateAccessToken,
  generateRefreshToken,
  generateIdToken,
  validateClient,
  checkUserConsent,
  saveUserConsent,
  refreshAccessToken,
  validateAccessToken,
  revokeToken,
} from '../oauth.js';

const router = express.Router();

/**
 * GET /oauth/authorize
 * Endpoint de autorização OAuth2 / OIDC
 */
router.get('/authorize', authMiddleware, async (req, res) => {
  try {
    const {
      client_id,
      redirect_uri,
      response_type,
      scope,
      state,
      nonce,
      code_challenge,
      code_challenge_method,
    } = req.query;

    // Validações
    if (!client_id || !redirect_uri || !response_type) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    if (response_type !== 'code') {
      return res.status(400).json({ error: 'Unsupported response_type' });
    }

    // Buscar client
    const clientResult = await query(
      'SELECT * FROM oauth_clients WHERE client_id = $1 AND is_active = TRUE',
      [client_id]
    );

    if (clientResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid client_id' });
    }

    const client = clientResult.rows[0];

    // Verificar redirect_uri
    if (!client.redirect_uris.includes(redirect_uri)) {
      return res.status(400).json({ error: 'Invalid redirect_uri' });
    }

    const scopes = scope ? scope.split(' ') : ['openid', 'profile', 'email'];

    // Verificar se usuário já autorizou este cliente
    const hasConsent = await checkUserConsent(req.user.id, client_id, scopes);

    if (!hasConsent) {
      // Redirecionar para página de consentimento
      return res.json({
        requiresConsent: true,
        client: {
          name: client.name,
          description: client.description,
        },
        scopes,
        authorizeUrl: `/oauth/consent?${new URLSearchParams({
          client_id,
          redirect_uri,
          response_type,
          scope: scopes.join(' '),
          state: state || '',
          nonce: nonce || '',
          code_challenge: code_challenge || '',
          code_challenge_method: code_challenge_method || '',
        }).toString()}`,
      });
    }

    // Gerar código de autorização
    const code = await generateAuthorizationCode(
      client_id,
      req.user.id,
      redirect_uri,
      scopes,
      code_challenge,
      code_challenge_method
    );

    // Redirecionar de volta para o cliente com o código
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.append('code', code);
    if (state) redirectUrl.searchParams.append('state', state);

    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('OAuth authorize error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /oauth/consent
 * Salvar consentimento do usuário
 */
router.post('/consent', authMiddleware, async (req, res) => {
  try {
    const {
      client_id,
      redirect_uri,
      response_type,
      scope,
      state,
      nonce,
      code_challenge,
      code_challenge_method,
      approved,
    } = req.body;

    if (!approved) {
      // Usuário negou acesso
      const redirectUrl = new URL(redirect_uri);
      redirectUrl.searchParams.append('error', 'access_denied');
      if (state) redirectUrl.searchParams.append('state', state);
      return res.json({ redirect: redirectUrl.toString() });
    }

    const scopes = scope.split(' ');

    // Salvar consentimento
    await saveUserConsent(req.user.id, client_id, scopes, true);

    // Gerar código de autorização
    const code = await generateAuthorizationCode(
      client_id,
      req.user.id,
      redirect_uri,
      scopes,
      code_challenge,
      code_challenge_method
    );

    // Redirecionar de volta para o cliente com o código
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.append('code', code);
    if (state) redirectUrl.searchParams.append('state', state);

    res.json({ redirect: redirectUrl.toString() });
  } catch (error) {
    console.error('OAuth consent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /oauth/token
 * Trocar código de autorização por tokens (Access Token + Refresh Token)
 */
router.post('/token', async (req, res) => {
  try {
    const {
      grant_type,
      code,
      redirect_uri,
      client_id,
      client_secret,
      refresh_token,
      code_verifier,
    } = req.body;

    if (!grant_type) {
      return res.status(400).json({ error: 'grant_type is required' });
    }

    // Validar client
    const client = await validateClient(client_id, client_secret);
    if (!client) {
      return res.status(401).json({ error: 'Invalid client credentials' });
    }

    if (grant_type === 'authorization_code') {
      // Trocar código por tokens
      if (!code || !redirect_uri) {
        return res.status(400).json({ error: 'code and redirect_uri are required' });
      }

      const authCode = await validateAuthorizationCode(
        code,
        client_id,
        redirect_uri,
        code_verifier
      );

      // Gerar access token
      const { token: accessToken, tokenId, expiresIn } = await generateAccessToken(
        client_id,
        authCode.user_id,
        authCode.scopes
      );

      // Gerar refresh token
      const refreshToken = await generateRefreshToken(tokenId, client_id, authCode.user_id);

      // Gerar ID token (OIDC)
      const idToken = await generateIdToken(authCode.user_id, client_id);

      res.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: expiresIn,
        refresh_token: refreshToken,
        id_token: idToken,
        scope: authCode.scopes.join(' '),
      });
    } else if (grant_type === 'refresh_token') {
      // Renovar access token
      if (!refresh_token) {
        return res.status(400).json({ error: 'refresh_token is required' });
      }

      const tokens = await refreshAccessToken(refresh_token, client_id);
      res.json(tokens);
    } else {
      res.status(400).json({ error: 'Unsupported grant_type' });
    }
  } catch (error) {
    console.error('OAuth token error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /oauth/userinfo
 * Endpoint de informações do usuário (OIDC)
 */
router.get('/userinfo', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const token = authHeader.substring(7);
    const decoded = await validateAccessToken(token);

    // Buscar informações do usuário
    const userResult = await query(
      'SELECT id, email, full_name, created_at FROM users WHERE id = $1',
      [decoded.sub]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    res.json({
      sub: user.id,
      email: user.email,
      name: user.name,
      email_verified: true,
    });
  } catch (error) {
    console.error('Userinfo error:', error);
    res.status(401).json({ error: 'Invalid access token' });
  }
});

/**
 * POST /oauth/revoke
 * Revogar token
 */
router.post('/revoke', async (req, res) => {
  try {
    const { token, client_id, client_secret } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'token is required' });
    }

    // Validar client
    const client = await validateClient(client_id, client_secret);
    if (!client) {
      return res.status(401).json({ error: 'Invalid client credentials' });
    }

    await revokeToken(token);

    res.json({ success: true });
  } catch (error) {
    console.error('Revoke error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /.well-known/openid-configuration
 * OIDC Discovery endpoint
 */
router.get('/.well-known/openid-configuration', (req, res) => {
  const issuer = process.env.OAUTH_ISSUER || 'http://localhost:8547';

  res.json({
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    userinfo_endpoint: `${issuer}/oauth/userinfo`,
    revocation_endpoint: `${issuer}/oauth/revoke`,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    response_types_supported: ['code'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['HS256'],
    scopes_supported: ['openid', 'profile', 'email', 'bi.read', 'bi.write'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
    claims_supported: ['sub', 'email', 'name', 'email_verified'],
    code_challenge_methods_supported: ['S256'],
  });
});

export default router;
