-- Migration: Fila de Órfãos
-- Adds manual category and justification to source tables for manual matching.

ALTER TABLE public.ofx_transactions 
ADD COLUMN IF NOT EXISTS manual_category TEXT,
ADD COLUMN IF NOT EXISTS manual_justification TEXT;

ALTER TABLE public.pos_transactions 
ADD COLUMN IF NOT EXISTS manual_category TEXT,
ADD COLUMN IF NOT EXISTS manual_justification TEXT;

ALTER TABLE public.manual_transactions 
ADD COLUMN IF NOT EXISTS manual_category TEXT,
ADD COLUMN IF NOT EXISTS manual_justification TEXT;

-- Drop da view antiga
DROP VIEW IF EXISTS public.transactions;

-- Recriar a view com as novas colunas
CREATE OR REPLACE VIEW public.transactions AS
SELECT 
  id, store_id, store_name, title, subtitle, amount, type, 'completed' as status, payment_method, os_number, occurred_at, target_date::date, created_at,
  icon_type, NULL as fitid, NULL as cnpj_cpf, NULL as counterpart_name, NULL::numeric as previous_balance, gross_amount, fee_amount, source, NULL::uuid as import_batch_id,
  manual_category, manual_justification
FROM manual_transactions
UNION ALL
SELECT 
  id, store_id, NULL as store_name, bank_name as title, NULL as subtitle, amount, type, 'completed' as status, 
  NULL as payment_method, matched_os_number as os_number, occurred_at, COALESCE(target_date, TO_CHAR(occurred_at, 'YYYY-MM-DD')::date) as target_date, created_at,
  'bank' as icon_type, fitid, cnpj_cpf, counterpart_name, NULL::numeric as previous_balance, NULL::numeric as gross_amount, NULL::numeric as fee_amount, 'ofx' as source, import_batch_id,
  manual_category, manual_justification
FROM ofx_transactions
UNION ALL
SELECT 
  id, store_id, NULL as store_name, machine_name as title, NULL as subtitle, net_amount as amount, 'in' as type, 'completed' as status,
  payment_method, matched_os_number as os_number, occurred_at, COALESCE(target_date, TO_CHAR(occurred_at, 'YYYY-MM-DD')::date) as target_date, created_at,
  'card' as icon_type, NULL as fitid, NULL as cnpj_cpf, NULL as counterpart_name, NULL::numeric as previous_balance, gross_amount, fee_amount, 'rede' as source, import_batch_id,
  manual_category, manual_justification
FROM pos_transactions;

-- Criação da RPC para categorizar uma transação órfã
CREATE OR REPLACE FUNCTION public.categorize_orphan_transaction(
    p_tx_id UUID,
    p_category TEXT,
    p_justification TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_tx JSONB;
BEGIN
    -- Try updating ofx_transactions first
    UPDATE public.ofx_transactions
    SET 
        manual_category = p_category,
        manual_justification = p_justification,
        updated_at = NOW()
    WHERE id = p_tx_id
    RETURNING to_jsonb(ofx_transactions.*) INTO v_updated_tx;

    IF v_updated_tx IS NOT NULL THEN
        RETURN v_updated_tx;
    END IF;

    -- Try pos_transactions
    UPDATE public.pos_transactions
    SET 
        manual_category = p_category,
        manual_justification = p_justification,
        updated_at = NOW()
    WHERE id = p_tx_id
    RETURNING to_jsonb(pos_transactions.*) INTO v_updated_tx;

    IF v_updated_tx IS NOT NULL THEN
        RETURN v_updated_tx;
    END IF;

    -- Try manual_transactions
    UPDATE public.manual_transactions
    SET 
        manual_category = p_category,
        manual_justification = p_justification,
        updated_at = NOW()
    WHERE id = p_tx_id
    RETURNING to_jsonb(manual_transactions.*) INTO v_updated_tx;

    IF v_updated_tx IS NOT NULL THEN
        RETURN v_updated_tx;
    END IF;

    RAISE EXCEPTION 'Transaction with ID % not found in any source table', p_tx_id;
END;
$$;
