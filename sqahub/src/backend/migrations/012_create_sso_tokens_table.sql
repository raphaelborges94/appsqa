-- Migration: 012_create_sso_tokens_table
-- Description: Tabela para armazenar tokens SSO temporários para autenticação entre microserviços
-- Created: 2025-11-17

-- Tabela de tokens SSO para autenticação entre SQAHUB e SQABI
CREATE TABLE IF NOT EXISTS sso_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  service VARCHAR(50) NOT NULL, -- 'sqa-bi', 'sqa-finance', etc.
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_sso_tokens_token ON sso_tokens(token);
CREATE INDEX IF NOT EXISTS idx_sso_tokens_user_id ON sso_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_sso_tokens_expires_at ON sso_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_sso_tokens_service ON sso_tokens(service);

-- Trigger para limpar tokens expirados automaticamente (executado em consultas)
CREATE OR REPLACE FUNCTION cleanup_expired_sso_tokens()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM sso_tokens WHERE expires_at < CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comentários das colunas para documentação
COMMENT ON TABLE sso_tokens IS 'Tokens SSO temporários para autenticação entre microserviços do ecossistema SQA';
COMMENT ON COLUMN sso_tokens.id IS 'Identificador único do token SSO';
COMMENT ON COLUMN sso_tokens.user_id IS 'ID do usuário autenticado no HUB';
COMMENT ON COLUMN sso_tokens.token IS 'Token JWT único e temporário';
COMMENT ON COLUMN sso_tokens.service IS 'Nome do serviço de destino (sqa-bi, sqa-finance, etc.)';
COMMENT ON COLUMN sso_tokens.ip_address IS 'Endereço IP do cliente que solicitou o token';
COMMENT ON COLUMN sso_tokens.user_agent IS 'User-Agent do navegador do cliente';
COMMENT ON COLUMN sso_tokens.expires_at IS 'Data/hora de expiração do token (padrão: 5 minutos)';
COMMENT ON COLUMN sso_tokens.used IS 'Indica se o token já foi utilizado (one-time use)';
COMMENT ON COLUMN sso_tokens.used_at IS 'Data/hora em que o token foi utilizado';
COMMENT ON COLUMN sso_tokens.created_at IS 'Data/hora de criação do token';
