-- ==========================================
-- 1. RESTAURAÇÃO DA TABELA import_logs
-- ==========================================
CREATE TABLE IF NOT EXISTS import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id TEXT,
    store_name TEXT NOT NULL,
    target_date DATE NOT NULL,
    total_os NUMERIC,
    total_paid_all NUMERIC,
    total_dinheiro NUMERIC,
    os_count INTEGER,
    receivables_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar Unique Constraint
ALTER TABLE public.import_logs DROP CONSTRAINT IF EXISTS import_logs_store_id_target_date_key;
ALTER TABLE public.import_logs ADD CONSTRAINT import_logs_store_id_target_date_key UNIQUE NULLS NOT DISTINCT (store_id, target_date);

-- Habilitar RLS e criar políticas
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.import_logs;
CREATE POLICY "Enable read access for all users" ON public.import_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON public.import_logs;
CREATE POLICY "Enable insert access for all users" ON public.import_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON public.import_logs;
CREATE POLICY "Enable update access for all users" ON public.import_logs FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete access for all users" ON public.import_logs;
CREATE POLICY "Enable delete access for all users" ON public.import_logs FOR DELETE USING (true);


-- ==========================================
-- 2. AJUSTE DA RPC get_store_financial_stats
-- ==========================================
DROP FUNCTION IF EXISTS get_store_financial_stats(uuid, date, date);
DROP FUNCTION IF EXISTS get_store_financial_stats(text, date, date);

CREATE OR REPLACE FUNCTION get_store_financial_stats(p_store_id text, p_start_date date, p_end_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_entradas numeric;
    v_total_saidas numeric;
    v_current_balance numeric;
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO v_total_entradas
    FROM transactions
    WHERE store_id = p_store_id AND target_date >= p_start_date AND target_date <= p_end_date AND type = 'in';

    SELECT ABS(COALESCE(SUM(amount), 0)) INTO v_total_saidas
    FROM transactions
    WHERE store_id = p_store_id AND target_date >= p_start_date AND target_date <= p_end_date AND type = 'out';

    -- Adicionar fallback para current_balance da loja a partir do daily_snapshots
    SELECT COALESCE(caixa_atual, 0) INTO v_current_balance
    FROM daily_snapshots
    WHERE store_id = p_store_id AND date <= p_end_date
    ORDER BY date DESC LIMIT 1;

    RETURN jsonb_build_object(
        'store_id', p_store_id,
        'start_date', p_start_date,
        'end_date', p_end_date,
        'total_entradas', v_total_entradas,
        'total_saidas', v_total_saidas,
        'faturamento', v_total_entradas,
        'contas', v_total_saidas,
        'current_balance', v_current_balance
    );
END;
$$;


-- ==========================================
-- 3. ADIÇÃO DE target_date NAS TABELAS E RECRIAR VIEW
-- ==========================================
ALTER TABLE ofx_transactions ADD COLUMN IF NOT EXISTS target_date DATE;
ALTER TABLE pos_transactions ADD COLUMN IF NOT EXISTS target_date DATE;

-- Drop da view antiga
DROP VIEW IF EXISTS transactions;

-- Recriar a view apontando para target_date nativo (com fallback para occurred_at)
CREATE OR REPLACE VIEW transactions AS
SELECT 
  id, store_id, store_name, title, subtitle, amount, type, 'completed' as status, payment_method, os_number, occurred_at, target_date::date, created_at,
  icon_type, NULL as fitid, NULL as cnpj_cpf, NULL as counterpart_name, NULL::numeric as previous_balance, gross_amount, fee_amount, source, NULL::uuid as import_batch_id
FROM manual_transactions
UNION ALL
SELECT 
  id, store_id, NULL as store_name, bank_name as title, NULL as subtitle, amount, type, 'completed' as status, 
  NULL as payment_method, matched_os_number as os_number, occurred_at, COALESCE(target_date, TO_CHAR(occurred_at, 'YYYY-MM-DD')::date) as target_date, created_at,
  'bank' as icon_type, fitid, cnpj_cpf, counterpart_name, NULL::numeric as previous_balance, NULL::numeric as gross_amount, NULL::numeric as fee_amount, 'ofx' as source, import_batch_id
FROM ofx_transactions
UNION ALL
SELECT 
  id, store_id, NULL as store_name, machine_name as title, NULL as subtitle, net_amount as amount, 'in' as type, 'completed' as status,
  payment_method, matched_os_number as os_number, occurred_at, COALESCE(target_date, TO_CHAR(occurred_at, 'YYYY-MM-DD')::date) as target_date, created_at,
  'card' as icon_type, NULL as fitid, NULL as cnpj_cpf, NULL as counterpart_name, NULL::numeric as previous_balance, gross_amount, fee_amount, 'rede' as source, import_batch_id
FROM pos_transactions;
