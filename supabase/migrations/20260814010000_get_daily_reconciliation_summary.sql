-- Migration: get_daily_reconciliation_summary
-- Description: RPC de alta performance que consolida todos os saldos bancários, movimentações OFX/REDE, entradas manuais e matemática de fechamento diário no PostgreSQL em < 50ms.

CREATE OR REPLACE FUNCTION public.get_daily_reconciliation_summary(p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
    v_total_saldo_banco numeric := 0;
    v_dinheiro_mp numeric := 0;
    v_a_receber numeric := 0;
    v_na_loja_os numeric := 0;
    v_contas_manual numeric := 0;
    v_juros_rede numeric := 0;
    v_ofx_out numeric := 0;
    v_total_faturamento_ofx numeric := 0;
    v_caixa_anterior numeric := 0;
    v_faturamento_anterior numeric := 0;
    v_caixa_atual numeric := 0;
    v_fluxo_caixa numeric := 0;
    v_faturamento_periodo numeric := 0;
    v_valor_disp_contas numeric := 0;
    v_subtotal_contas numeric := 0;
    v_diferenca_final numeric := 0;
    v_status_geral text := 'approved';
    v_stores_list jsonb := '[]'::jsonb;
BEGIN
    -- 1. Obter os dados do snapshot do dia atual (inputs manuais gravados)
    SELECT 
        COALESCE(dinheiro_mp, 0),
        COALESCE(a_receber_manual, 0),
        COALESCE(contas_a_pagar, 0),
        COALESCE(juros_rede, 0)
    INTO 
        v_dinheiro_mp,
        v_a_receber,
        v_contas_manual,
        v_juros_rede
    FROM daily_snapshots
    WHERE date = p_date;

    -- 2. Obter Caixa Anterior e Faturamento Anterior (do fechamento imediatamente anterior)
    SELECT 
        COALESCE(caixa_atual, 0),
        COALESCE(faturamento, 0)
    INTO 
        v_caixa_anterior,
        v_faturamento_anterior
    FROM daily_snapshots
    WHERE date < p_date
    ORDER BY date DESC
    LIMIT 1;

    -- Se não houver snapshot anterior (ex: Marco Zero ou primeiro dia), busca no metadata do snapshot atual
    IF v_caixa_anterior = 0 THEN
        SELECT 
            COALESCE((metadata->>'caixa_anterior')::numeric, 0),
            COALESCE((metadata->>'faturamento_anterior')::numeric, 0)
        INTO 
            v_caixa_anterior,
            v_faturamento_anterior
        FROM daily_snapshots
        WHERE date = p_date;
    END IF;

    -- 3. Juros/Taxas reais da maquininha REDE (se não gravado manualmente no snapshot)
    IF v_juros_rede = 0 THEN
        SELECT COALESCE(SUM(fee_amount), 0)
        INTO v_juros_rede
        FROM pos_transactions
        WHERE target_date = p_date;
    END IF;

    -- 4. Total de Saídas (OFX Out)
    SELECT COALESCE(ABS(SUM(amount)), 0)
    INTO v_ofx_out
    FROM ofx_transactions
    WHERE target_date = p_date AND type = 'out';

    -- 5. Total de Entradas puras do OFX (Faturamento Líquido do dia)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_faturamento_ofx
    FROM ofx_transactions
    WHERE target_date = p_date AND type = 'in';

    -- 6. OS ativas no Pátio (desacopladas do Marco Zero)
    SELECT COALESCE(SUM(COALESCE(total_value, 0) - COALESCE(paid_value, 0)), 0)
    INTO v_na_loja_os
    FROM patio_os
    WHERE opened_at::date <= p_date
      AND LOWER(status) NOT IN ('finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado')
      AND (
          (COALESCE(total_value, 0) - COALESCE(paid_value, 0)) > 0
          OR closed_at::date = p_date
          OR opened_at::date = p_date
      );

    -- 7. Consolidação por Loja (Saldos bancários mais recentes de cada loja até p_date)
    WITH recon_latest AS (
        SELECT DISTINCT ON (store_id) store_id, bank_total, na_loja_os as historical_na_loja
        FROM reconciliations
        WHERE date <= p_date
        ORDER BY store_id, date DESC
    ),
    maq_store AS (
        SELECT store_id, COALESCE(SUM(amount), 0) as maquininha
        FROM ofx_transactions 
        WHERE target_date = p_date AND type = 'in' AND (counterpart_name ILIKE '%REDE%' OR counterpart_name ILIKE '%MAQUINA%' OR fitid ILIKE '%REDE%' OR fitid ILIKE '%MAQUINA%')
        GROUP BY store_id
    ),
    pix_store AS (
        SELECT store_id, COALESCE(SUM(amount), 0) as pix
        FROM ofx_transactions 
        WHERE target_date = p_date AND type = 'in' AND (counterpart_name ILIKE '%PIX%' OR fitid ILIKE '%PIX%')
        GROUP BY store_id
    ),
    prev_store AS (
        SELECT store_id, COALESCE(SUM(amount), 0) as previsto_ofx
        FROM ofx_transactions 
        WHERE target_date = p_date AND type = 'in'
        GROUP BY store_id
    ),
    patio_store AS (
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
    store_calc AS (
        SELECT 
            s.id as store_id,
            s.name as store_name,
            COALESCE(r.bank_total, 0) as saldo_banco,
            COALESCE(m.maquininha, 0) as maquininha,
            COALESCE(px.pix, 0) as pix,
            COALESCE(pv.previsto_ofx, 0) as previsto_ofx,
            COALESCE(pt.patio_os_sum, 0) as na_loja_os,
            (COALESCE(pv.previsto_ofx, 0) - (COALESCE(m.maquininha, 0) + COALESCE(px.pix, 0))) as diferenca,
            CASE 
                WHEN (COALESCE(pv.previsto_ofx, 0) - (COALESCE(m.maquininha, 0) + COALESCE(px.pix, 0))) >= -1 THEN 'approved' 
                ELSE 'divergence' 
            END as status
        FROM stores s
        LEFT JOIN recon_latest r ON r.store_id = s.id
        LEFT JOIN maq_store m ON m.store_id = s.id
        LEFT JOIN pix_store px ON px.store_id = s.id
        LEFT JOIN prev_store pv ON pv.store_id = s.id
        LEFT JOIN patio_store pt ON pt.store_id = s.id
    )
    SELECT 
        COALESCE(SUM(saldo_banco), 0),
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'store_id', store_id,
                'store_name', store_name,
                'saldo_banco', saldo_banco,
                'maquininha', maquininha,
                'pix', pix,
                'na_loja_os', na_loja_os,
                'previsto_ofx', previsto_ofx,
                'diferenca', diferenca,
                'status', status
            )
        ), '[]'::jsonb)
    INTO 
        v_total_saldo_banco,
        v_stores_list
    FROM store_calc;

    -- 8. Matemática da Conciliação Consolidada
    v_caixa_atual := v_total_saldo_banco + v_dinheiro_mp + v_a_receber + v_na_loja_os;
    v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;
    v_faturamento_periodo := v_total_faturamento_ofx;
    v_valor_disp_contas := v_faturamento_periodo - v_fluxo_caixa;
    v_subtotal_contas := v_juros_rede + v_contas_manual;
    v_diferenca_final := ABS(v_valor_disp_contas) - v_subtotal_contas;

    IF ABS(v_diferenca_final) <= 50 THEN
        v_status_geral := 'approved';
    ELSE
        v_status_geral := 'divergence';
    END IF;

    -- 9. Montagem do Objeto JSONB final
    v_result := jsonb_build_object(
        'data_atual', p_date,
        'total_saldo_banco', v_total_saldo_banco,
        'dinheiro_mp', v_dinheiro_mp,
        'a_receber', v_a_receber,
        'na_loja_os', v_na_loja_os,
        'contas_manual', v_contas_manual,
        'juros_rede', v_juros_rede,
        'ofx_out', v_ofx_out,
        'caixa_atual', v_caixa_atual,
        'caixa_anterior', v_caixa_anterior,
        'fluxo_caixa', v_fluxo_caixa,
        'faturamento_ofx', v_total_faturamento_ofx,
        'faturamento_anterior', v_faturamento_anterior,
        'faturamento_periodo', v_faturamento_periodo,
        'valor_disp_contas', v_valor_disp_contas,
        'subtotal_contas', v_subtotal_contas,
        'diferenca_final', v_diferenca_final,
        'status_geral', v_status_geral,
        'stores', v_stores_list
    );

    RETURN v_result;
END;
$$;
