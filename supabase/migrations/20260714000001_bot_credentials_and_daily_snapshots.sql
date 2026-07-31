-- Migration: bot_credentials + daily_snapshots
-- Created: 20260714000001

-- Tabela para armazenar credenciais dos bots de automação
-- Apenas admins podem ler/escrever (RLS enforced)
CREATE TABLE IF NOT EXISTS bot_credentials (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  portal text NOT NULL UNIQUE, -- 'oficina_inteligente' | 'rede'
  portal_label text NOT NULL,
  url text NOT NULL,
  username text NOT NULL,
  password text NOT NULL,
  last_validated_at timestamptz,
  is_valid boolean DEFAULT false,
  validation_error text,
  updated_at timestamptz DEFAULT now()
);

-- Seed com os portais conhecidos
INSERT INTO bot_credentials (portal, portal_label, url, username, password, is_valid)
VALUES
  ('oficina_inteligente', 'Oficina Inteligente', 'https://sistemaoficinainteligente.com.br', 'mvinyciusp@gmail.com', 'Vinymark005@', false),
  ('rede', 'Rede (Maquininha)', 'https://meu.userede.com.br/login', 'financeiro3@mecnicpopular.com', 'Popular26!', false)
ON CONFLICT (portal) DO NOTHING;

-- RLS
ALTER TABLE bot_credentials ENABLE ROW LEVEL SECURITY;

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

-- Tabela para snapshots diários de caixa (necessário para calcular Fluxo de Caixa)
CREATE TABLE IF NOT EXISTS daily_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL UNIQUE,
  caixa_atual numeric NOT NULL DEFAULT 0,
  faturamento numeric NOT NULL DEFAULT 0,
  dinheiro_mp numeric NOT NULL DEFAULT 0,
  total_recebiveis numeric NOT NULL DEFAULT 0,
  total_patio numeric NOT NULL DEFAULT 0,
  saldo_bancario numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS para daily_snapshots (todos os usuários autenticados podem ler, só admin escreve)
ALTER TABLE daily_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read daily_snapshots"
  ON daily_snapshots
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage daily_snapshots"
  ON daily_snapshots
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
