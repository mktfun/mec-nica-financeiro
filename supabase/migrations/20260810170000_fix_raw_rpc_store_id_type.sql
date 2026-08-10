-- ==============================================================================
-- Migration: 150-fix-raw-data-modals
-- Descrição: Corrige as 3 RPCs de raw data: store_id era uuid mas é text no schema.
--            Corrige também filtros de data (target_date onde existir).
-- ==============================================================================

-- DROP das funções antigas (assinatura uuid) para poder recriar com text
DROP FUNCTION IF EXISTS get_raw_os_data(uuid, date);
DROP FUNCTION IF EXISTS get_raw_rede_data(uuid, date);
DROP FUNCTION IF EXISTS get_raw_ofx_data(uuid, date);


-- 1. RPC para dados brutos do Pátio (OS)
-- store_id em patio_os é TEXT. Filtro de data: opened_at::date (sem target_date nessa tabela)
CREATE OR REPLACE FUNCTION get_raw_os_data(p_store_id text, p_date date)
RETURNS TABLE (
  os_number text,
  opened_at timestamp with time zone,
  closed_at timestamp with time zone,
  status text,
  total_value numeric,
  paid_value numeric,
  remaining_value numeric,
  payment_method text,
  credit_debit_value numeric,
  pix_transfer_value numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    po.os_number,
    po.opened_at,
    po.closed_at,
    po.status,
    po.total_value,
    po.paid_value,
    COALESCE(po.total_value, 0) - COALESCE(po.paid_value, 0) AS remaining_value,
    po.payment_method,
    po.credit_debit_value,
    po.pix_transfer_value
  FROM patio_os po
  WHERE po.store_id = p_store_id
    AND po.opened_at::date = p_date
  ORDER BY po.opened_at DESC;
END;
$$;


-- 2. RPC para dados brutos da Rede (Maquininha)
-- store_id em pos_transactions é TEXT. Usar target_date (campo date nativo).
CREATE OR REPLACE FUNCTION get_raw_rede_data(p_store_id text, p_date date)
RETURNS TABLE (
  id uuid,
  machine_name text,
  payment_method text,
  gross_amount numeric,
  net_amount numeric,
  fee_amount numeric,
  fee_percentage numeric,
  matched_os_number text,
  occurred_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.id,
    pt.machine_name,
    pt.payment_method,
    pt.gross_amount,
    pt.net_amount,
    pt.fee_amount,
    CASE 
      WHEN pt.gross_amount IS NOT NULL AND pt.gross_amount > 0 
        THEN ROUND((pt.fee_amount / pt.gross_amount) * 100, 2)
      ELSE 0
    END AS fee_percentage,
    pt.matched_os_number,
    pt.occurred_at
  FROM pos_transactions pt
  WHERE pt.store_id = p_store_id
    AND pt.target_date = p_date
  ORDER BY pt.occurred_at DESC;
END;
$$;


-- 3. RPC para dados brutos do Extrato OFX (Banco)
-- store_id em ofx_transactions é TEXT. Usar target_date.
-- stores.id é UUID real → cast p_store_id::uuid
CREATE OR REPLACE FUNCTION get_raw_ofx_data(p_store_id text, p_date date)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_limit numeric;
  v_previous_balance numeric;
  v_transactions json;
BEGIN
  -- Buscar limite da conta (stores.id é uuid)
  SELECT account_limit INTO v_account_limit
  FROM stores
  WHERE id = p_store_id::uuid;

  -- Buscar saldo anterior (reconciliations — usar date text como antes)
  SELECT bank_total INTO v_previous_balance
  FROM reconciliations
  WHERE store_id = p_store_id 
    AND date < p_date::text
  ORDER BY date DESC
  LIMIT 1;

  -- Buscar transações do lote pelo target_date
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', ot.id,
      'amount', ot.amount,
      'type', ot.type,
      'description', COALESCE(ot.counterpart_name, ot.bank_name),
      'occurred_at', ot.occurred_at,
      'fitid', ot.fitid,
      'matched_os_number', ot.matched_os_number
    ) ORDER BY ot.occurred_at DESC
  ), '[]'::json) INTO v_transactions
  FROM ofx_transactions ot
  WHERE ot.store_id = p_store_id
    AND ot.target_date = p_date;

  RETURN json_build_object(
    'account_limit', v_account_limit,
    'previous_balance', v_previous_balance,
    'transactions', v_transactions
  );
END;
$$;

-- Permissões para usuários autenticados
GRANT EXECUTE ON FUNCTION get_raw_os_data(text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_raw_rede_data(text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_raw_ofx_data(text, date) TO authenticated;
