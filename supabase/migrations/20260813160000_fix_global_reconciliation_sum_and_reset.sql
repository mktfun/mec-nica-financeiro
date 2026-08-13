-- Migration: fix_global_reconciliation_sum_and_reset
-- Description: Corrige a soma global de saldo bancário e reseta snapshots do dia 11/08

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
    -- Trazemos o saldo real gravado das reconciliations
    recon_banco AS (
        SELECT DISTINCT ON (store_id) store_id, bank_total
        FROM reconciliations WHERE date <= p_date ORDER BY store_id, date DESC
    ),
    store_totals AS (
        SELECT 
            s.id as store_id,
            COALESCE(rb.bank_total, 0) as saldo_banco_itau_real,
            COALESCE(prev.v, 0) as faturamento_previsto,
            COALESCE(saidas.v, 0) as valor_contas,
            COALESCE(patio.v, 0) + COALESCE(estoque.v, 0) as na_loja,
            COALESCE(r.faturamento_loja, 0) as faturamento_loja,
            COALESCE(maq.v, 0) + COALESCE(pix.v, 0) as faturamento_banco_in
        FROM stores s
        LEFT JOIN maq ON maq.store_id = s.id
        LEFT JOIN pix ON pix.store_id = s.id
        LEFT JOIN saidas ON saidas.store_id = s.id
        LEFT JOIN prev ON prev.store_id = s.id
        LEFT JOIN patio ON patio.store_id = s.id
        LEFT JOIN estoque ON estoque.store_id = s.id
        LEFT JOIN recon r ON r.store_id = s.id
        LEFT JOIN recon_banco rb ON rb.store_id = s.id
    )
    SELECT 
        COALESCE(SUM(saldo_banco_itau_real), 0), -- Saldo Itaú é estritamente a soma dos bancos reais (Jabaquara 39.8k etc)
        COALESCE(SUM(0), 0), -- dinheiroMp (Não tocamos, vem do manual no Frontend ou RPC macro)
        COALESCE(SUM(faturamento_previsto), 0), -- aReceber macro
        COALESCE(SUM(na_loja), 0), 
        COALESCE(SUM(saldo_banco_itau_real), 0), -- cxatual
        COALESCE(SUM(saldo_banco_itau_real - valor_contas), 0), -- fluxo
        COALESCE(SUM(faturamento_loja), 0), -- fatura
        COALESCE(SUM(faturamento_banco_in), 0), -- disp_contas
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
$function$;

DO $$
BEGIN
    -- Saneamento: Apagar os logs legados com valores de 6.5M sem decimais da Jabaquara e cia
    DELETE FROM dashboard_daily_logs WHERE date = '2026-08-11';
    DELETE FROM conciliation_daily_logs WHERE date = '2026-08-11';
    DELETE FROM reconciliations WHERE date = '2026-08-11';
END $$;
