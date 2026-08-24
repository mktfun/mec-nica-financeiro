-- Migration: 20260824000001_overload_get_store_pos_triple_reconciliation.sql
-- Description: Unifica get_store_pos_triple_reconciliation aceitando p_target_date ou p_date como parametros nomeados

DROP FUNCTION IF EXISTS public.get_store_pos_triple_reconciliation(date);
DROP FUNCTION IF EXISTS public.get_store_pos_triple_reconciliation(text);

CREATE OR REPLACE FUNCTION public.get_store_pos_triple_reconciliation(
    p_target_date date DEFAULT NULL,
    p_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_date date;
    v_result jsonb;
    v_total_rede_bruto numeric := 0;
    v_total_rede_liquido numeric := 0;
    v_total_rede_taxas numeric := 0;
    v_total_rede_devolucoes numeric := 0;
    v_total_ofx_maquininhas numeric := 0;
    v_total_nao_entrou numeric := 0;
    v_stores_array jsonb := '[]'::jsonb;
BEGIN
    v_target_date := COALESCE(p_target_date, p_date);
    IF v_target_date IS NULL THEN
        RAISE EXCEPTION 'p_target_date ou p_date deve ser informado.';
    END IF;

    WITH rede_agg AS (
        SELECT 
            store_id,
            COALESCE(SUM(CASE WHEN transaction_type != 'devolucao' THEN gross_amount ELSE 0 END), 0) as rede_bruto,
            COALESCE(SUM(CASE WHEN transaction_type != 'devolucao' THEN net_amount ELSE 0 END), 0) as rede_liquido,
            COALESCE(SUM(CASE WHEN transaction_type != 'devolucao' THEN fee_amount ELSE 0 END), 0) as rede_taxas,
            COALESCE(SUM(CASE WHEN transaction_type = 'devolucao' THEN ABS(net_amount) ELSE 0 END), 0) as rede_devolucoes
        FROM pos_transactions
        WHERE target_date = v_target_date
        GROUP BY store_id
    ),
    ofx_agg AS (
        SELECT 
            store_id,
            COALESCE(SUM(amount), 0) as ofx_maquininhas
        FROM ofx_transactions
        WHERE target_date = v_target_date 
          AND type = 'in'
          AND (
              counterpart_name ILIKE '%REDE%' 
              OR counterpart_name ILIKE '%REDECARD%'
              OR fitid ILIKE '%REDE%'
              OR fitid ILIKE '%CIELO%'
              OR fitid ILIKE '%STONE%'
              OR fitid ILIKE '%PAGSEGURO%'
          )
        GROUP BY store_id
    ),
    store_calc AS (
        SELECT 
            s.id as store_id,
            s.name as store_name,
            COALESCE(r.rede_bruto, 0) as rede_bruto,
            COALESCE(r.rede_liquido, 0) as rede_liquido,
            COALESCE(r.rede_taxas, 0) as rede_taxas,
            COALESCE(r.rede_devolucoes, 0) as rede_devolucoes,
            COALESCE(o.ofx_maquininhas, 0) as ofx_maquininhas,
            CASE 
                WHEN COALESCE(r.rede_liquido, 0) > COALESCE(o.ofx_maquininhas, 0) 
                     AND (COALESCE(r.rede_liquido, 0) - COALESCE(o.ofx_maquininhas, 0)) > 10
                     AND s.id NOT IN ('st-01', 'st-05') 
                THEN (COALESCE(r.rede_liquido, 0) - COALESCE(o.ofx_maquininhas, 0))
                ELSE 0
            END as nao_entrou_valor,
            CASE 
                WHEN COALESCE(r.rede_liquido, 0) = 0 AND COALESCE(o.ofx_maquininhas, 0) = 0 THEN 'sem_movimento'
                WHEN ABS(COALESCE(r.rede_liquido, 0) - COALESCE(o.ofx_maquininhas, 0)) <= 10 THEN 'entrou'
                WHEN COALESCE(o.ofx_maquininhas, 0) = 0 THEN 'nao_entrou'
                ELSE 'parcial'
            END as status_compensacao
        FROM stores s
        LEFT JOIN rede_agg r ON r.store_id = s.id
        LEFT JOIN ofx_agg o ON o.store_id = s.id
        WHERE s.active = true
        ORDER BY s.name
    )
    SELECT 
        COALESCE(SUM(rede_bruto), 0),
        COALESCE(SUM(rede_liquido), 0),
        COALESCE(SUM(rede_taxas), 0),
        COALESCE(SUM(rede_devolucoes), 0),
        COALESCE(SUM(ofx_maquininhas), 0),
        COALESCE(SUM(nao_entrou_valor), 0),
        jsonb_agg(jsonb_build_object(
            'store_id', store_id,
            'store_name', store_name,
            'rede_bruto', rede_bruto,
            'rede_liquido', rede_liquido,
            'rede_taxas', rede_taxas,
            'rede_devolucoes', rede_devolucoes,
            'ofx_maquininhas', ofx_maquininhas,
            'nao_entrou_valor', nao_entrou_valor,
            'status_compensacao', status_compensacao
        ))
    INTO 
        v_total_rede_bruto,
        v_total_rede_liquido,
        v_total_rede_taxas,
        v_total_rede_devolucoes,
        v_total_ofx_maquininhas,
        v_total_nao_entrou,
        v_stores_array
    FROM store_calc;

    v_result := jsonb_build_object(
        'target_date', v_target_date,
        'total_rede_bruto', v_total_rede_bruto,
        'total_rede_liquido', v_total_rede_liquido,
        'total_rede_taxas', v_total_rede_taxas,
        'total_devolucoes', v_total_rede_devolucoes,
        'total_ofx_maquininhas', v_total_ofx_maquininhas,
        'total_nao_entrou', v_total_nao_entrou,
        'stores', v_stores_array
    );

    RETURN v_result;
END;
$$;
