-- Migration: update_dashboard_rpc_macro_history
-- Recalibrates historicoMacro to return real daily faturamento deltas (odometer delta + additions)

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_snap RECORD;
    v_snap_prev RECORD;
    v_snap_prev2 RECORD;
    v_result JSONB;
    v_por_loja JSONB;
    v_historico JSONB;
    
    v_total_saldo NUMERIC := 0;
    v_total_dinheiro NUMERIC := 0;
    v_total_areceber NUMERIC := 0;
    v_total_naloja NUMERIC := 0;
    v_total_veiculos INTEGER := 0;
    
    v_total_cxatual NUMERIC := 0;
    v_total_cxanterior NUMERIC := 0;
    v_total_fluxo NUMERIC := 0;
    
    v_odometro_atual NUMERIC := 0;
    v_odometro_ontem NUMERIC := 0;
    v_odometro_anteontem NUMERIC := 0;
    
    v_faturamento_atual NUMERIC := 0;
    v_faturamento_anterior NUMERIC := 0;
    v_variacao_faturamento NUMERIC := 0;
    
    v_total_contas NUMERIC := 0;
    v_contas_manual NUMERIC := 0;
    v_juros_rede NUMERIC := 0;
    v_faturamento_outros NUMERIC := 0;
    v_diferenca NUMERIC := 0;
BEGIN
    -- 1. Obter snapshot do dia solicitado
    SELECT * INTO v_snap 
    FROM public.daily_snapshots 
    WHERE date = p_date;

    -- 2. Obter snapshot do dia anterior (D-1)
    SELECT * INTO v_snap_prev 
    FROM public.daily_snapshots 
    WHERE date < p_date 
    ORDER BY date DESC 
    LIMIT 1;

    -- 3. Obter snapshot do anteontem (D-2)
    SELECT * INTO v_snap_prev2 
    FROM public.daily_snapshots 
    WHERE date < COALESCE(v_snap_prev.date, p_date) 
    ORDER BY date DESC 
    LIMIT 1;

    -- 4. Extrair métricas gravadas ou calcular dinamicamente
    IF v_snap.id IS NOT NULL THEN
        v_total_dinheiro := COALESCE(v_snap.dinheiro_mp, 0);
        v_total_areceber := COALESCE(v_snap.total_recebiveis, 0);
        v_contas_manual := COALESCE(v_snap.contas_a_pagar, 0);
        v_juros_rede := COALESCE(v_snap.juros_rede, 0);
        v_faturamento_outros := COALESCE(v_snap.faturamento_outros_valor, 0);
        v_odometro_atual := COALESCE(v_snap.faturamento, 0);
    END IF;

    IF v_snap_prev.id IS NOT NULL THEN
        v_total_cxanterior := COALESCE(v_snap_prev.caixa_atual, 0);
        v_odometro_ontem := COALESCE(v_snap_prev.faturamento, 0);
    END IF;

    IF v_snap_prev2.id IS NOT NULL THEN
        v_odometro_anteontem := COALESCE(v_snap_prev2.faturamento, 0);
    END IF;

    -- Faturamento diário de Hoje
    IF v_odometro_atual > 0 AND v_odometro_ontem > 0 THEN
        v_faturamento_atual := (v_odometro_atual - v_odometro_ontem) + v_faturamento_outros;
    ELSIF v_odometro_atual > 0 THEN
        v_faturamento_atual := v_odometro_atual + v_faturamento_outros;
    ELSE
        SELECT COALESCE(SUM(amount), 0) INTO v_faturamento_atual FROM public.ofx_transactions WHERE target_date = p_date AND type = 'in';
    END IF;

    -- Faturamento diário de Ontem
    IF v_odometro_ontem > 0 AND v_odometro_anteontem > 0 THEN
        v_faturamento_anterior := (v_odometro_ontem - v_odometro_anteontem) + COALESCE(v_snap_prev.faturamento_outros_valor, 0);
    ELSIF v_odometro_ontem > 0 THEN
        v_faturamento_anterior := v_odometro_ontem;
    ELSE
        v_faturamento_anterior := 0;
    END IF;

    -- Variação Percentual real
    IF v_faturamento_anterior > 0 THEN
        v_variacao_faturamento := ((v_faturamento_atual - v_faturamento_anterior) / v_faturamento_anterior) * 100.0;
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

    -- 7. Histórico dos últimos 7 dias com DELTA DIÁRIO REAL de faturamento
    WITH raw_hist AS (
        SELECT 
            date,
            saldo_bancario,
            faturamento as odometro,
            contas_a_pagar,
            faturamento_outros_valor,
            LAG(faturamento) OVER (ORDER BY date ASC) as prev_odometro
        FROM public.daily_snapshots
        WHERE date <= p_date
        ORDER BY date ASC
    ),
    hist_filtered AS (
        SELECT 
            date,
            COALESCE(saldo_bancario, 0) as saldo,
            CASE 
                WHEN odometro > 0 AND prev_odometro > 0 THEN (odometro - prev_odometro) + COALESCE(faturamento_outros_valor, 0)
                WHEN odometro > 0 THEN odometro + COALESCE(faturamento_outros_valor, 0)
                ELSE 0
            END as faturamento_dia,
            COALESCE(contas_a_pagar, 0) as contas
        FROM raw_hist
        ORDER BY date DESC
        LIMIT 7
    )
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'date', hf.date,
            'saldo', hf.saldo,
            'faturamento', hf.faturamento_dia,
            'contas', hf.contas
        ) ORDER BY hf.date ASC
    ), '[]'::jsonb)
    INTO v_historico
    FROM hist_filtered hf;

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
