import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { query } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
const OAUTH_ISSUER = process.env.OAUTH_ISSUER || 'http://localhost:4001';

/**
 * Gerar código de autorização
 */
export const generateAuthorizationCode = async (clientId, userId, redirectUri, scopes, codeChallenge = null, codeChallengeMethod = null) => {
  const code = crypto.randomBytes(32).toString('hex');
  const expiresIn = parseInt(process.env.OAUTH_AUTHORIZATION_CODE_EXPIRES_IN || '600');
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  await query(
    `INSERT INTO oauth_authorization_codes
    (code, client_id, user_id, redirect_uri, scopes, code_challenge, code_challenge_method, expires_at)
    VALUES ($1, (SELECT id FROM oauth_clients WHERE client_id = $2), $3, $4, $5, $6, $7, $8)`,
    [code, clientId, userId, redirectUri, scopes, codeChallenge, codeChallengeMethod, expiresAt]
  );

  return code;
};

/**
 * Validar código de autorização
 */
export const validateAuthorizationCode = async (code, clientId, redirectUri, codeVerifier = null) => {
  const result = await query(
    `SELECT ac.*, c.client_id, c.client_secret
     FROM oauth_authorization_codes ac
     JOIN oauth_clients c ON ac.client_id = c.id
     WHERE ac.code = $1 AND c.client_id = $2 AND ac.redirect_uri = $3
     AND ac.used = FALSE AND ac.expires_at > NOW()`,
    [code, clientId, redirectUri]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid or expired authorization code');
  }

  const authCode = result.rows[0];

  // Verificar PKCE se foi usado
  if (authCode.code_challenge) {
    if (!codeVerifier) {
      throw new Error('Code verifier required');
    }

    const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    if (hash !== authCode.code_challenge) {
      throw new Error('Invalid code verifier');
    }
  }

  // Marcar código como usado
  await query('UPDATE oauth_authorization_codes SET used = TRUE WHERE code = $1', [code]);

  return authCode;
};

/**
 * Gerar Access Token
 */
export const generateAccessToken = async (clientId, userId, scopes) => {
  const token = jwt.sign(
    {
      sub: userId,
      client_id: clientId,
      scope: scopes.join(' '),
      iss: OAUTH_ISSUER,
      aud: clientId,
    },
    JWT_SECRET,
    { expiresIn: process.env.OAUTH_ACCESS_TOKEN_EXPIRES_IN || '3600s' }
  );

  const expiresIn = parseInt(process.env.OAUTH_ACCESS_TOKEN_EXPIRES_IN || '3600');
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  const result = await query(
    `INSERT INTO oauth_access_tokens
    (token, client_id, user_id, scopes, expires_at)
    VALUES ($1, (SELECT id FROM oauth_clients WHERE client_id = $2), $3, $4, $5)
    RETURNING id`,
    [token, clientId, userId, scopes, expiresAt]
  );

  return { token, tokenId: result.rows[0].id, expiresIn };
};

/**
 * Gerar Refresh Token
 */
export const generateRefreshToken = async (accessTokenId, clientId, userId) => {
  const token = crypto.randomBytes(64).toString('hex');
  const expiresIn = parseInt(process.env.OAUTH_REFRESH_TOKEN_EXPIRES_IN || '2592000');
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  await query(
    `INSERT INTO oauth_refresh_tokens
    (token, access_token_id, client_id, user_id, expires_at)
    VALUES ($1, $2, (SELECT id FROM oauth_clients WHERE client_id = $3), $4, $5)`,
    [token, accessTokenId, clientId, userId, expiresAt]
  );

  return token;
};

/**
 * Validar Access Token
 */
export const validateAccessToken = async (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verificar se token não foi revogado
    const result = await query(
      'SELECT * FROM oauth_access_tokens WHERE token = $1 AND revoked = FALSE AND expires_at > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      throw new Error('Token revoked or expired');
    }

    return decoded;
  } catch (error) {
    throw new Error('Invalid access token');
  }
};

/**
 * Renovar Access Token usando Refresh Token
 */
export const refreshAccessToken = async (refreshToken, clientId) => {
  const result = await query(
    `SELECT rt.*, c.client_id
     FROM oauth_refresh_tokens rt
     JOIN oauth_clients c ON rt.client_id = c.id
     WHERE rt.token = $1 AND c.client_id = $2
     AND rt.revoked = FALSE AND rt.expires_at > NOW()`,
    [refreshToken, clientId]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid or expired refresh token');
  }

  const refresh = result.rows[0];

  // Revogar access token antigo
  await query(
    'UPDATE oauth_access_tokens SET revoked = TRUE WHERE id = $1',
    [refresh.access_token_id]
  );

  // Gerar novo access token
  const { token, tokenId, expiresIn } = await generateAccessToken(
    clientId,
    refresh.user_id,
    ['openid', 'profile', 'email']
  );

  return { access_token: token, expires_in: expiresIn, token_type: 'Bearer' };
};

/**
 * Gerar ID Token (OpenID Connect)
 */
export const generateIdToken = async (userId, clientId, nonce = null) => {
  const userResult = await query(
    'SELECT id, email, full_name, created_at FROM users WHERE id = $1',
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new Error('User not found');
  }

  const user = userResult.rows[0];

  const payload = {
    iss: OAUTH_ISSUER,
    sub: user.id,
    aud: clientId,
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    email: user.email,
    name: user.name,
    email_verified: true,
  };

  if (nonce) {
    payload.nonce = nonce;
  }

  return jwt.sign(payload, JWT_SECRET);
};

/**
 * Validar client credentials
 */
export const validateClient = async (clientId, clientSecret) => {
  const result = await query(
    'SELECT * FROM oauth_clients WHERE client_id = $1 AND client_secret = $2 AND is_active = TRUE',
    [clientId, clientSecret]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
};

/**
 * Verificar consentimento do usuário
 */
export const checkUserConsent = async (userId, clientId, scopes) => {
  const result = await query(
    `SELECT * FROM oauth_consents
     WHERE user_id = $1 AND client_id = (SELECT id FROM oauth_clients WHERE client_id = $2)
     AND granted = TRUE`,
    [userId, clientId]
  );

  if (result.rows.length === 0) {
    return false;
  }

  const consent = result.rows[0];
  // Verificar se todos os scopes solicitados foram autorizados
  return scopes.every(scope => consent.scopes.includes(scope));
};

/**
 * Salvar consentimento do usuário
 */
export const saveUserConsent = async (userId, clientId, scopes, granted = true) => {
  await query(
    `INSERT INTO oauth_consents (user_id, client_id, scopes, granted)
     VALUES ($1, (SELECT id FROM oauth_clients WHERE client_id = $2), $3, $4)
     ON CONFLICT (user_id, client_id)
     DO UPDATE SET scopes = $3, granted = $4, updated_at = NOW()`,
    [userId, clientId, scopes, granted]
  );
};

/**
 * Revogar token
 */
export const revokeToken = async (token) => {
  await query(
    'UPDATE oauth_access_tokens SET revoked = TRUE WHERE token = $1',
    [token]
  );

  await query(
    'UPDATE oauth_refresh_tokens SET revoked = TRUE WHERE token = $1',
    [token]
  );
};
