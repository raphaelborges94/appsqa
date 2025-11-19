-- =====================================================
-- Migração: Adicionar campos CPF e Empresa na tabela usuarios
-- Sistema: SQA BI - Gestão de usuários
-- Data: 2025-11-15
-- =====================================================

-- Adicionar coluna CPF (obrigatória)
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS cpf VARCHAR(14) NOT NULL DEFAULT '';

-- Adicionar coluna codemp (código da empresa - FK)
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS codemp INTEGER;

-- Adicionar constraint de chave estrangeira para empresa
ALTER TABLE usuarios
ADD CONSTRAINT fk_usuarios_empresa
FOREIGN KEY (codemp) REFERENCES empresas(codemp)
ON DELETE SET NULL;

-- Criar índice para CPF (busca rápida)
CREATE INDEX IF NOT EXISTS idx_usuarios_cpf ON usuarios(cpf);

-- Criar índice para empresa
CREATE INDEX IF NOT EXISTS idx_usuarios_codemp ON usuarios(codemp);

-- Adicionar constraint de unicidade para CPF
ALTER TABLE usuarios
ADD CONSTRAINT uk_usuarios_cpf UNIQUE (cpf);

-- Comentários descritivos
COMMENT ON COLUMN usuarios.cpf IS 'CPF do usuário (formato: 000.000.000-00)';
COMMENT ON COLUMN usuarios.codemp IS 'Código da empresa do usuário (FK para empresas.codemp)';

-- Mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE 'Campos CPF e Empresa adicionados à tabela usuarios com sucesso!';
END $$;
