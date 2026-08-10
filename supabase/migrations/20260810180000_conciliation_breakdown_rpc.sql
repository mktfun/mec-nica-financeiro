-- Migration: conciliation_breakdown_rpc
-- Created: 20260810180000
-- Spec: 151-conciliation-transparency
-- Description: Cria RPC get_conciliation_breakdown que retorna 4 arrays de transações individuais
-- para cada métrica da conciliação: entradas OFX, saídas OFX, OSs do pátio, taxas de maquininha.

CREATE OR REPLACE FUNCTION get_conciliation_breakdown(p_store_id text, p_date date)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bank_total           numeric := 0;
  v_bank_total_source    text;
  v_bank_total_warning   text := 'ok';
  v_has_snapshot         boolean;
  v_ofx_in_total         numeric := 0;
  v_ofx_in               json;
  v_ofx_out_total        numeric := 0;
  v_ofx_out              json;
  v_na_loja_os           numeric := 0;
  v_na_loja_os_source    text;
  v_na_loja_current      numeric := 0;
  v_na_loja_previous     numeric := 0;
  v_na_loja_detail       json;
  v_juros_rede           numeric := 0;
  v_rede_transactions    json;
BEGIN
  -- ================================================================
  -- 1. SALDO BANCO (bank_total): origem e diagnóstico
  -- ================================================================
  SELECT EXISTS(
    SELECT 1 FROM reconciliations 
    WHERE store_id = p_store_id AND date = p_date::text
  ) INTO v_has_snapshot;

  IF v_has_snapshot THEN
    SELECT COALESCE(bank_total, 0) INTO v_bank_total
    FROM reconciliations
    WHERE store_id = p_store_id AND date = p_date::text
    LIMIT 1;
    v_bank_total_source := 'snapshot_reconciliations';
  ELSE
    v_bank_total_source := 'realtime_ofx_transactions';
  END IF;

  -- Total real de entradas OFX (independente de snapshot) — para diagnóstico
  SELECT COALESCE(SUM(amount), 0) INTO v_ofx_in_total
  FROM ofx_transactions
  WHERE store_id = p_store_id AND target_date = p_date AND type = 'in';

  -- Diagnóstico: snapshot existe mas está zerado enquanto OFX tem dados → trigger desatualizado
  IF v_has_snapshot AND v_bank_total = 0 AND v_ofx_in_total > 0 THEN
    v_bank_total_warning := 'trigger_desatualizado';
  END IF;

  -- Se não tem snapshot, usa a soma real das OFX de entrada como bank_total
  IF NOT v_has_snapshot THEN
    v_bank_total := v_ofx_in_total;
  END IF;

  -- ================================================================
  -- 2. ENTRADAS OFX (detalhamento linha por linha)
  -- ================================================================
  SELECT COALESCE(json_agg(
    json_build_object(
      'id',          ot.id::text,
      'occurred_at', ot.occurred_at,
      'description', COALESCE(ot.counterpart_name, ot.bank_name, 'Sem descrição'),
      'fitid',       ot.fitid,
      'amount',      ot.amount,
      'matched',     ot.matched_os_number IS NOT NULL
    ) ORDER BY ot.occurred_at DESC
  ), '[]'::json) INTO v_ofx_in
  FROM ofx_transactions ot
  WHERE ot.store_id = p_store_id AND ot.target_date = p_date AND ot.type = 'in';

  -- ================================================================
  -- 3. SAÍDAS OFX — Despesas (detalhamento linha por linha)
  -- ================================================================
  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_ofx_out_total
  FROM ofx_transactions
  WHERE store_id = p_store_id AND target_date = p_date AND type = 'out';

  SELECT COALESCE(json_agg(
    json_build_object(
      'id',          ot.id::text,
      'occurred_at', ot.occurred_at,
      'description', COALESCE(ot.counterpart_name, ot.bank_name, 'Sem descrição'),
      'fitid',       ot.fitid,
      'amount',      ABS(ot.amount)
    ) ORDER BY ot.occurred_at DESC
  ), '[]'::json) INTO v_ofx_out
  FROM ofx_transactions ot
  WHERE ot.store_id = p_store_id AND ot.target_date = p_date AND ot.type = 'out';

  -- ================================================================
  -- 4. NA LOJA OS — detalhamento de cada OS com flag de mês anterior
  -- ================================================================
  IF v_has_snapshot THEN
    SELECT COALESCE(na_loja_os, 0) INTO v_na_loja_os
    FROM reconciliations
    WHERE store_id = p_store_id AND date = p_date::text
    LIMIT 1;
    v_na_loja_os_source := 'snapshot_reconciliations';
  ELSE
    SELECT COALESCE(SUM(COALESCE(total_value, 0) - COALESCE(paid_value, 0)), 0) INTO v_na_loja_os
    FROM patio_os
    WHERE store_id = p_store_id
      AND (opened_at::date = p_date OR closed_at::date = p_date);
    v_na_loja_os_source := 'realtime_patio_os';
  END IF;

  -- Subtotais: mês atual vs mês anterior
  SELECT
    COALESCE(SUM(CASE
      WHEN DATE_TRUNC('month', opened_at) = DATE_TRUNC('month', p_date::timestamp)
      THEN COALESCE(total_value, 0) - COALESCE(paid_value, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE
      WHEN DATE_TRUNC('month', opened_at) < DATE_TRUNC('month', p_date::timestamp)
      THEN COALESCE(total_value, 0) - COALESCE(paid_value, 0) ELSE 0 END), 0)
  INTO v_na_loja_current, v_na_loja_previous
  FROM patio_os
  WHERE store_id = p_store_id
    AND (opened_at::date = p_date OR closed_at::date = p_date);

  -- Detalhe por OS individual
  SELECT COALESCE(json_agg(
    json_build_object(
      'os_number',         po.os_number,
      'status',            po.status,
      'opened_at',         po.opened_at,
      'closed_at',         po.closed_at,
      'total_value',       COALESCE(po.total_value, 0),
      'paid_value',        COALESCE(po.paid_value, 0),
      'remaining',         COALESCE(po.total_value, 0) - COALESCE(po.paid_value, 0),
      'payment_method',    po.payment_method,
      'is_previous_month', (DATE_TRUNC('month', po.opened_at) < DATE_TRUNC('month', p_date::timestamp))
    ) ORDER BY po.opened_at ASC
  ), '[]'::json) INTO v_na_loja_detail
  FROM patio_os po
  WHERE po.store_id = p_store_id
    AND (po.opened_at::date = p_date OR po.closed_at::date = p_date);

  -- ================================================================
  -- 5. TAXAS MAQUININHA (Rede) — detalhamento por transação
  -- ================================================================
  SELECT COALESCE(SUM(fee_amount), 0) INTO v_juros_rede
  FROM pos_transactions
  WHERE store_id = p_store_id AND target_date = p_date AND fee_amount > 0;

  SELECT COALESCE(json_agg(
    json_build_object(
      'id',             pt.id::text,
      'occurred_at',    pt.occurred_at,
      'machine_name',   pt.machine_name,
      'payment_method', pt.payment_method,
      'gross_amount',   pt.gross_amount,
      'fee_amount',     pt.fee_amount,
      'net_amount',     pt.net_amount,
      'fee_pct',        CASE WHEN pt.gross_amount > 0
                          THEN ROUND((pt.fee_amount / pt.gross_amount * 100)::numeric, 2)
                          ELSE 0 END
    ) ORDER BY pt.occurred_at DESC
  ), '[]'::json) INTO v_rede_transactions
  FROM pos_transactions pt
  WHERE pt.store_id = p_store_id AND pt.target_date = p_date AND pt.fee_amount > 0;

  -- ================================================================
  -- 6. RETORNO COMPLETO
  -- ================================================================
  RETURN json_build_object(
    'bank_total',            v_bank_total,
    'bank_total_source',     v_bank_total_source,
    'bank_total_warning',    v_bank_total_warning,
    'ofx_in_total',          v_ofx_in_total,
    'ofx_in',                v_ofx_in,
    'ofx_out_total',         v_ofx_out_total,
    'ofx_out',               v_ofx_out,
    'na_loja_os',            v_na_loja_os,
    'na_loja_os_source',     v_na_loja_os_source,
    'na_loja_current_month', v_na_loja_current,
    'na_loja_prev_months',   v_na_loja_previous,
    'na_loja_detail',        v_na_loja_detail,
    'juros_rede',            v_juros_rede,
    'rede_transactions',     v_rede_transactions
  );
END;
$$;

-- Permissão para usuários autenticados
GRANT EXECUTE ON FUNCTION get_conciliation_breakdown(text, date) TO authenticated;
