-- Migration: Criar tabela de sessões de usuários
-- Data: 2025-11-17

-- Criar tabela de sessões
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  login_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  last_activity TIMESTAMP NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  logout_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Comentários nas colunas
COMMENT ON TABLE user_sessions IS 'Tabela de controle de sessões de usuários';
COMMENT ON COLUMN user_sessions.user_id IS 'ID do usuário proprietário da sessão';
COMMENT ON COLUMN user_sessions.token IS 'Token JWT da sessão';
COMMENT ON COLUMN user_sessions.ip_address IS 'Endereço IP do cliente';
COMMENT ON COLUMN user_sessions.user_agent IS 'User-Agent do navegador';
COMMENT ON COLUMN user_sessions.login_at IS 'Data/hora do login';
COMMENT ON COLUMN user_sessions.expires_at IS 'Data/hora de expiração do token';
COMMENT ON COLUMN user_sessions.last_activity IS 'Data/hora da última atividade';
COMMENT ON COLUMN user_sessions.is_active IS 'Indica se a sessão está ativa';
COMMENT ON COLUMN user_sessions.logout_at IS 'Data/hora do logout (se aplicável)';
