-- Migration: Adicionar campo CPF à tabela users
-- Data: 2025-11-16

-- Adicionar coluna CPF
ALTER TABLE users ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);

-- Adicionar índice único para CPF
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_cpf ON users(cpf) WHERE cpf IS NOT NULL;

-- Comentário na coluna
COMMENT ON COLUMN users.cpf IS 'CPF do usuário no formato XXX.XXX.XXX-XX';
