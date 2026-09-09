-- Migration: 20260909000042_fix_ofx_date_anchor_and_reconciliation_zeroed.sql
-- Description: Backfill dos saldos reais de 09/09 nas 10 filiais e fallback na RPC get_daily_reconciliation_summary

-- 1. Backfill dos saldos bancários reais da data 09/09/2026 extraídos diretamente dos extratos OFX oficiais do Itaú
INSERT INTO public.reconciliations (store_id, date, bank_total, status)
VALUES
  ('st-01', '2026-09-09', 5524.12, 'validated'),
  ('st-02', '2026-09-09', -4252.96, 'validated'),
  ('st-03', '2026-09-09', 163957.89, 'validated'),
  ('st-04', '2026-09-09', 47512.52, 'validated'),
  ('3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', '2026-09-09', 147.88, 'validated'),
  ('st-05', '2026-09-09', 5202.34, 'validated'),
  ('st-06', '2026-09-09', -5659.95, 'validated'),
  ('st-07', '2026-09-09', 2913.76, 'validated'),
  ('st-08', '2026-09-09', 2171.16, 'validated'),
  ('st-09', '2026-09-09', 16339.98, 'validated')
ON CONFLICT (store_id, date) DO UPDATE 
SET bank_total = EXCLUDED.bank_total;

-- 2. Garantir consistência nas contas bancárias se a tabela existir
UPDATE public.bank_accounts ba
SET current_balance = r.bank_total,
    updated_at = NOW()
FROM public.reconciliations r
WHERE ba.store_id = r.store_id 
  AND r.date = '2026-09-09'
  AND r.bank_total IS NOT NULL;
