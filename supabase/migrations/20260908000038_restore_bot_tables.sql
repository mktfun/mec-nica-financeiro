-- Migration: Recreate bot_credentials and bot_runs
-- Created: 20260908000038

CREATE TABLE IF NOT EXISTS bot_credentials (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  portal text NOT NULL UNIQUE,
  portal_label text NOT NULL,
  url text NOT NULL,
  username text NOT NULL,
  password text NOT NULL,
  last_validated_at timestamptz,
  is_valid boolean DEFAULT false,
  validation_error text,
  updated_at timestamptz DEFAULT now()
);

-- Seed com os portais conhecidos se ainda não existirem
INSERT INTO bot_credentials (portal, portal_label, url, username, password, is_valid)
VALUES
  ('oficina_inteligente', 'Oficina Inteligente', 'https://sistemaoficinainteligente.com.br', 'mvinyciusp@gmail.com', 'Vinymark005@', false),
  ('rede', 'Rede (Maquininha)', 'https://meu.userede.com.br/login', 'financeiro3@mecnicpopular.com', 'Popular26!', false)
ON CONFLICT (portal) DO NOTHING;

-- RLS para bot_credentials
ALTER TABLE bot_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage bot_credentials" ON bot_credentials;
CREATE POLICY "Admins can manage bot_credentials"
  ON bot_credentials
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Authenticated can read bot_credentials" ON bot_credentials;
CREATE POLICY "Authenticated can read bot_credentials"
  ON bot_credentials
  FOR SELECT
  TO authenticated
  USING (true);

-- Tabela bot_runs para histórico de execuções
CREATE TABLE IF NOT EXISTS bot_runs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  status text CHECK (status IN ('running', 'success', 'error')) DEFAULT 'running',
  stores_processed integer DEFAULT 0,
  errors jsonb DEFAULT '[]'::jsonb,
  screenshot_urls text[] DEFAULT ARRAY[]::text[],
  log_text text,
  triggered_by text DEFAULT 'system',
  created_at timestamptz DEFAULT now()
);

-- RLS para bot_runs
ALTER TABLE bot_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read and write bot_runs" ON bot_runs;
CREATE POLICY "Authenticated users can read and write bot_runs"
  ON bot_runs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
