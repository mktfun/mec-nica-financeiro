-- ==========================================
-- CORREÇÃO DA RPC get_dashboard_metrics (Aponta para daily_snapshots)
-- ==========================================
DROP FUNCTION IF EXISTS get_dashboard_metrics(date);

CREATE OR REPLACE FUNCTION get_dashboard_metrics(p_date date)
RETURNS TABLE (
  faturamento_hoje numeric,
  faturamento_mes numeric,
  contas_pagas numeric,
  contas_a_pagar numeric,
  inadimplencia numeric,
  saldo_total numeric,
  caixa_atual numeric,
  fluxo_caixa numeric,
  v_receitas_ofx numeric,
  v_despesas_ofx numeric
) AS $BODY
DECLARE
  v_fat_hoje numeric := 0;
  v_fat_mes numeric := 0;
  v_contas_pagas numeric := 0;
  v_contas_a_pagar numeric := 0;
  v_inadimplencia numeric := 0;
  v_saldo_total numeric := 0;
  v_caixa_atual numeric := 0;
  v_fluxo_cx numeric := 0;
  v_receitas_ofx numeric := 0;
  v_despesas_ofx numeric := 0;
BEGIN
  -- FATURAMENTO: Soma OS fechadas no dia
  SELECT COALESCE(SUM(paid_value), 0) INTO v_fat_hoje
  FROM patio_os
  WHERE DATE(closed_at) = p_date AND status = 'finalizada';

  -- FATURAMENTO MES
  SELECT COALESCE(SUM(paid_value), 0) INTO v_fat_mes
  FROM patio_os
  WHERE EXTRACT(MONTH FROM closed_at) = EXTRACT(MONTH FROM p_date)
    AND EXTRACT(YEAR FROM closed_at) = EXTRACT(YEAR FROM p_date)
    AND status = 'finalizada';

  -- CONTAS PAGAS (OFX + Manual)
  SELECT COALESCE(SUM(amount), 0) INTO v_contas_pagas
  FROM (
    SELECT amount, occurred_at, type FROM ofx_transactions
    UNION ALL
    SELECT amount, occurred_at, type FROM manual_transactions
  ) t
  WHERE DATE(occurred_at) = p_date AND type = 'out';

  -- INADIMPLÊNCIA
  SELECT COALESCE(SUM(total_value - paid_value), 0) INTO v_inadimplencia
  FROM patio_os
  WHERE DATE(opened_at) <= p_date AND status = 'aberta' AND days_open > 30;

  -- SALDO TOTAL (Mantido Global)
  SELECT COALESCE(SUM(r.saldo), 0) INTO v_saldo_total
  FROM (SELECT DISTINCT store_id FROM reconciliations) s
  CROSS JOIN LATERAL (
    SELECT saldo
    FROM reconciliations
    WHERE (store_id = s.store_id OR (store_id IS NULL AND s.store_id IS NULL))
      AND date <= p_date
    ORDER BY date DESC
    LIMIT 1
  ) r;

  -- CAIXA ATUAL (Soma de todos os 'caixa_atual' do último snapshot)
  SELECT COALESCE(caixa_atual, 0) INTO v_caixa_atual FROM daily_snapshots WHERE date <= p_date ORDER BY date DESC LIMIT 1;

  -- FLUXO DE CAIXA
  DECLARE
    v_caixa_anterior numeric := 0;
  BEGIN
    SELECT COALESCE(caixa_atual, 0) INTO v_caixa_anterior FROM daily_snapshots WHERE date < p_date ORDER BY date DESC LIMIT 1;
    
    v_fluxo_cx := v_caixa_atual - v_caixa_anterior;
  END;

  RETURN QUERY SELECT 
    v_fat_hoje, v_fat_mes, v_contas_pagas, v_contas_a_pagar, 
    v_inadimplencia, v_saldo_total, v_caixa_atual, v_fluxo_cx,
    v_receitas_ofx, v_despesas_ofx;
END;
$BODY LANGUAGE plpgsql;


