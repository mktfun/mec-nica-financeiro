-- ==============================================================================
-- MIGRATION: 20260821000009_purge_daily_financial_data.sql
-- DESCRIÇÃO: RPC Atômica para Exclusão Cirúrgica de Conciliação e Fechamento por Data
-- ==============================================================================

CREATE OR REPLACE FUNCTION purge_daily_financial_data(p_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count_snapshots INT := 0;
  v_count_reconciliations INT := 0;
  v_count_manual_tx INT := 0;
  v_count_pos_tx INT := 0;
  v_count_ofx INT := 0;
  v_count_matches INT := 0;
  v_count_bills INT := 0;
  v_count_adjustments INT := 0;
  v_count_logs INT := 0;
  v_count_vault INT := 0;
  v_count_ap INT := 0;
  v_count_audit INT := 0;
BEGIN
  IF p_date IS NULL THEN
    RAISE EXCEPTION 'Data de exclusão é obrigatória.';
  END IF;

  -- 1. Snapshots diários
  DELETE FROM public.daily_snapshots WHERE date = p_date;
  GET DIAGNOSTICS v_count_snapshots = ROW_COUNT;

  -- 2. Reconciliações por loja
  DELETE FROM public.reconciliations WHERE date = p_date;
  GET DIAGNOSTICS v_count_reconciliations = ROW_COUNT;

  -- 3. Pareamentos de conciliação
  DELETE FROM public.conciliation_matches WHERE target_date = p_date;
  GET DIAGNOSTICS v_count_matches = ROW_COUNT;

  -- 4. Transações Manuais e POS (Maquininha)
  DELETE FROM public.manual_transactions 
  WHERE target_date = p_date 
     OR DATE(occurred_at) = p_date;
  GET DIAGNOSTICS v_count_manual_tx = ROW_COUNT;

  DELETE FROM public.pos_transactions 
  WHERE target_date = p_date 
     OR DATE(occurred_at) = p_date;
  GET DIAGNOSTICS v_count_pos_tx = ROW_COUNT;

  -- 5. Transações OFX brutas
  DELETE FROM public.ofx_transactions 
  WHERE target_date = p_date 
     OR DATE(occurred_at) = p_date;
  GET DIAGNOSTICS v_count_ofx = ROW_COUNT;

  -- 6. Despesas manuais e contas a pagar do dia
  DELETE FROM public.daily_manual_bills WHERE date = p_date;
  GET DIAGNOSTICS v_count_bills = ROW_COUNT;

  -- 7. Ajustes de faturamento (aportes/transferências)
  DELETE FROM public.daily_revenue_adjustments WHERE date = p_date;
  GET DIAGNOSTICS v_count_adjustments = ROW_COUNT;

  -- 8. Logs de auditoria pericial
  DELETE FROM public.reconciliation_audit_logs WHERE target_date = p_date;
  GET DIAGNOSTICS v_count_audit = ROW_COUNT;

  -- 9. Movimentações de cofre
  DELETE FROM public.store_cash_vault WHERE entry_date = p_date;
  GET DIAGNOSTICS v_count_vault = ROW_COUNT;

  -- 10. Lotes de contas a pagar importados
  DELETE FROM public.accounts_payable_imports WHERE date = p_date;
  GET DIAGNOSTICS v_count_ap = ROW_COUNT;

  -- 11. Logs de importação do dia
  DELETE FROM public.import_logs WHERE target_date = p_date;
  GET DIAGNOSTICS v_count_logs = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'date', p_date,
    'deleted_snapshots', v_count_snapshots,
    'deleted_reconciliations', v_count_reconciliations,
    'deleted_manual_transactions', v_count_manual_tx,
    'deleted_pos_transactions', v_count_pos_tx,
    'deleted_ofx', v_count_ofx,
    'deleted_matches', v_count_matches,
    'deleted_bills', v_count_bills,
    'deleted_adjustments', v_count_adjustments,
    'deleted_logs', v_count_logs,
    'deleted_vault', v_count_vault,
    'deleted_audit_logs', v_count_audit
  );
END;
$$;
