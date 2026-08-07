-- ==========================================
-- 1. DROP DE TABELAS LEGADAS (Limpeza)
-- ==========================================
DROP TABLE IF EXISTS ai_execution_logs CASCADE;
DROP TABLE IF EXISTS bot_audit_logs CASCADE;
DROP TABLE IF EXISTS bot_runs CASCADE;
DROP TABLE IF EXISTS bot_credentials CASCADE;
DROP TABLE IF EXISTS mcp_logs CASCADE;
DROP TABLE IF EXISTS agent_reflections CASCADE;
DROP TABLE IF EXISTS claritas_prompts CASCADE;
DROP TABLE IF EXISTS claritas_policies CASCADE;
DROP TABLE IF EXISTS import_logs CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS ai_settings CASCADE;
DROP TABLE IF EXISTS oficina_os_cache CASCADE;
DROP TABLE IF EXISTS oficina_contas CASCADE;

-- ==========================================
-- 2. CRIAÇÃO DE NOVAS TABELAS DE TRANSAÇÕES
-- ==========================================

-- OFX (Extratos Reais)
CREATE TABLE IF NOT EXISTS ofx_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id TEXT REFERENCES stores(id),
    bank_name TEXT NOT NULL,
    type TEXT CHECK (type IN ('in', 'out')),
    amount NUMERIC NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    fitid TEXT NOT NULL,
    counterpart_name TEXT,
    cnpj_cpf TEXT,
    matched_os_number TEXT,
    import_batch_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(store_id, fitid)
);
ALTER TABLE ofx_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage ofx_transactions for their stores" ON ofx_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- POS (Maquininhas / Rede)
CREATE TABLE IF NOT EXISTS pos_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id TEXT REFERENCES stores(id),
    machine_name TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    gross_amount NUMERIC NOT NULL,
    net_amount NUMERIC NOT NULL,
    fee_amount NUMERIC NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    matched_os_number TEXT,
    import_batch_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE pos_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage pos_transactions for their stores" ON pos_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================
-- 3. CRIAÇÃO DA TABELA SYSTEM LOGS (Efêmera)
-- ==========================================
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level TEXT NOT NULL,
    context TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view and insert system_logs" ON system_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Note: In a real environment with pg_cron available, we would enable it here.
-- For local Supabase environments, pg_cron requires manual activation in dashboard.
-- SELECT cron.schedule('clean_system_logs', '0 0 * * *', 'DELETE FROM system_logs WHERE created_at < now() - interval ''1 day'';');

-- ==========================================
-- 4. RENOMEAR TRANSACTIONS PARA MANUAL
-- ==========================================
ALTER TABLE transactions RENAME TO manual_transactions;


-- Update get_dashboard_metrics RPC to handle the new split tables
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



