-- Migration: Criar tabela de sessões do BI vinculadas ao Hub
-- Data: 2025-11-18
-- Propósito: Rastrear sessões do BI e verificar status da sessão do Hub

-- Criar tabela de sessões do BI
CREATE TABLE IF NOT EXISTS bi_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- ID do usuário (mesmo do Hub)
  bi_token TEXT NOT NULL UNIQUE, -- Token JWT do BI
  hub_user_id UUID, -- ID do usuário no Hub (para referência)
  sso_token_id UUID, -- ID do token SSO usado na autenticação inicial
  ip_address VARCHAR(45),
  user_agent TEXT,
  login_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  last_activity TIMESTAMP NOT NULL DEFAULT NOW(),
  last_hub_check TIMESTAMP, -- Última vez que verificou status no Hub
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  logout_at TIMESTAMP,
  logout_reason VARCHAR(50), -- 'manual', 'hub_logout', 'hub_inactive', 'expired', 'hub_down'
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_bi_sessions_user_id ON bi_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_bi_sessions_bi_token ON bi_sessions(bi_token);
CREATE INDEX IF NOT EXISTS idx_bi_sessions_is_active ON bi_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_bi_sessions_expires_at ON bi_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_bi_sessions_last_activity ON bi_sessions(last_activity);

-- Comentários nas colunas
COMMENT ON TABLE bi_sessions IS 'Tabela de controle de sessões do BI vinculadas às sessões do Hub';
COMMENT ON COLUMN bi_sessions.user_id IS 'ID do usuário (UUID)';
COMMENT ON COLUMN bi_sessions.bi_token IS 'Token JWT emitido pelo BI';
COMMENT ON COLUMN bi_sessions.hub_user_id IS 'ID do usuário no Hub para referência cruzada';
COMMENT ON COLUMN bi_sessions.sso_token_id IS 'ID do token SSO usado na autenticação inicial';
COMMENT ON COLUMN bi_sessions.ip_address IS 'Endereço IP do cliente';
COMMENT ON COLUMN bi_sessions.user_agent IS 'User-Agent do navegador';
COMMENT ON COLUMN bi_sessions.login_at IS 'Data/hora do login via SSO';
COMMENT ON COLUMN bi_sessions.expires_at IS 'Data/hora de expiração do biToken';
COMMENT ON COLUMN bi_sessions.last_activity IS 'Data/hora da última atividade no BI';
COMMENT ON COLUMN bi_sessions.last_hub_check IS 'Última verificação de status da sessão no Hub';
COMMENT ON COLUMN bi_sessions.is_active IS 'Indica se a sessão do BI está ativa';
COMMENT ON COLUMN bi_sessions.logout_at IS 'Data/hora do logout';
COMMENT ON COLUMN bi_sessions.logout_reason IS 'Motivo do encerramento: manual, hub_logout, hub_inactive, expired, hub_down';
