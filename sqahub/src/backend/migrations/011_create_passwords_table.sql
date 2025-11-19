-- Migration: Criar tabela de gestão de senhas
-- Data: 2025-11-17
-- SEGURANÇA: Senhas armazenadas com criptografia AES-256

-- Habilitar extensão pgcrypto para criptografia
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Criar tabela de senhas (passwords_vault)
CREATE TABLE IF NOT EXISTS passwords_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao VARCHAR(255) NOT NULL,
  grupo_empresa_id INTEGER REFERENCES sqausugru(id) ON DELETE CASCADE,
  url TEXT,
  usuario VARCHAR(255),
  senha_encrypted BYTEA NOT NULL, -- Senha criptografada com AES-256
  observacoes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_passwords_vault_grupo ON passwords_vault(grupo_empresa_id);
CREATE INDEX IF NOT EXISTS idx_passwords_vault_descricao ON passwords_vault(descricao);
CREATE INDEX IF NOT EXISTS idx_passwords_vault_created_by ON passwords_vault(created_by);

-- Comentários
COMMENT ON TABLE passwords_vault IS 'Cofre de senhas da empresa - senhas criptografadas com AES-256';
COMMENT ON COLUMN passwords_vault.descricao IS 'Descrição/nome do acesso';
COMMENT ON COLUMN passwords_vault.grupo_empresa_id IS 'FK para grupo de empresas';
COMMENT ON COLUMN passwords_vault.url IS 'URL do sistema/site';
COMMENT ON COLUMN passwords_vault.usuario IS 'Nome de usuário/login';
COMMENT ON COLUMN passwords_vault.senha_encrypted IS 'Senha criptografada com AES-256-CBC';
COMMENT ON COLUMN passwords_vault.observacoes IS 'Observações adicionais sobre o acesso';
COMMENT ON COLUMN passwords_vault.created_by IS 'Usuário que criou o registro';
COMMENT ON COLUMN passwords_vault.updated_by IS 'Último usuário que atualizou';

-- Função para criptografar senha (usada pelo backend)
-- A chave de criptografia será gerenciada pelo backend via variável de ambiente
CREATE OR REPLACE FUNCTION encrypt_password(senha TEXT, chave TEXT)
RETURNS BYTEA AS $$
BEGIN
  RETURN pgp_sym_encrypt(senha, chave);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para descriptografar senha (usada pelo backend)
CREATE OR REPLACE FUNCTION decrypt_password(senha_encrypted BYTEA, chave TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(senha_encrypted, chave);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_passwords_vault_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_passwords_vault_timestamp
BEFORE UPDATE ON passwords_vault
FOR EACH ROW
EXECUTE FUNCTION update_passwords_vault_timestamp();

-- Log de auditoria para acesso às senhas
CREATE TABLE IF NOT EXISTS passwords_vault_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  password_id UUID REFERENCES passwords_vault(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL, -- 'view', 'create', 'update', 'delete'
  ip_address VARCHAR(45),
  user_agent TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_passwords_audit_password ON passwords_vault_audit(password_id);
CREATE INDEX IF NOT EXISTS idx_passwords_audit_user ON passwords_vault_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_passwords_audit_timestamp ON passwords_vault_audit(timestamp);

COMMENT ON TABLE passwords_vault_audit IS 'Log de auditoria de acesso ao cofre de senhas';
