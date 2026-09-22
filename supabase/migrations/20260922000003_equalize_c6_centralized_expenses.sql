-- Migration: 20260922000003_equalize_c6_centralized_expenses.sql
-- Spec 430: Equalização da fatura C6 e ajuste de get_daily_reconciliation_summary

-- 1. Vincular todas as contas da fatura C6 de 22/09 ao boleto central da Brasicar com intercompany DANIEL C6
UPDATE public.daily_manual_bills
SET matched_ofx_id = '1adb8f1e-72c0-4767-8045-850c8ea7a9ab',
    match_status = 'centralized_paid',
    is_intercompany = true,
    intercompany_entity_id = '34aeb41d-b8c8-41e1-bba3-7583cec0134c',
    updated_at = now()
WHERE date = '2026-09-22'
  AND (
      UPPER(COALESCE(recipient_name, '') || ' ' || COALESCE(title, '')) ILIKE '%CARTAO DANIEL%'
      OR UPPER(COALESCE(recipient_name, '') || ' ' || COALESCE(title, '')) ILIKE '%CARTÃO DANIEL%'
      OR UPPER(COALESCE(recipient_name, '') || ' ' || COALESCE(title, '')) ILIKE '%C6%'
  )
  AND id != '4db4e8b9-42e4-48d8-8cd3-c2e520be7da4'; -- Não alterar o pró-labore de Daniel

-- 2. Atualizar transação do boleto C6 na Brasicar
UPDATE public.ofx_transactions
SET match_status = 'matched_batch',
    manual_category = 'Fatura Cartão C6 [Consolidado Intercompany]',
    manual_justification = 'Fatura C6 Consolidada Grupo (156 despesas centralizadas)',
    contabilizar_no_subtotal = true,
    updated_at = now()
WHERE id = '1adb8f1e-72c0-4767-8045-850c8ea7a9ab';

-- 3. Atualizar o snapshot de 22/09 para refletir o subtotal auditado de contas a pagar
UPDATE public.daily_snapshots
SET contas_a_pagar = (
        SELECT COALESCE(SUM(amount), 0)
        FROM public.daily_manual_bills
        WHERE date = '2026-09-22' AND COALESCE(contabilizar_no_subtotal, true) = true
    ),
    metadata = jsonb_set(
        metadata,
        '{subtotal_contas}',
        to_jsonb((
            SELECT COALESCE(SUM(amount), 0)
            FROM public.daily_manual_bills
            WHERE date = '2026-09-22' AND COALESCE(contabilizar_no_subtotal, true) = true
        ))
    ),
    updated_at = now()
WHERE date = '2026-09-22';
