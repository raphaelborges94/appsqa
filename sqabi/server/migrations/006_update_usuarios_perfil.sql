-- =====================================================
-- Migração: Alterar campo funcao para perfil na tabela usuarios
-- Sistema: SQA BI - Perfis de usuário
-- Data: 2025-11-15
-- =====================================================

-- Remover coluna funcao
ALTER TABLE usuarios
DROP COLUMN IF EXISTS funcao;

-- Adicionar coluna perfil com tipo ENUM
DO $$
BEGIN
    -- Criar tipo ENUM se não existir
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'perfil_usuario') THEN
        CREATE TYPE perfil_usuario AS ENUM ('Master', 'Administrador', 'Construtor', 'Visualizador');
    END IF;
END $$;

-- Adicionar coluna perfil
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS perfil perfil_usuario DEFAULT 'Visualizador';

-- Criar índice para perfil
CREATE INDEX IF NOT EXISTS idx_usuarios_perfil ON usuarios(perfil);

-- Comentário descritivo
COMMENT ON COLUMN usuarios.perfil IS 'Perfil de acesso do usuário (Master, Administrador, Construtor, Visualizador)';

-- Atualizar usuário admin existente para Master
UPDATE usuarios
SET perfil = 'Master'
WHERE email = 'admin@sqabi.com';

-- Mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE 'Campo perfil adicionado à tabela usuarios com sucesso!';
END $$;
