-- Migration: Adicionar campo grupo_id à tabela users
-- Data: 2025-11-17

-- Adicionar coluna grupo_id como FK para sqausugru (INTEGER porque sqausugru.id é INTEGER)
ALTER TABLE users ADD COLUMN IF NOT EXISTS grupo_id INTEGER;

-- Adicionar constraint de foreign key
ALTER TABLE users
ADD CONSTRAINT fk_users_grupo
FOREIGN KEY (grupo_id)
REFERENCES sqausugru(id)
ON DELETE SET NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_users_grupo_id ON users(grupo_id);

-- Comentário na coluna
COMMENT ON COLUMN users.grupo_id IS 'ID do grupo de usuários ao qual o usuário pertence';
