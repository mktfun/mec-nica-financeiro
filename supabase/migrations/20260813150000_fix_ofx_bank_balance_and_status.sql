-- Migration: fix_ofx_bank_balance_and_status
-- Description: Implementação de filtro rigoroso na CTE patio para ignorar OSs finalizadas e correção de valores inflados

CREATE OR REPLACE FUNCTION calculate_daily_conciliation(p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
BEGIN
    WITH recon AS (
        SELECT DISTINCT ON (store_id) store_id, bank_total as faturamento_banco, na_loja_os as historical_na_loja
        FROM reconciliations
        WHERE date <= p_date
        ORDER BY store_id, date DESC
    ),
    maq AS (
        SELECT store_id, COALESCE(SUM(amount), 0) as maquininha
        FROM ofx_transactions 
        WHERE target_date = p_date AND type = 'in' AND (description ILIKE '%REDE%' OR description ILIKE '%MAQUINA%')
        GROUP BY store_id
    ),
    pix AS (
        SELECT store_id, COALESCE(SUM(amount), 0) as pix
        FROM ofx_transactions 
        WHERE target_date = p_date AND type = 'in' AND (description ILIKE '%PIX%' OR fitid ILIKE '%PIX%')
        GROUP BY store_id
    ),
    prev AS (
        SELECT store_id, COALESCE(SUM(amount), 0) as previsto_ofx
        FROM ofx_transactions 
        WHERE target_date = p_date AND type = 'in'
        GROUP BY store_id
    ),
    patio AS (
        SELECT store_id, COALESCE(SUM(COALESCE(total_value, 0) - COALESCE(paid_value, 0)), 0) as patio_os_sum
        FROM patio_os
        WHERE opened_at::date <= p_date
          AND LOWER(status) NOT IN ('finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado')
          AND (
              (COALESCE(total_value, 0) - COALESCE(paid_value, 0)) > 0
              OR closed_at::date = p_date
              OR opened_at::date = p_date
          )
        GROUP BY store_id
    ),
    estoque AS (
        SELECT store_id, COALESCE(SUM(valor_os), 0) as estoque_os_sum
        FROM estoque_os_pendente
        WHERE status = 'PENDENTE' AND data_os <= p_date
        GROUP BY store_id
    ),
    store_data AS (
        SELECT 
            s.id as store_id,
            s.name as store_name,
            COALESCE(r.faturamento_banco, 0) as faturamento_banco,
            COALESCE(m.maquininha, 0) as maquininha,
            COALESCE(px.pix, 0) as pix,
            COALESCE(pv.previsto_ofx, 0) as previsto_ofx,
            CASE 
                WHEN r.historical_na_loja IS NOT NULL THEN r.historical_na_loja
                ELSE COALESCE(pt.patio_os_sum, 0) + COALESCE(e.estoque_os_sum, 0)
            END as na_loja_os
        FROM stores s
        LEFT JOIN recon r ON r.store_id = s.id
        LEFT JOIN maq m ON m.store_id = s.id
        LEFT JOIN pix px ON px.store_id = s.id
        LEFT JOIN prev pv ON pv.store_id = s.id
        LEFT JOIN patio pt ON pt.store_id = s.id
        LEFT JOIN estoque e ON e.store_id = s.id
    ),
    calculated AS (
        SELECT 
            *,
            (previsto_ofx - (maquininha + pix)) as diferenca,
            CASE WHEN (previsto_ofx - (maquininha + pix)) >= -1 THEN 'approved' ELSE 'divergence' END as status
        FROM store_data
    )
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'store_id', store_id,
            'store_name', store_name,
            'faturamento_banco', faturamento_banco,
            'maquininha', maquininha,
            'pix', pix,
            'na_loja_os', na_loja_os,
            'previsto_ofx', previsto_ofx,
            'diferenca', diferenca,
            'status', status
        )
    ), '[]'::jsonb) INTO v_result
    FROM calculated;

    -- Upsert the calculated results into conciliation_daily_logs
    INSERT INTO conciliation_daily_logs (
        date, store_id, faturamento_banco, maquininha, pix, na_loja_os, previsto_ofx, diferenca, status
    )
    SELECT 
        p_date,
        (elem->>'store_id')::uuid,
        (elem->>'faturamento_banco')::numeric,
        (elem->>'maquininha')::numeric,
        (elem->>'pix')::numeric,
        (elem->>'na_loja_os')::numeric,
        (elem->>'previsto_ofx')::numeric,
        (elem->>'diferenca')::numeric,
        elem->>'status'
    FROM jsonb_array_elements(v_result) as elem
    ON CONFLICT (date, store_id) DO UPDATE SET
        faturamento_banco = EXCLUDED.faturamento_banco,
        maquininha = EXCLUDED.maquininha,
        pix = EXCLUDED.pix,
        na_loja_os = EXCLUDED.na_loja_os,
        previsto_ofx = EXCLUDED.previsto_ofx,
        diferenca = EXCLUDED.diferenca,
        status = EXCLUDED.status,
        updated_at = now();

    RETURN v_result;
END;
$$;


CREATE OR REPLACE FUNCTION get_dashboard_metrics(p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
    v_total_saldo numeric;
    v_total_dinheiro numeric;
    v_total_areceber numeric;
    v_total_naloja numeric;
    v_total_cxatual numeric;
    v_total_fluxo numeric;
    v_total_fatura numeric;
    v_total_disp_contas numeric;
    v_total_contas numeric;
BEGIN
    WITH maq AS (
        SELECT store_id, COALESCE(SUM(amount), 0) as v FROM ofx_transactions WHERE target_date = p_date AND type = 'in' AND (description ILIKE '%REDE%' OR description ILIKE '%MAQUINA%') GROUP BY store_id
    ),
    pix AS (
        SELECT store_id, COALESCE(SUM(amount), 0) as v FROM ofx_transactions WHERE target_date = p_date AND type = 'in' AND (description ILIKE '%PIX%' OR fitid ILIKE '%PIX%') GROUP BY store_id
    ),
    saidas AS (
        SELECT store_id, ABS(COALESCE(SUM(amount), 0)) as v FROM ofx_transactions WHERE target_date = p_date AND type = 'out' GROUP BY store_id
    ),
    prev AS (
        SELECT store_id, COALESCE(SUM(amount), 0) as v FROM ofx_transactions WHERE target_date = p_date AND type = 'in' GROUP BY store_id
    ),
    patio AS (
        SELECT store_id, COALESCE(SUM(COALESCE(total_value, 0) - COALESCE(paid_value, 0)), 0) as v
        FROM patio_os 
        WHERE opened_at::date <= p_date 
          AND LOWER(status) NOT IN ('finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado')
          AND ((COALESCE(total_value, 0) - COALESCE(paid_value, 0)) > 0 OR closed_at::date = p_date OR opened_at::date = p_date) 
        GROUP BY store_id
    ),
    estoque AS (
        SELECT store_id, COALESCE(SUM(valor_os), 0) as v FROM estoque_os_pendente WHERE status = 'PENDENTE' AND data_os <= p_date GROUP BY store_id
    ),
    recon AS (
        SELECT DISTINCT ON (store_id) store_id, faturamento as faturamento_loja, contas_a_pagar
        FROM daily_snapshots WHERE date <= p_date ORDER BY store_id, date DESC
    ),
    store_totals AS (
        SELECT 
            s.id as store_id,
            COALESCE(maq.v, 0) + COALESCE(pix.v, 0) as faturamento_banco,
            COALESCE(prev.v, 0) as faturamento_previsto,
            COALESCE(saidas.v, 0) as valor_contas,
            COALESCE(patio.v, 0) + COALESCE(estoque.v, 0) as na_loja,
            COALESCE(r.faturamento_loja, 0) as faturamento_loja
        FROM stores s
        LEFT JOIN maq ON maq.store_id = s.id
        LEFT JOIN pix ON pix.store_id = s.id
        LEFT JOIN saidas ON saidas.store_id = s.id
        LEFT JOIN prev ON prev.store_id = s.id
        LEFT JOIN patio ON patio.store_id = s.id
        LEFT JOIN estoque ON estoque.store_id = s.id
        LEFT JOIN recon r ON r.store_id = s.id
    )
    SELECT 
        COALESCE(SUM(faturamento_banco), 0), 
        COALESCE(SUM(0), 0), -- dinheiroMp
        COALESCE(SUM(faturamento_previsto), 0), 
        COALESCE(SUM(na_loja), 0), 
        COALESCE(SUM(faturamento_banco), 0), 
        COALESCE(SUM(faturamento_banco - valor_contas), 0), 
        COALESCE(SUM(faturamento_loja), 0), 
        COALESCE(SUM(faturamento_banco), 0), 
        COALESCE(SUM(valor_contas), 0)
    INTO 
        v_total_saldo, v_total_dinheiro, v_total_areceber, v_total_naloja, v_total_cxatual, 
        v_total_fluxo, v_total_fatura, v_total_disp_contas, v_total_contas
    FROM store_totals;

    v_result := jsonb_build_object(
        'dataAtual', p_date,
        'saldoTotal', v_total_saldo,
        'dinheiroMp', v_total_dinheiro,
        'aReceber', v_total_areceber,
        'naLoja', v_total_naloja,
        'caixaAtual', v_total_cxatual,
        'fluxoCx', v_total_fluxo,
        'fatura', v_total_fatura,
        'valorDispContas', v_total_disp_contas,
        'valorContas', v_total_contas,
        'diferenca', v_total_areceber - v_total_saldo
    );

    RETURN v_result;
END;
$$;

-- Sanitização retrospectiva
DO $$
BEGIN
    UPDATE reconciliations 
    SET bank_total = bank_total / 100 
    WHERE bank_total > 500000;

    UPDATE conciliation_daily_logs
    SET faturamento_banco = faturamento_banco / 100
    WHERE faturamento_banco > 500000;
END $$;
