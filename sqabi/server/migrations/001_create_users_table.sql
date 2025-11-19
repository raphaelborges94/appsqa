-- =====================================================
-- Migração: Criação da tabela users
-- Sistema: SQA BI - Autenticação Passwordless
-- Data: 2025-11-15
-- =====================================================

-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    -- Identificador único
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Informações básicas
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    role VARCHAR(100) DEFAULT 'Usuário',

    -- Status e controle de acesso
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,

    -- Campos para autenticação passwordless
    magic_link_token VARCHAR(500),
    magic_link_expires_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,

    -- Auditoria
    created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,

    -- Metadados adicionais (JSON flexível)
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_date ON users(created_date DESC);
CREATE INDEX IF NOT EXISTS idx_users_magic_link_token ON users(magic_link_token) WHERE magic_link_token IS NOT NULL;

-- Comentários descritivos
COMMENT ON TABLE users IS 'Tabela de usuários do sistema SQA BI com suporte a autenticação passwordless';
COMMENT ON COLUMN users.id IS 'Identificador único do usuário (UUID)';
COMMENT ON COLUMN users.email IS 'Email do usuário - usado para autenticação passwordless';
COMMENT ON COLUMN users.phone IS 'Telefone de contato do usuário';
COMMENT ON COLUMN users.role IS 'Função/cargo do usuário no sistema';
COMMENT ON COLUMN users.is_active IS 'Indica se o usuário pode acessar o sistema';
COMMENT ON COLUMN users.is_verified IS 'Indica se o email foi verificado';
COMMENT ON COLUMN users.magic_link_token IS 'Token hash para autenticação via link mágico';
COMMENT ON COLUMN users.magic_link_expires_at IS 'Data/hora de expiração do link mágico';
COMMENT ON COLUMN users.last_login_at IS 'Data/hora do último login';
COMMENT ON COLUMN users.login_count IS 'Contador de logins realizados';
COMMENT ON COLUMN users.metadata IS 'Metadados adicionais em formato JSON';

-- Função para atualizar automaticamente updated_date
CREATE OR REPLACE FUNCTION update_users_updated_date()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_date = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_date automaticamente
DROP TRIGGER IF EXISTS trigger_update_users_updated_date ON users;
CREATE TRIGGER trigger_update_users_updated_date
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_date();

-- Inserir usuário administrador padrão (opcional)
INSERT INTO users (name, email, role, is_active, is_verified)
VALUES ('Administrador', 'admin@sqabi.com', 'Administrador', true, true)
ON CONFLICT (email) DO NOTHING;

-- Mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE 'Tabela users criada com sucesso!';
END $$;
