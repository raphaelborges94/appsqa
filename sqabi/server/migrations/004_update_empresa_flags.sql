-- =====================================================
-- Migração: Atualizar flags da tabela empresas
-- Sistema: SQA BI - Simplificar tipos de empresa
-- Data: 2025-11-15
-- =====================================================

-- Remover constraint antiga
ALTER TABLE empresas
DROP CONSTRAINT IF EXISTS chk_tipo_empresa;

-- Remover colunas antigas de matriz e filial
ALTER TABLE empresas
DROP COLUMN IF EXISTS is_matriz,
DROP COLUMN IF EXISTS is_filial;

-- Adicionar nova coluna is_empresa (se não existir)
ALTER TABLE empresas
ADD COLUMN IF NOT EXISTS is_empresa BOOLEAN DEFAULT false;

-- Atualizar índices (remover antigos)
DROP INDEX IF EXISTS idx_empresas_is_matriz;
DROP INDEX IF EXISTS idx_empresas_is_filial;

-- Criar índice para is_empresa
CREATE INDEX IF NOT EXISTS idx_empresas_is_empresa ON empresas(is_empresa) WHERE is_empresa = true;

-- Comentários descritivos
COMMENT ON COLUMN empresas.is_grupo_empresarial IS 'Indica se o registro é um grupo empresarial';
COMMENT ON COLUMN empresas.is_empresa IS 'Indica se o registro é uma empresa';

-- Adicionar constraint para garantir que apenas um tipo seja selecionado
ALTER TABLE empresas
ADD CONSTRAINT chk_tipo_empresa_novo CHECK (
  NOT (is_grupo_empresarial = true AND is_empresa = true)
);

-- Mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE 'Flags da tabela empresas atualizadas com sucesso!';
END $$;
