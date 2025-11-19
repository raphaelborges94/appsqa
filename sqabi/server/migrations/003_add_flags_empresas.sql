-- =====================================================
-- Migração: Adicionar flags à tabela empresas
-- Sistema: SQA BI - Flags de tipo de empresa
-- Data: 2025-11-15
-- =====================================================

-- Adicionar colunas de flags
ALTER TABLE empresas
ADD COLUMN IF NOT EXISTS is_grupo_empresarial BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_matriz BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_filial BOOLEAN DEFAULT false;

-- Adicionar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_empresas_is_grupo_empresarial ON empresas(is_grupo_empresarial) WHERE is_grupo_empresarial = true;
CREATE INDEX IF NOT EXISTS idx_empresas_is_matriz ON empresas(is_matriz) WHERE is_matriz = true;
CREATE INDEX IF NOT EXISTS idx_empresas_is_filial ON empresas(is_filial) WHERE is_filial = true;

-- Comentários descritivos
COMMENT ON COLUMN empresas.is_grupo_empresarial IS 'Indica se o registro é um grupo empresarial';
COMMENT ON COLUMN empresas.is_matriz IS 'Indica se a empresa é uma matriz';
COMMENT ON COLUMN empresas.is_filial IS 'Indica se a empresa é uma filial';

-- Adicionar constraint para garantir que um registro de grupo empresarial não seja matriz ou filial
ALTER TABLE empresas
ADD CONSTRAINT chk_tipo_empresa CHECK (
  NOT (is_grupo_empresarial = true AND (is_matriz = true OR is_filial = true))
);

-- Mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE 'Flags adicionadas à tabela empresas com sucesso!';
END $$;
