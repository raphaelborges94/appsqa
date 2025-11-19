-- ===== OAuth2 / OpenID Connect Migration =====
-- Created: 2025-11-15
-- Description: Adiciona suporte completo para OAuth2 + OIDC

-- OAuth2 Clients (Aplicações que podem se conectar via OAuth)
CREATE TABLE IF NOT EXISTS oauth_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id VARCHAR(255) UNIQUE NOT NULL,
  client_secret VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  redirect_uris TEXT[] NOT NULL,
  allowed_grants VARCHAR(100)[] DEFAULT ARRAY['authorization_code', 'refresh_token'],
  allowed_scopes VARCHAR(100)[] DEFAULT ARRAY['openid', 'profile', 'email'],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_oauth_clients_client_id ON oauth_clients(client_id);

-- Authorization Codes (códigos temporários para troca por tokens)
CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(255) UNIQUE NOT NULL,
  client_id UUID REFERENCES oauth_clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  scopes VARCHAR(100)[] DEFAULT ARRAY['openid', 'profile', 'email'],
  code_challenge VARCHAR(255),
  code_challenge_method VARCHAR(10),
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_oauth_codes_code ON oauth_authorization_codes(code);
CREATE INDEX IF NOT EXISTS idx_oauth_codes_user_id ON oauth_authorization_codes(user_id);

-- Access Tokens (tokens de acesso)
CREATE TABLE IF NOT EXISTS oauth_access_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token VARCHAR(500) UNIQUE NOT NULL,
  client_id UUID REFERENCES oauth_clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  scopes VARCHAR(100)[] DEFAULT ARRAY['openid', 'profile', 'email'],
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_oauth_tokens_token ON oauth_access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_access_tokens(user_id);

-- Refresh Tokens (tokens para renovar access tokens)
CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token VARCHAR(500) UNIQUE NOT NULL,
  access_token_id UUID REFERENCES oauth_access_tokens(id) ON DELETE CASCADE,
  client_id UUID REFERENCES oauth_clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_oauth_refresh_tokens_token ON oauth_refresh_tokens(token);

-- Passwordless Login Tokens (magic links)
CREATE TABLE IF NOT EXISTS passwordless_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_passwordless_tokens_email ON passwordless_tokens(email);
CREATE INDEX IF NOT EXISTS idx_passwordless_tokens_token ON passwordless_tokens(token);

-- OAuth Consent (consentimento do usuário para aplicações)
CREATE TABLE IF NOT EXISTS oauth_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES oauth_clients(id) ON DELETE CASCADE,
  scopes VARCHAR(100)[] DEFAULT ARRAY['openid', 'profile', 'email'],
  granted BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_consents_user_client ON oauth_consents(user_id, client_id);

-- Trigger para updated_at em oauth_clients
CREATE TRIGGER update_oauth_clients_updated_at BEFORE UPDATE ON oauth_clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_consents_updated_at BEFORE UPDATE ON oauth_consents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir cliente OAuth padrão para o BI
INSERT INTO oauth_clients (client_id, client_secret, name, description, redirect_uris, allowed_scopes)
VALUES (
  'sqa-bi-client',
  '$2b$10$xyz...', -- Gerar com bcrypt
  'SQA BI',
  'Sistema de Business Intelligence',
  ARRAY['http://localhost:5000/auth/callback', 'http://localhost:5000/callback'],
  ARRAY['openid', 'profile', 'email', 'bi.read', 'bi.write']
) ON CONFLICT (client_id) DO NOTHING;

-- Limpeza automática de tokens expirados (function)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_authorization_codes WHERE expires_at < NOW();
  DELETE FROM oauth_access_tokens WHERE expires_at < NOW() AND revoked = FALSE;
  DELETE FROM oauth_refresh_tokens WHERE expires_at < NOW() AND revoked = FALSE;
  DELETE FROM passwordless_tokens WHERE expires_at < NOW() AND used = FALSE;
END;
$$ LANGUAGE plpgsql;
