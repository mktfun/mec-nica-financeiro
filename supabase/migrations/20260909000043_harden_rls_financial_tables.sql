-- Migration: 20260909000043_harden_rls_financial_tables.sql
-- Description: AppSec Hardening - Revoga políticas públicas permissivas e restringe acesso a authenticated com profile ativo
-- Spec: 390-appsec-remediation-bank-vault-rls-bot-hardening

-- ============================================================================
-- 1. store_cash_vault (Cofre em Dinheiro das Lojas)
-- ============================================================================
ALTER TABLE public.store_cash_vault ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on store_cash_vault" ON public.store_cash_vault;
DROP POLICY IF EXISTS "Allow public all on store_cash_vault" ON public.store_cash_vault;
DROP POLICY IF EXISTS "Authenticated users can read store_cash_vault" ON public.store_cash_vault;
DROP POLICY IF EXISTS "Authenticated users can manage store_cash_vault" ON public.store_cash_vault;

CREATE POLICY "Authenticated users can read store_cash_vault"
ON public.store_cash_vault
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can manage store_cash_vault"
ON public.store_cash_vault
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
);

-- ============================================================================
-- 2. daily_manual_bills (Contas a Pagar Manuais / Despesas do Dia)
-- ============================================================================
ALTER TABLE public.daily_manual_bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all on daily_manual_bills" ON public.daily_manual_bills;
DROP POLICY IF EXISTS "Authenticated users can read daily_manual_bills" ON public.daily_manual_bills;
DROP POLICY IF EXISTS "Authenticated users can manage daily_manual_bills" ON public.daily_manual_bills;

CREATE POLICY "Authenticated users can read daily_manual_bills"
ON public.daily_manual_bills
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can manage daily_manual_bills"
ON public.daily_manual_bills
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
);

-- ============================================================================
-- 3. daily_revenue_adjustments (Ajustes Manuais de Faturamento / Receitas)
-- ============================================================================
ALTER TABLE public.daily_revenue_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all on daily_revenue_adjustments" ON public.daily_revenue_adjustments;
DROP POLICY IF EXISTS "Authenticated users can read daily_revenue_adjustments" ON public.daily_revenue_adjustments;
DROP POLICY IF EXISTS "Authenticated users can manage daily_revenue_adjustments" ON public.daily_revenue_adjustments;

CREATE POLICY "Authenticated users can read daily_revenue_adjustments"
ON public.daily_revenue_adjustments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can manage daily_revenue_adjustments"
ON public.daily_revenue_adjustments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
);

-- ============================================================================
-- 4. ofx_transactions (Extrato Bancário OFX das Filiais)
-- ============================================================================
ALTER TABLE public.ofx_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage ofx_transactions for their stores" ON public.ofx_transactions;
DROP POLICY IF EXISTS "Authenticated users can read ofx_transactions" ON public.ofx_transactions;
DROP POLICY IF EXISTS "Authenticated users can manage ofx_transactions" ON public.ofx_transactions;

CREATE POLICY "Authenticated users can read ofx_transactions"
ON public.ofx_transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can manage ofx_transactions"
ON public.ofx_transactions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
);

-- ============================================================================
-- 5. pos_transactions (Vendas de Cartão / Adquirentes)
-- ============================================================================
ALTER TABLE public.pos_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage pos_transactions for their stores" ON public.pos_transactions;
DROP POLICY IF EXISTS "Authenticated users can read pos_transactions" ON public.pos_transactions;
DROP POLICY IF EXISTS "Authenticated users can manage pos_transactions" ON public.pos_transactions;

CREATE POLICY "Authenticated users can read pos_transactions"
ON public.pos_transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can manage pos_transactions"
ON public.pos_transactions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
);

-- ============================================================================
-- 6. store_file_mappings (Mapeamento de Arquivos e Lojas)
-- ============================================================================
ALTER TABLE public.store_file_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to store_file_mappings" ON public.store_file_mappings;
DROP POLICY IF EXISTS "Authenticated users can manage store_file_mappings" ON public.store_file_mappings;

CREATE POLICY "Authenticated users can manage store_file_mappings"
ON public.store_file_mappings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
  )
);
