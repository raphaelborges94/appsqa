-- Migration 006: Adicionar campo screen_type para diferenciar tipos de tela
-- Data: 2025-11-16
-- Objetivo: Substituir lógica implícita por campo explícito

-- 1. Adicionar coluna screen_type
ALTER TABLE screens
ADD COLUMN IF NOT EXISTS screen_type VARCHAR(20) DEFAULT 'crud'
CHECK (screen_type IN ('crud', 'tree', 'subtable'));

-- 2. Atualizar telas existentes com base na lógica atual
UPDATE screens
SET screen_type = CASE
    WHEN is_subtable = true THEN 'subtable'
    WHEN campo_nome IS NOT NULL AND campo_nome != '' THEN 'tree'
    ELSE 'crud'
END;

-- 3. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_screens_screen_type ON screens(screen_type);

-- 4. Adicionar constraint para garantir consistência
-- Telas de árvore DEVEM ter campo_nome, campo_pai, campo_codigo
ALTER TABLE screens
ADD CONSTRAINT check_tree_fields
CHECK (
    screen_type != 'tree' OR (
        campo_nome IS NOT NULL AND campo_nome != '' AND
        campo_pai IS NOT NULL AND campo_pai != ''
    )
);

-- 5. Verificar resultado
SELECT
    screen_type,
    COUNT(*) as total,
    STRING_AGG(nome, ', ') as telas
FROM screens
GROUP BY screen_type
ORDER BY screen_type;

-- 6. Mostrar todas as telas com seus tipos
SELECT
    id,
    nome,
    tabela_nome,
    screen_type,
    campo_nome,
    is_subtable,
    ativa
FROM screens
ORDER BY screen_type, nome;
