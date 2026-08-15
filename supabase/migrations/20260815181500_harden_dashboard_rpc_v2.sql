-- Migration: 20260815181500_harden_dashboard_rpc_v2.sql
-- Description: RPC get_dashboard_metrics 100% no PostgreSQL com cálculos de odômetro diário, saídas OFX por loja, pátio e diferença do fechamento oficial

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_snap record;
    v_prev_snap record;
    v_prev_prev_snap record;
    
    v_total_saldo numeric := 0;
    v_total_dinheiro numeric := 0;
    v_total_areceber numeric := 0;
    v_total_naloja numeric := 0;
    v_total_veiculos integer := 0;
    v_total_cxatual numeric := 0;
    v_total_cxanterior numeric := 0;
    v_total_fluxo numeric := 0;
    
    v_odometro_hoje numeric := 0;
    v_odometro_ant numeric := 0;
    v_faturamento_atual numeric := 0;
    v_faturamento_anterior numeric := 0;
    v_faturamento_outros numeric := 0;
    v_variacao_faturamento numeric := 0;
    
    v_contas_manual numeric := 0;
    v_juros_rede numeric := 0;
    v_total_contas numeric := 0;
    v_diferenca numeric := 0;
    
    v_por_loja jsonb := '[]'::jsonb;
    v_historico jsonb := '[]'::jsonb;
    v_result jsonb;
BEGIN
    -- 1. Carrega o snapshot da data atual
    SELECT * INTO v_snap FROM public.daily_snapshots WHERE date = p_date;
    
    -- 2. Carrega o snapshot do dia anterior
    SELECT * INTO v_prev_snap FROM public.daily_snapshots WHERE date < p_date ORDER BY date DESC LIMIT 1;
    
    -- 3. Carrega o snapshot de 2 dias antes para calcular o faturamento diário do dia anterior
    IF v_prev_snap.date IS NOT NULL THEN
        SELECT * INTO v_prev_prev_snap FROM public.daily_snapshots WHERE date < v_prev_snap.date ORDER BY date DESC LIMIT 1;
    END IF;

    -- Extração de dados do snapshot atual
    IF v_snap.id IS NOT NULL THEN
        v_odometro_hoje := COALESCE(v_snap.faturamento, 0);
        v_total_dinheiro := COALESCE(v_snap.dinheiro_mp, 0);
        v_total_areceber := COALESCE(v_snap.a_receber_manual, v_snap.total_recebiveis, 0);
        v_contas_manual := COALESCE(v_snap.contas_a_pagar, 0);
        v_juros_rede := COALESCE(v_snap.juros_rede, 0);
        v_faturamento_outros := COALESCE(v_snap.faturamento_outros_valor, 0);
        v_total_cxatual := COALESCE(v_snap.caixa_atual, 0);
        v_total_saldo := COALESCE(v_snap.saldo_bancario, 0);
    END IF;

    -- Odômetro anterior e cálculo do faturamento diário do dia anterior
    IF v_prev_snap.id IS NOT NULL THEN
        v_odometro_ant := COALESCE(v_prev_snap.faturamento, 0);
        v_total_cxanterior := COALESCE(v_prev_snap.caixa_atual, 0);
        
        IF (v_prev_snap.metadata->>'faturamento_anterior') IS NOT NULL AND v_prev_snap.faturamento >= (v_prev_snap.metadata->>'faturamento_anterior')::numeric THEN
            v_faturamento_anterior := v_prev_snap.faturamento - (v_prev_snap.metadata->>'faturamento_anterior')::numeric;
        ELSIF v_prev_prev_snap.id IS NOT NULL AND v_prev_snap.faturamento >= v_prev_prev_snap.faturamento THEN
            v_faturamento_anterior := v_prev_snap.faturamento - v_prev_prev_snap.faturamento;
        ELSE
            v_faturamento_anterior := v_prev_snap.faturamento;
        END IF;
    ELSIF (v_snap.metadata->>'faturamento_anterior') IS NOT NULL THEN
        v_odometro_ant := COALESCE((v_snap.metadata->>'faturamento_anterior')::numeric, 0);
    END IF;

    -- 4. Cálculo do Faturamento do Dia Atual
    IF v_odometro_hoje > 0 AND v_odometro_ant > 0 AND v_odometro_hoje >= v_odometro_ant THEN
        v_faturamento_atual := (v_odometro_hoje - v_odometro_ant) + v_faturamento_outros;
    ELSIF v_odometro_hoje > 0 THEN
        v_faturamento_atual := v_odometro_hoje + v_faturamento_outros;
    ELSE
        SELECT COALESCE(SUM(amount), 0) INTO v_faturamento_atual FROM public.ofx_transactions WHERE target_date = p_date AND type = 'in';
    END IF;

    -- Variação % Faturamento
    IF v_faturamento_anterior > 0 THEN
        v_variacao_faturamento := ((v_faturamento_atual - v_faturamento_anterior) / v_faturamento_anterior) * 100;
    ELSE
        v_variacao_faturamento := 0;
    END IF;

    -- 5. Contas e Despesas
    IF v_contas_manual > 0 THEN
        v_total_contas := v_contas_manual + v_juros_rede;
    ELSE
        SELECT COALESCE(ABS(SUM(amount)), 0) INTO v_total_contas FROM public.ofx_transactions WHERE target_date = p_date AND type = 'out';
        v_total_contas := v_total_contas + v_juros_rede;
    END IF;

    -- 6. Pátio e Saldos por Loja (CTEs Consolidadas)
    WITH store_banks AS (
        SELECT DISTINCT ON (store_id) store_id, bank_total
        FROM public.reconciliations
        WHERE date <= p_date
        ORDER BY store_id, date DESC
    ),
    store_patios AS (
        SELECT 
            store_id, 
            COUNT(id) as veiculos_cnt,
            COALESCE(SUM(COALESCE(total_value, 0) - COALESCE(paid_value, 0)), 0) as total_patio_val
        FROM public.patio_os
        WHERE opened_at::date <= p_date
          AND LOWER(COALESCE(status, '')) NOT IN ('finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado')
          AND ((COALESCE(total_value, 0) - COALESCE(paid_value, 0)) > 0 OR closed_at::date = p_date OR opened_at::date = p_date)
        GROUP BY store_id
    ),
    store_ins AS (
        SELECT store_id, COALESCE(SUM(amount), 0) as fat_val
        FROM public.ofx_transactions
        WHERE target_date = p_date AND type = 'in'
        GROUP BY store_id
    ),
    store_outs AS (
        SELECT store_id, COALESCE(ABS(SUM(amount)), 0) as contas_val
        FROM public.ofx_transactions
        WHERE target_date = p_date AND type = 'out'
        GROUP BY store_id
    ),
    all_stores AS (
        SELECT 
            s.id as store_id,
            s.name as store_name,
            COALESCE(sb.bank_total, 0) as saldo_banco,
            COALESCE(si.fat_val, 0) as faturamento,
            COALESCE(so.contas_val, 0) as contas,
            (COALESCE(si.fat_val, 0) - COALESCE(so.contas_val, 0)) as resultado,
            COALESCE(sp.veiculos_cnt, 0) as veiculos_patio,
            COALESCE(sp.total_patio_val, 0) as na_loja_os,
            'approved'::text as status
        FROM public.stores s
        LEFT JOIN store_banks sb ON sb.store_id = s.id
        LEFT JOIN store_patios sp ON sp.store_id = s.id
        LEFT JOIN store_ins si ON si.store_id = s.id
        LEFT JOIN store_outs so ON so.store_id = s.id
        ORDER BY s.name ASC
    )
    SELECT 
        COALESCE(jsonb_agg(row_to_json(all_stores)::jsonb), '[]'::jsonb),
        COALESCE(SUM(saldo_banco), 0),
        COALESCE(SUM(na_loja_os), 0),
        COALESCE(SUM(veiculos_patio), 0)
    INTO 
        v_por_loja,
        v_total_saldo,
        v_total_naloja,
        v_total_veiculos
    FROM all_stores;

    -- Se o snapshot gravou saldo_bancario ou caixa_atual com override de fechamento, prioriza
    IF v_snap.id IS NOT NULL AND v_snap.caixa_atual > 0 THEN
        v_total_cxatual := v_snap.caixa_atual;
    ELSE
        v_total_cxatual := v_total_saldo + v_total_dinheiro + v_total_areceber + v_total_naloja;
    END IF;

    -- Fluxo de caixa
    IF v_total_cxanterior > 0 THEN
        v_total_fluxo := v_total_cxatual - v_total_cxanterior;
    ELSE
        v_total_fluxo := v_faturamento_atual - v_total_contas;
    END IF;

    -- Diferença da Conciliação
    v_diferenca := (v_total_fluxo + v_total_contas) - v_faturamento_atual;

    -- Se a diferença for insignificante (centavos), zera
    IF ABS(v_diferenca) < 1.0 THEN
        v_diferenca := 0;
    END IF;

    -- 7. Histórico dos últimos 7 dias de fechamentos
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'date', ds.date,
            'saldo', COALESCE(ds.saldo_bancario, 0),
            'faturamento', COALESCE(ds.faturamento, 0),
            'contas', COALESCE(ds.contas_a_pagar, 0)
        ) ORDER BY ds.date ASC
    ), '[]'::jsonb)
    INTO v_historico
    FROM (
        SELECT * FROM public.daily_snapshots 
        WHERE date <= p_date 
        ORDER BY date DESC 
        LIMIT 7
    ) ds;

    v_result := jsonb_build_object(
        'dataAtual', p_date,
        'saldoTotal', v_total_saldo,
        'dinheiroMp', v_total_dinheiro,
        'aReceber', v_total_areceber,
        'naLoja', v_total_naloja,
        'caixaAtual', v_total_cxatual,
        'caixaAnterior', v_total_cxanterior,
        'fluxoCaixa', v_total_fluxo,
        'fluxoCx', v_total_fluxo,
        'fatura', v_faturamento_atual,
        'faturamentoAtual', v_faturamento_atual,
        'faturamentoAnterior', v_faturamento_anterior,
        'variacaoFaturamento', ROUND(v_variacao_faturamento, 1),
        'contasAPagar', v_total_contas,
        'valorContas', v_total_contas,
        'diferenca', v_diferenca,
        'veiculosPatio', v_total_veiculos,
        'veiculosPatioValor', v_total_naloja,
        'porLoja', v_por_loja,
        'historicoMacro', v_historico
    );

    RETURN v_result;
END;
$$;
