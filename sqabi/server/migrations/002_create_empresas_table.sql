-- =====================================================
-- Migração: Criação da tabela empresas
-- Sistema: SQA BI - Cadastro de Empresas
-- Data: 2025-11-15
-- =====================================================

-- Criar tabela de empresas
CREATE TABLE IF NOT EXISTS empresas (
    -- Identificador único (código da empresa)
    codemp SERIAL PRIMARY KEY,

    -- Informações básicas
    nomeempresa VARCHAR(255) NOT NULL,
    numdoc VARCHAR(18) NOT NULL,
    grupoemp VARCHAR(100),
    obs TEXT,

    -- Auditoria
    created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_empresas_nomeempresa ON empresas(nomeempresa);
CREATE INDEX IF NOT EXISTS idx_empresas_numdoc ON empresas(numdoc);
CREATE INDEX IF NOT EXISTS idx_empresas_grupoemp ON empresas(grupoemp);
CREATE INDEX IF NOT EXISTS idx_empresas_created_date ON empresas(created_date DESC);

-- Comentários descritivos
COMMENT ON TABLE empresas IS 'Tabela de cadastro de empresas do sistema SQA BI';
COMMENT ON COLUMN empresas.codemp IS 'Código sequencial da empresa (PK)';
COMMENT ON COLUMN empresas.nomeempresa IS 'Nome da empresa';
COMMENT ON COLUMN empresas.numdoc IS 'CNPJ da empresa (com máscara XX.XXX.XXX/XXXX-XX)';
COMMENT ON COLUMN empresas.grupoemp IS 'Grupo empresarial ao qual a empresa pertence';
COMMENT ON COLUMN empresas.obs IS 'Observações e anotações sobre a empresa';
COMMENT ON COLUMN empresas.created_date IS 'Data/hora de criação do registro';
COMMENT ON COLUMN empresas.updated_date IS 'Data/hora da última atualização';
COMMENT ON COLUMN empresas.created_by IS 'ID do usuário que criou o registro';
COMMENT ON COLUMN empresas.updated_by IS 'ID do usuário que atualizou o registro';

-- Função para atualizar automaticamente updated_date
CREATE OR REPLACE FUNCTION update_empresas_updated_date()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_date = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_date automaticamente
DROP TRIGGER IF EXISTS trigger_update_empresas_updated_date ON empresas;
CREATE TRIGGER trigger_update_empresas_updated_date
    BEFORE UPDATE ON empresas
    FOR EACH ROW
    EXECUTE FUNCTION update_empresas_updated_date();

-- Mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE 'Tabela empresas criada com sucesso!';
END $$;
