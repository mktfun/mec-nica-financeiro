-- Migration 20260821000008: Suporte a Contas a Pagar Analítico, Entidades Intercompany e Categorização Dinâmica

-- 1. Tabela de Entidades Intercompany (Sócios, Filiais, Holdings)
CREATE TABLE IF NOT EXISTS public.intercompany_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'socio', 'filial', 'holding', 'parceiro'
    cpf_cnpj TEXT,
    pix_keys TEXT[] DEFAULT '{}'::text[],
    store_id TEXT REFERENCES public.stores(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.intercompany_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read intercompany_entities"
    ON public.intercompany_entities FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow public insert/update intercompany_entities"
    ON public.intercompany_entities FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 2. Tabela de Regras de Categorização de Despesas
CREATE TABLE IF NOT EXISTS public.expense_category_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern TEXT NOT NULL UNIQUE, -- ex: 'GOOGLE', 'VERISURE', 'CAMBIO', 'UBER OS'
    category TEXT NOT NULL, -- 'gestao_tech', 'pecas', 'logistica_os', 'retirada_socios', 'despesas_bancarias'
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.expense_category_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read expense_category_rules"
    ON public.expense_category_rules FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow public insert/update expense_category_rules"
    ON public.expense_category_rules FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 3. Tabela de Histórico de Importação de Contas a Pagar
CREATE TABLE IF NOT EXISTS public.accounts_payable_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    source_filename TEXT NOT NULL,
    total_bills_count INTEGER NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.accounts_payable_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read accounts_payable_imports"
    ON public.accounts_payable_imports FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Allow public insert accounts_payable_imports"
    ON public.accounts_payable_imports FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- 4. Extensão da Tabela daily_manual_bills
ALTER TABLE public.daily_manual_bills 
ADD COLUMN IF NOT EXISTS external_code TEXT,
ADD COLUMN IF NOT EXISTS installment TEXT,
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS payment_date DATE,
ADD COLUMN IF NOT EXISTS recipient_name TEXT,
ADD COLUMN IF NOT EXISTS is_intercompany BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS intercompany_entity_id UUID REFERENCES public.intercompany_entities(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS matched_os_number TEXT;

-- 5. Seed Inicial de Sócios e Entidades
INSERT INTO public.intercompany_entities (name, type, pix_keys)
VALUES 
  ('DANIEL C6 / CARTAO DANIEL', 'socio', ARRAY['DANIEL', 'CARTAO DANIEL', 'DANIEL C6']),
  ('ROGERIO TADEU RUIZ', 'socio', ARRAY['ROGERIO', 'ROGERIO TADEU RUIZ', 'ROGERIO RUIZ']),
  ('RAPHAEL / SOCIO', 'socio', ARRAY['RAPHAEL', 'RAPHAEL SOCIO'])
ON CONFLICT DO NOTHING;

-- 6. Seed Inicial de Regras de Categorização de Despesas
INSERT INTO public.expense_category_rules (pattern, category, priority)
VALUES 
  ('RETIRADA', 'retirada_socios', 10),
  ('PARTICIPACAO DE LUCROS', 'retirada_socios', 10),
  ('PRO LABORE', 'retirada_socios', 10),
  ('CARTAO DANIEL', 'gestao_tech', 8),
  ('GOOGLE', 'gestao_tech', 8),
  ('FACEBOOK', 'gestao_tech', 8),
  ('VERISURE', 'gestao_tech', 8),
  ('SISTEMA', 'gestao_tech', 8),
  ('UBER OS', 'logistica_os', 9),
  ('CAMBIO', 'pecas', 7),
  ('PECAS', 'pecas', 7),
  ('JUNTAS', 'pecas', 7),
  ('DISTRIBUIDORA', 'pecas', 7),
  ('MERCADO LIVRE', 'pecas', 7),
  ('COOPERPECAS', 'pecas', 7),
  ('TARIFA', 'despesas_bancarias', 6),
  ('JUROS LIMITE', 'despesas_bancarias', 6),
  ('IOF', 'despesas_bancarias', 6)
ON CONFLICT (pattern) DO NOTHING;
