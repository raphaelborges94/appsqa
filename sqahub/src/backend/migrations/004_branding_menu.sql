-- Migration: Branding e Menu Config
-- Criado em: 2025-11-15
-- Descrição: Adiciona tabelas para configuração de marca e menu da aplicação

-- Tabela de configurações de marca
CREATE TABLE IF NOT EXISTS branding_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_name VARCHAR(255) NOT NULL DEFAULT 'SQA HUB',
  app_subtitle VARCHAR(255) DEFAULT 'Enterprise Platform',
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#0F172A',
  secondary_color VARCHAR(7) DEFAULT '#64748B',
  accent_color VARCHAR(7) DEFAULT '#3B82F6',
  sidebar_bg_color VARCHAR(7) DEFAULT '#FFFFFF',
  sidebar_text_color VARCHAR(7) DEFAULT '#0F172A',
  sidebar_active_bg VARCHAR(7) DEFAULT '#0F172A',
  sidebar_active_text VARCHAR(7) DEFAULT '#FFFFFF',
  favicon_url TEXT,
  company_name VARCHAR(255),
  support_email VARCHAR(255),
  support_phone VARCHAR(50),
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Índices para branding_configs
CREATE INDEX IF NOT EXISTS idx_branding_configs_active ON branding_configs(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_branding_configs_created_at ON branding_configs(created_at DESC);

-- Trigger para updated_at
CREATE TRIGGER branding_configs_updated_at
  BEFORE UPDATE ON branding_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabela de configurações do menu
CREATE TABLE IF NOT EXISTS menu_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_structure JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Índices para menu_configs
CREATE INDEX IF NOT EXISTS idx_menu_configs_active ON menu_configs(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_menu_configs_created_at ON menu_configs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_menu_configs_structure ON menu_configs USING GIN (menu_structure);

-- Trigger para updated_at
CREATE TRIGGER menu_configs_updated_at
  BEFORE UPDATE ON menu_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir configuração padrão de branding
INSERT INTO branding_configs (
  app_name,
  app_subtitle,
  primary_color,
  secondary_color,
  accent_color,
  sidebar_bg_color,
  sidebar_text_color,
  sidebar_active_bg,
  sidebar_active_text,
  is_active
) VALUES (
  'SQA HUB',
  'Enterprise Platform',
  '#0F172A',
  '#64748B',
  '#3B82F6',
  '#FFFFFF',
  '#0F172A',
  '#0F172A',
  '#FFFFFF',
  TRUE
) ON CONFLICT DO NOTHING;

-- Inserir configuração padrão de menu
INSERT INTO menu_configs (
  menu_structure,
  is_active
) VALUES (
  '[
    {
      "id": "config-group",
      "title": "Configurações",
      "icon": "Settings",
      "items": []
    }
  ]'::jsonb,
  TRUE
) ON CONFLICT DO NOTHING;
