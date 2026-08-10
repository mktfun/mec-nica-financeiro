-- ==============================================================================
-- Migration: 155-historical-patio-os
-- Descrição: Altera a regra de extração da métrica "Na Loja OS" (Pátio OS)
--            para contabilizar cumulativamente todas as OS legadas não pagas.
-- ==============================================================================

-- 1. calculate_daily_conciliation (Acumula OS devedoras)
CREATE OR REPLACE FUNCTION calculate_daily_conciliation(p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    store_record RECORD;
    v_faturamento_banco numeric;
    v_maquininha numeric;
    v_pix numeric;
    v_na_loja_os numeric;
    v_previsto_ofx numeric;
    v_diferenca numeric;
    v_status text;
    v_result jsonb := '[]'::jsonb;
    v_historical_na_loja numeric;
    v_has_historical boolean;
BEGIN
    FOR store_record IN SELECT id, name FROM stores LOOP
        SELECT EXISTS(SELECT 1 FROM reconciliations WHERE store_id = store_record.id AND date = p_date) INTO v_has_historical;
        
        IF v_has_historical THEN
            SELECT COALESCE(bank_total, 0), COALESCE(na_loja_os, NULL) 
            INTO v_faturamento_banco, v_historical_na_loja
            FROM reconciliations 
            WHERE store_id = store_record.id AND date = p_date
            LIMIT 1;
        ELSE
            v_faturamento_banco := 0;
            v_historical_na_loja := NULL;
        END IF;

        SELECT COALESCE(SUM(gross_amount), COALESCE(SUM(amount), 0)) INTO v_maquininha 
        FROM transactions 
        WHERE store_id = store_record.id AND target_date = p_date AND type = 'in' AND source IN ('rede', 'maquininha');

        SELECT COALESCE(SUM(amount), 0) INTO v_previsto_ofx 
        FROM transactions 
        WHERE store_id = store_record.id AND target_date = p_date AND type = 'in' AND source = 'ofx';

        SELECT COALESCE(SUM(
            CASE 
                WHEN COALESCE(pix_transfer_value, 0) > 0 THEN COALESCE(pix_transfer_value, 0)
                WHEN payment_method ILIKE '%pix%' OR payment_method ILIKE '%transfer%' THEN COALESCE(paid_value, total_value, 0)
                ELSE 0
            END
        ), 0) INTO v_pix
        FROM patio_os
        WHERE store_id = store_record.id 
          AND (opened_at::date = p_date OR closed_at::date = p_date); 

        IF v_historical_na_loja IS NOT NULL THEN
            v_na_loja_os := v_historical_na_loja;
        ELSE
            -- (MUDANÇA SPEC 155) Busca todo o acumulado pendente até a data, não só as abertas no p_date.
            SELECT COALESCE(SUM(COALESCE(total_value, 0) - COALESCE(paid_value, 0)), 0) INTO v_na_loja_os
            FROM patio_os
            WHERE store_id = store_record.id 
              AND opened_at::date <= p_date
              AND (
                  (COALESCE(total_value, 0) - COALESCE(paid_value, 0)) > 0
                  OR closed_at::date = p_date
                  OR opened_at::date = p_date
              );
        END IF;

        v_diferenca := v_previsto_ofx - (v_maquininha + v_pix);
        v_status := CASE WHEN v_diferenca >= -1 THEN 'approved' ELSE 'divergence' END;

        INSERT INTO conciliation_daily_logs (
            date, store_id, faturamento_banco, maquininha, pix, na_loja_os, previsto_ofx, diferenca, status
        ) VALUES (
            p_date, store_record.id, v_faturamento_banco, v_maquininha, v_pix, v_na_loja_os, v_previsto_ofx, v_diferenca, v_status
        )
        ON CONFLICT (date, store_id) DO UPDATE SET
            faturamento_banco = EXCLUDED.faturamento_banco,
            maquininha = EXCLUDED.maquininha,
            pix = EXCLUDED.pix,
            na_loja_os = EXCLUDED.na_loja_os,
            previsto_ofx = EXCLUDED.previsto_ofx,
            diferenca = EXCLUDED.diferenca,
            status = EXCLUDED.status,
            updated_at = now();
            
        v_result := v_result || jsonb_build_object(
            'store_id', store_record.id,
            'store_name', store_record.name,
            'faturamento_banco', v_faturamento_banco,
            'maquininha', v_maquininha,
            'pix', v_pix,
            'na_loja_os', v_na_loja_os,
            'previsto_ofx', v_previsto_ofx,
            'diferenca', v_diferenca,
            'status', v_status
        );
    END LOOP;
    
    RETURN v_result;
END;
$$;


-- 2. get_raw_os_data (Acumula para a Tabela Bruta / Extrato)
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
    AND po.opened_at::date <= p_date
    AND (
        (COALESCE(po.total_value, 0) - COALESCE(po.paid_value, 0)) > 0
        OR po.closed_at::date = p_date
        OR po.opened_at::date = p_date
    );
END;
$$;


-- 3. get_conciliation_breakdown (Acumula para a View Modal de Detalhes)
CREATE OR REPLACE FUNCTION get_conciliation_breakdown(p_store_id text, p_date date)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ofx_in json;
  v_ofx_out json;
  v_ofx_out_total numeric;
  v_na_loja_detail json;
  v_na_loja_current numeric;
  v_na_loja_previous numeric;
  v_na_loja_os numeric;
  v_juros_rede numeric;
  v_taxas_detail json;
  v_has_snapshot boolean;
  v_na_loja_os_source text;
BEGIN
  SELECT EXISTS(SELECT 1 FROM reconciliations WHERE store_id = p_store_id AND date = p_date) INTO v_has_snapshot;

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

  IF v_has_snapshot THEN
    SELECT COALESCE(na_loja_os, 0) INTO v_na_loja_os
    FROM reconciliations
    WHERE store_id = p_store_id AND date = p_date
    LIMIT 1;
    v_na_loja_os_source := 'snapshot_reconciliations';
  ELSE
    SELECT COALESCE(SUM(COALESCE(total_value, 0) - COALESCE(paid_value, 0)), 0) INTO v_na_loja_os
    FROM patio_os
    WHERE store_id = p_store_id
      AND opened_at::date <= p_date
      AND (
          (COALESCE(total_value, 0) - COALESCE(paid_value, 0)) > 0
          OR closed_at::date = p_date
          OR opened_at::date = p_date
      );
    v_na_loja_os_source := 'realtime_patio_os';
  END IF;

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
    AND opened_at::date <= p_date
    AND (
        (COALESCE(total_value, 0) - COALESCE(paid_value, 0)) > 0
        OR closed_at::date = p_date
        OR opened_at::date = p_date
    );

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
    AND po.opened_at::date <= p_date
    AND (
        (COALESCE(po.total_value, 0) - COALESCE(po.paid_value, 0)) > 0
        OR po.closed_at::date = p_date
        OR po.opened_at::date = p_date
    );

  SELECT COALESCE(SUM(fee_amount), 0) INTO v_juros_rede
  FROM pos_transactions
  WHERE store_id = p_store_id AND occurred_at::date = p_date;

  SELECT COALESCE(json_agg(
    json_build_object(
      'id',             pt.id::text,
      'occurred_at',    pt.occurred_at,
      'machine_name',   pt.machine_name,
      'gross_amount',   pt.gross_amount,
      'fee_amount',     pt.fee_amount,
      'fee_percentage', CASE WHEN pt.gross_amount > 0 THEN ROUND((pt.fee_amount / pt.gross_amount) * 100, 2) ELSE 0 END,
      'net_amount',     pt.net_amount
    ) ORDER BY pt.occurred_at DESC
  ), '[]'::json) INTO v_taxas_detail
  FROM pos_transactions pt
  WHERE pt.store_id = p_store_id AND pt.occurred_at::date = p_date;

  RETURN json_build_object(
    'ofx_in', json_build_object(
      'total', (SELECT COALESCE(SUM(amount), 0) FROM ofx_transactions WHERE store_id = p_store_id AND target_date = p_date AND type = 'in'),
      'transactions', v_ofx_in
    ),
    'ofx_out', json_build_object(
      'total', v_ofx_out_total,
      'transactions', v_ofx_out
    ),
    'na_loja', json_build_object(
      'total', v_na_loja_os,
      'current_month', v_na_loja_current,
      'previous_month', v_na_loja_previous,
      'source', v_na_loja_os_source,
      'transactions', v_na_loja_detail
    ),
    'taxas_rede', json_build_object(
      'total', v_juros_rede,
      'transactions', v_taxas_detail
    )
  );
END;
$$;
