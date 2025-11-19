-- ===================================================================
-- Migration: Screen Builder System (CRUD Dinâmico + Árvores)
-- Descrição: Extensão das tabelas para construtor de telas dinâmicas
-- ===================================================================

-- Adicionar colunas necessárias na tabela screens existente
ALTER TABLE screens ADD COLUMN IF NOT EXISTS nome VARCHAR(255);
ALTER TABLE screens ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE screens ADD COLUMN IF NOT EXISTS tabela_nome VARCHAR(100);
ALTER TABLE screens ADD COLUMN IF NOT EXISTS ativa BOOLEAN DEFAULT TRUE;
ALTER TABLE screens ADD COLUMN IF NOT EXISTS icone VARCHAR(50) DEFAULT 'Database';
ALTER TABLE screens ADD COLUMN IF NOT EXISTS cor_primaria VARCHAR(20) DEFAULT '#64748B';

-- Subtelas (abas relacionadas)
ALTER TABLE screens ADD COLUMN IF NOT EXISTS is_subtable BOOLEAN DEFAULT FALSE;
ALTER TABLE screens ADD COLUMN IF NOT EXISTS parent_screen_id UUID REFERENCES screens(id) ON DELETE CASCADE;
ALTER TABLE screens ADD COLUMN IF NOT EXISTS ordem_aba INTEGER DEFAULT 0;

-- Campos para TreeScreen
ALTER TABLE screens ADD COLUMN IF NOT EXISTS campo_nome VARCHAR(100);
ALTER TABLE screens ADD COLUMN IF NOT EXISTS campo_pai VARCHAR(100);
ALTER TABLE screens ADD COLUMN IF NOT EXISTS campo_codigo VARCHAR(100);
ALTER TABLE screens ADD COLUMN IF NOT EXISTS permitir_raiz BOOLEAN DEFAULT TRUE;
ALTER TABLE screens ADD COLUMN IF NOT EXISTS nivel_maximo INTEGER DEFAULT 10;

-- Copiar valores existentes se necessário
UPDATE screens SET nome = name WHERE nome IS NULL AND name IS NOT NULL;
UPDATE screens SET descricao = description WHERE descricao IS NULL AND description IS NOT NULL;
UPDATE screens SET tabela_nome = entity_name WHERE tabela_nome IS NULL AND entity_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_screens_tabela ON screens(tabela_nome);
CREATE INDEX IF NOT EXISTS idx_screens_parent ON screens(parent_screen_id);
CREATE INDEX IF NOT EXISTS idx_screens_ativa ON screens(ativa);

-- Adicionar colunas necessárias na tabela fields existente
ALTER TABLE fields ADD COLUMN IF NOT EXISTS nome_campo VARCHAR(100);
ALTER TABLE fields ADD COLUMN IF NOT EXISTS tipo VARCHAR(50);
ALTER TABLE fields ADD COLUMN IF NOT EXISTS obrigatorio BOOLEAN DEFAULT FALSE;
ALTER TABLE fields ADD COLUMN IF NOT EXISTS somente_leitura BOOLEAN DEFAULT FALSE;
ALTER TABLE fields ADD COLUMN IF NOT EXISTS unico BOOLEAN DEFAULT FALSE;
ALTER TABLE fields ADD COLUMN IF NOT EXISTS tamanho_maximo INTEGER;
ALTER TABLE fields ADD COLUMN IF NOT EXISTS valor_padrao TEXT;

-- FK (Foreign Key)
ALTER TABLE fields ADD COLUMN IF NOT EXISTS fk_screen_id UUID REFERENCES screens(id) ON DELETE SET NULL;
ALTER TABLE fields ADD COLUMN IF NOT EXISTS fk_display_field VARCHAR(100);

-- UI
ALTER TABLE fields ADD COLUMN IF NOT EXISTS ordem INTEGER DEFAULT 0;
ALTER TABLE fields ADD COLUMN IF NOT EXISTS largura_coluna VARCHAR(20) DEFAULT '200px';
ALTER TABLE fields ADD COLUMN IF NOT EXISTS visivel_tabela BOOLEAN DEFAULT TRUE;
ALTER TABLE fields ADD COLUMN IF NOT EXISTS visivel_form BOOLEAN DEFAULT TRUE;
ALTER TABLE fields ADD COLUMN IF NOT EXISTS placeholder VARCHAR(255);
ALTER TABLE fields ADD COLUMN IF NOT EXISTS hint TEXT;

-- Copiar valores existentes
UPDATE fields SET nome_campo = name WHERE nome_campo IS NULL AND name IS NOT NULL;
UPDATE fields SET tipo = type WHERE tipo IS NULL AND type IS NOT NULL;
UPDATE fields SET obrigatorio = required WHERE obrigatorio IS NULL AND required IS NOT NULL;
UPDATE fields SET ordem = order_index WHERE ordem IS NULL AND order_index IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fields_screen ON fields(screen_id);
CREATE INDEX IF NOT EXISTS idx_fields_fk_screen ON fields(fk_screen_id);
CREATE INDEX IF NOT EXISTS idx_fields_ordem ON fields(screen_id, ordem);

-- Tabela: action_buttons (ActionButton)
-- Botões customizados com código JavaScript
CREATE TABLE IF NOT EXISTS action_buttons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,

    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    codigo_javascript TEXT NOT NULL,

    -- Parâmetros solicitados ao usuário
    parametros JSONB DEFAULT '[]', -- [{nome, tipo, label, obrigatorio}]

    -- Contexto de execução
    contexto VARCHAR(50) DEFAULT 'registro', -- registro, listagem, ambos

    -- UI
    icone VARCHAR(50) DEFAULT 'Zap',
    cor VARCHAR(20) DEFAULT '#3B82F6',
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_action_buttons_screen ON action_buttons(screen_id);
CREATE INDEX IF NOT EXISTS idx_action_buttons_ativo ON action_buttons(ativo);

-- Tabela: dynamic_data (DynamicData)
-- Armazenamento universal para todos os registros das telas dinâmicas
CREATE TABLE IF NOT EXISTS dynamic_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
    table_name VARCHAR(100) NOT NULL,

    -- Dados flexíveis em JSON
    data JSONB NOT NULL DEFAULT '{}',

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Índices para performance em queries JSONB
CREATE INDEX IF NOT EXISTS idx_dynamic_data_screen ON dynamic_data(screen_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_data_table ON dynamic_data(table_name);
CREATE INDEX IF NOT EXISTS idx_dynamic_data_gin ON dynamic_data USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_dynamic_data_created ON dynamic_data(created_at DESC);

-- Triggers já existem na migration 001_initial_schema.sql
-- Não precisamos recriar

-- Comentários para documentação
COMMENT ON TABLE screens IS 'Metadados das telas criadas dinamicamente (CRUD + Árvores)';
COMMENT ON TABLE fields IS 'Schema dos campos de cada tela dinâmica';
COMMENT ON TABLE action_buttons IS 'Botões customizados com código JavaScript executável';
COMMENT ON TABLE dynamic_data IS 'Armazenamento universal JSONB para todos os registros';

COMMENT ON COLUMN screens.is_subtable IS 'Se TRUE, renderiza como aba dentro da tela pai';
COMMENT ON COLUMN screens.campo_nome IS 'Para TreeScreen: campo exibido na árvore';
COMMENT ON COLUMN screens.campo_pai IS 'Para TreeScreen: campo FK para nó pai (self-reference)';
COMMENT ON COLUMN screens.campo_codigo IS 'Para TreeScreen: código hierárquico (ex: 1.1.2)';

COMMENT ON COLUMN fields.tipo IS 'Tipos: inteiro, texto, decimal, data, datetime, checkbox, texto_longo, imagem, anexo, fk';
COMMENT ON COLUMN fields.fk_screen_id IS 'ID da tela referenciada (para tipo=fk)';
COMMENT ON COLUMN fields.fk_display_field IS 'Campo da tela FK para exibir (ex: nome)';

COMMENT ON COLUMN action_buttons.codigo_javascript IS 'Código executado via eval() com contexto: {record, fields, user, parametros, toast, navigate, refresh, selectedRecords}';
COMMENT ON COLUMN action_buttons.parametros IS 'Array JSON de parâmetros: [{nome, tipo, label, obrigatorio}]';
COMMENT ON COLUMN action_buttons.contexto IS 'Onde o botão aparece: registro, listagem, ou ambos';

COMMENT ON COLUMN dynamic_data.data IS 'Dados do registro em formato JSONB flexível';
