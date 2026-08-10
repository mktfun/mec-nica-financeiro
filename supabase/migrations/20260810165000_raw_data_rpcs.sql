-- ==============================================================================
-- Migration: 149-conciliation-details (Raw Data RPCs)
-- Descrição: Criação de funções RPC para inspeção detalhada dos arquivos 
--            brutos importados, isolando regras de negócio no banco.
-- ==============================================================================

-- 1. RPC para dados brutos do Pátio (OS)
CREATE OR REPLACE FUNCTION get_raw_os_data(p_store_id uuid, p_date date)
RETURNS TABLE (
  os_number text,
  opened_at timestamp with time zone,
  closed_at timestamp with time zone,
  status text,
  total_value numeric,
  paid_value numeric,
  remaining_value numeric,
  payment_method text
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
    po.payment_method
  FROM patio_os po
  WHERE po.store_id = p_store_id
    AND po.opened_at::date = p_date;
END;
$$;


-- 2. RPC para dados brutos da Rede (Maquininha)
CREATE OR REPLACE FUNCTION get_raw_rede_data(p_store_id uuid, p_date date)
RETURNS TABLE (
  id uuid,
  gross_amount numeric,
  net_amount numeric,
  fee_amount numeric,
  fee_percentage numeric,
  matched_os_number text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.id,
    pt.gross_amount,
    pt.net_amount,
    pt.fee_amount,
    CASE 
      WHEN pt.gross_amount > 0 THEN (pt.fee_amount / pt.gross_amount) * 100
      ELSE 0
    END AS fee_percentage,
    pt.matched_os_number
  FROM pos_transactions pt
  WHERE pt.store_id = p_store_id
    AND TO_CHAR(pt.occurred_at, 'YYYY-MM-DD')::date = p_date;
END;
$$;


-- 3. RPC para dados brutos do Extrato OFX (Banco)
CREATE OR REPLACE FUNCTION get_raw_ofx_data(p_store_id uuid, p_date date)
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
  -- Buscar limite da conta
  SELECT account_limit INTO v_account_limit
  FROM stores
  WHERE id = p_store_id;

  -- Buscar saldo anterior (reconciliations do fechamento passado)
  SELECT bank_total INTO v_previous_balance
  FROM reconciliations
  WHERE store_id = p_store_id 
    AND date < p_date::text
  ORDER BY date DESC
  LIMIT 1;

  -- Buscar transações do lote daquele dia
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', ot.id,
      'amount', ot.amount,
      'type', ot.type,
      'description', ot.bank_name,
      'occurred_at', ot.occurred_at,
      'fitid', ot.fitid,
      'matched_os_number', ot.matched_os_number
    )
  ), '[]'::json) INTO v_transactions
  FROM ofx_transactions ot
  WHERE ot.store_id = p_store_id
    AND TO_CHAR(ot.occurred_at, 'YYYY-MM-DD')::date = p_date;

  RETURN json_build_object(
    'account_limit', v_account_limit,
    'previous_balance', v_previous_balance,
    'transactions', v_transactions
  );
END;
$$;

-- Permissões para usuários autenticados
GRANT EXECUTE ON FUNCTION get_raw_os_data(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_raw_rede_data(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_raw_ofx_data(uuid, date) TO authenticated;
