-- =====================================================
-- Migração: Recriar tabela users como usuarios (em português)
-- Sistema: SQA BI - Padronização em português
-- Data: 2025-11-15
-- =====================================================

-- Dropar tabela antiga (se existir)
DROP TABLE IF EXISTS users CASCADE;

-- Criar tabela de usuários em português
CREATE TABLE IF NOT EXISTS usuarios (
    -- Identificador único
    codusuario SERIAL PRIMARY KEY,

    -- Informações básicas
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    telefone VARCHAR(50),
    funcao VARCHAR(100) DEFAULT 'Usuário',

    -- Status e controle de acesso
    ativo BOOLEAN DEFAULT true,
    verificado BOOLEAN DEFAULT false,

    -- Campos para autenticação passwordless
    token_magic_link VARCHAR(500),
    expiracao_magic_link TIMESTAMP WITH TIME ZONE,
    ultimo_login TIMESTAMP WITH TIME ZONE,
    contador_logins INTEGER DEFAULT 0,

    -- Auditoria
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    criado_por INTEGER,
    atualizado_por INTEGER,

    -- Metadados adicionais (JSON flexível)
    metadados JSONB DEFAULT '{}'::jsonb
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON usuarios(ativo);
CREATE INDEX IF NOT EXISTS idx_usuarios_data_criacao ON usuarios(data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_usuarios_token_magic_link ON usuarios(token_magic_link) WHERE token_magic_link IS NOT NULL;

-- Comentários descritivos
COMMENT ON TABLE usuarios IS 'Tabela de usuários do sistema SQA BI com suporte a autenticação passwordless';
COMMENT ON COLUMN usuarios.codusuario IS 'Identificador único do usuário (sequencial)';
COMMENT ON COLUMN usuarios.nome IS 'Nome completo do usuário';
COMMENT ON COLUMN usuarios.email IS 'Email do usuário - usado para autenticação passwordless';
COMMENT ON COLUMN usuarios.telefone IS 'Telefone de contato do usuário';
COMMENT ON COLUMN usuarios.funcao IS 'Função/cargo do usuário no sistema';
COMMENT ON COLUMN usuarios.ativo IS 'Indica se o usuário pode acessar o sistema';
COMMENT ON COLUMN usuarios.verificado IS 'Indica se o email foi verificado';
COMMENT ON COLUMN usuarios.token_magic_link IS 'Token hash para autenticação via link mágico';
COMMENT ON COLUMN usuarios.expiracao_magic_link IS 'Data/hora de expiração do link mágico';
COMMENT ON COLUMN usuarios.ultimo_login IS 'Data/hora do último login';
COMMENT ON COLUMN usuarios.contador_logins IS 'Contador de logins realizados';
COMMENT ON COLUMN usuarios.metadados IS 'Metadados adicionais em formato JSON';

-- Função para atualizar automaticamente data_atualizacao
CREATE OR REPLACE FUNCTION update_usuarios_data_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar data_atualizacao automaticamente
DROP TRIGGER IF EXISTS trigger_update_usuarios_data_atualizacao ON usuarios;
CREATE TRIGGER trigger_update_usuarios_data_atualizacao
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION update_usuarios_data_atualizacao();

-- Inserir usuário administrador padrão (opcional)
INSERT INTO usuarios (nome, email, funcao, ativo, verificado)
VALUES ('Administrador', 'admin@sqabi.com', 'Administrador', true, true)
ON CONFLICT (email) DO NOTHING;

-- Mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE 'Tabela usuarios criada com sucesso em português!';
END $$;
