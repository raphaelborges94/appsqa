-- Migration 007: Melhorias na tabela users para gestão completa
-- Data: 2025-11-16
-- Objetivo: Adicionar campos para gestão de usuários (ativo, perfil, etc)

-- 1. Adicionar coluna active (ativo/inativo)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- 2. Adicionar coluna role (perfil do usuário)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'
CHECK (role IN ('admin', 'user', 'viewer'));

-- 3. Adicionar coluna avatar_url (foto do usuário)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 4. Adicionar coluna phone (telefone)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- 5. Adicionar coluna last_login (último acesso)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- 6. Tornar password opcional (pois usamos passwordless)
ALTER TABLE users
ALTER COLUMN password DROP NOT NULL;

-- 7. Criar índice no email para performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 8. Criar índice em active
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);

-- 9. Atualizar usuários existentes
UPDATE users
SET active = true
WHERE active IS NULL;

UPDATE users
SET role = 'admin'
WHERE role IS NULL;

-- 10. Verificar resultado
SELECT
    id,
    email,
    name,
    role,
    active,
    phone,
    last_login,
    created_at
FROM users
ORDER BY created_at DESC;
