-- Migração: Converter tabela testedoze de INTEGER para UUID
-- Data: 2025-11-16
-- Descrição: A tabela testedoze foi criada manualmente com ID INTEGER,
--            mas o sistema de telas dinâmicas espera UUID por padrão.
--            Esta migração converte a tabela para o padrão correto.

BEGIN;

-- 1. Criar tabela nova com estrutura correta (UUID)
CREATE TABLE IF NOT EXISTS testedoze_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dhinc TIMESTAMP,
    dhalter TIMESTAMP,
    campoteste TEXT
);

-- 2. Migrar dados existentes (gerar novos UUIDs)
INSERT INTO testedoze_new (dhinc, dhalter, campoteste)
SELECT dhinc, dhalter, campoteste
FROM testedoze
ORDER BY id;

-- 3. Backup da tabela antiga
ALTER TABLE testedoze RENAME TO testedoze_backup_integer;

-- 4. Renomear tabela nova
ALTER TABLE testedoze_new RENAME TO testedoze;

-- 5. Atualizar sequence (caso seja necessário para compatibilidade)
-- DROP SEQUENCE IF EXISTS testedoze_id_seq CASCADE;

COMMIT;

-- Mensagem de sucesso
SELECT 'Migração concluída com sucesso! Tabela testedoze agora usa UUID.' as status;

-- Para verificar
SELECT
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'testedoze' AND column_name = 'id';

-- Exibir dados migrados
SELECT COUNT(*) as total_registros FROM testedoze;
SELECT * FROM testedoze LIMIT 5;
