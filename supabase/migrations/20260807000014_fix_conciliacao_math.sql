-- =========================================================================
-- CORREÇÃO DO DASHBOARD GLOBAL (Fluxo de Caixa e Despesas Globais)
-- Espec: 141-fix-conciliacao-valor-contas-fluxo
-- =========================================================================
CREATE OR REPLACE FUNCTION get_dashboard_metrics(p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_saldo_total numeric := 0;
    v_caixa_atual numeric := 0;
    v_caixa_anterior numeric := 0;
    v_contas_a_pagar_ofx numeric := 0;
    v_contas_a_pagar numeric := 0;
    v_diferenca numeric := 0;
    v_faturamento_atual numeric := 0;
    v_faturamento_anterior numeric := 0;
    v_variacao_faturamento numeric := 0;
    v_fluxo_caixa numeric := 0;
    v_a_receber numeric := 0;
    v_a_receber_manual numeric := 0;
    v_veiculos_patio integer := 0;
    v_veiculos_patio_valor numeric := 0;
    v_saldo_negativo_itau numeric := 0;
    v_dinheiro_mp numeric := 0;
    v_juros_rede numeric := 0;
    
    v_date_anterior date;
    v_por_loja jsonb := '[]'::jsonb;
    v_historico jsonb := '[]'::jsonb;
    store_record RECORD;
BEGIN
    v_date_anterior := p_date - interval '1 day';

    -- Carregar valores manuais do snapshot do dia atual
    SELECT COALESCE(dinheiro_mp, 0), COALESCE(a_receber_manual, 0), COALESCE(saldo_negativo_itau, 0), COALESCE(juros_rede, 0), COALESCE(contas_a_pagar, 0)
    INTO v_dinheiro_mp, v_a_receber_manual, v_saldo_negativo_itau, v_juros_rede, v_contas_a_pagar
    FROM daily_snapshots
    WHERE date = p_date;

    -- =========================================================================
    -- 1. TOTAIS GLOBAIS ABSOLUTOS (Inclui o OFX Global que não tem loja vinculada)
    -- =========================================================================
    
    -- Faturamento Atual (Toda entrada)
    SELECT COALESCE(SUM(amount), 0) INTO v_faturamento_atual
    FROM transactions
    WHERE target_date = p_date AND type = 'in';
    
    -- Despesas do OFX (Apenas saídas do OFX)
    SELECT ABS(COALESCE(SUM(amount), 0)) INTO v_contas_a_pagar_ofx
    FROM transactions
    WHERE target_date = p_date AND type = 'out' AND source = 'ofx';
    
    -- As 'Contas a Pagar' totais são a soma do Manual + As Despesas Reais do OFX
    v_contas_a_pagar := v_contas_a_pagar + v_contas_a_pagar_ofx;

    -- Pátio Global (Count e Valor)
    SELECT COUNT(*), COALESCE(SUM(COALESCE(total_value, 0) - COALESCE(paid_value, 0)), 0)
    INTO v_veiculos_patio, v_veiculos_patio_valor
    FROM patio_os
    WHERE status = 'em_aberto' OR status = 'pago_parcial';

    -- Faturamento Anterior (Toda entrada de ontem)
    SELECT COALESCE(SUM(amount), 0) INTO v_faturamento_anterior
    FROM transactions
    WHERE target_date = v_date_anterior AND type = 'in';

    -- =========================================================================
    -- 2. DADOS POR LOJA (Apenas para o grid visual de lojas)
    -- =========================================================================
    FOR store_record IN SELECT id, name FROM stores LOOP
        DECLARE
            v_store_bank_total numeric;
            v_store_fat numeric;
            v_store_contas numeric;
            v_store_patio_count int;
            v_store_patio_valor numeric;
        BEGIN
            -- Saldo Bancário
            SELECT COALESCE(bank_total, 0) INTO v_store_bank_total
            FROM reconciliations
            WHERE store_id = store_record.id AND date <= p_date
            ORDER BY date DESC LIMIT 1;
            
            v_saldo_total := v_saldo_total + COALESCE(v_store_bank_total, 0);
            
            -- Faturamento Atual Loja
            SELECT COALESCE(SUM(amount), 0) INTO v_store_fat
            FROM transactions
            WHERE store_id = store_record.id AND target_date = p_date AND type = 'in';
            
            -- Contas Loja
            SELECT ABS(COALESCE(SUM(amount), 0)) INTO v_store_contas
            FROM transactions
            WHERE store_id = store_record.id AND target_date = p_date AND type = 'out';
            
            -- Pátio Loja
            SELECT COUNT(*), COALESCE(SUM(COALESCE(total_value, 0) - COALESCE(paid_value, 0)), 0)
            INTO v_store_patio_count, v_store_patio_valor
            FROM patio_os
            WHERE store_id = store_record.id AND (status = 'em_aberto' OR status = 'pago_parcial');
            
            v_por_loja := v_por_loja || jsonb_build_object(
                'storeId', store_record.id,
                'storeName', store_record.name,
                'saldoAtual', v_store_bank_total,
                'faturamento', v_store_fat,
                'contas', v_store_contas,
                'veiculosPatio', v_store_patio_count,
                'veiculosPatioValor', v_store_patio_valor,
                'statusConciliacao', 'pending',
                'resultado', v_store_fat - v_store_contas
            );
        END;
    END LOOP;

    -- =========================================================================
    -- 3. CÁLCULOS FINAIS REVISADOS
    -- =========================================================================
    
    v_a_receber := v_a_receber_manual + v_veiculos_patio_valor;
    
    -- Caixa Atual da Oficina
    v_caixa_atual := (v_saldo_total + v_dinheiro_mp + v_a_receber) - v_saldo_negativo_itau;

    -- Buscar o caixa_atual do último fechamento
    SELECT COALESCE(caixa_atual, 0) INTO v_caixa_anterior
    FROM daily_snapshots
    WHERE date < p_date
    ORDER BY date DESC
    LIMIT 1;
    
    -- FLUXO DE CAIXA CORRIGIDO: Caixa Atual - Caixa Anterior
    v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;
    
    IF v_faturamento_anterior > 0 THEN
        v_variacao_faturamento := ((v_faturamento_atual - v_faturamento_anterior) / v_faturamento_anterior) * 100;
    ELSE
        v_variacao_faturamento := 0;
    END IF;

    -- Diferença do dashboard
    v_diferenca := v_caixa_atual + v_fluxo_caixa;

    v_historico := '[]'::jsonb;
    
    INSERT INTO dashboard_daily_logs (
        date, saldo_total, caixa_atual, contas_a_pagar, diferenca, faturamento_atual, faturamento_anterior,
        variacao_faturamento, fluxo_caixa, a_receber, veiculos_patio, veiculos_patio_valor, por_loja, historico_macro
    ) VALUES (
        p_date, v_saldo_total, v_caixa_atual, v_contas_a_pagar, v_diferenca, v_faturamento_atual, v_faturamento_anterior,
        v_variacao_faturamento, v_fluxo_caixa, v_a_receber, v_veiculos_patio, v_veiculos_patio_valor, v_por_loja, v_historico
    )
    ON CONFLICT (date) DO UPDATE SET
        saldo_total = EXCLUDED.saldo_total,
        caixa_atual = EXCLUDED.caixa_atual,
        contas_a_pagar = EXCLUDED.contas_a_pagar,
        diferenca = EXCLUDED.diferenca,
        faturamento_atual = EXCLUDED.faturamento_atual,
        faturamento_anterior = EXCLUDED.faturamento_anterior,
        variacao_faturamento = EXCLUDED.variacao_faturamento,
        fluxo_caixa = EXCLUDED.fluxo_caixa,
        a_receber = EXCLUDED.a_receber,
        veiculos_patio = EXCLUDED.veiculos_patio,
        veiculos_patio_valor = EXCLUDED.veiculos_patio_valor,
        por_loja = EXCLUDED.por_loja,
        historico_macro = EXCLUDED.historico_macro,
        updated_at = now();

    RETURN jsonb_build_object(
        'dataAtual', p_date,
        'dataAnterior', v_date_anterior,
        'saldoTotal', v_saldo_total,
        'caixaAtual', v_caixa_atual,
        'contasAPagar', v_contas_a_pagar,
        'diferenca', v_diferenca,
        'faturamentoAtual', v_faturamento_atual,
        'faturamentoAnterior', v_faturamento_anterior,
        'variacaoFaturamento', v_variacao_faturamento,
        'fluxoCaixa', v_fluxo_caixa,
        'aReceber', v_a_receber,
        'veiculosPatio', v_veiculos_patio,
        'veiculosPatioValor', v_veiculos_patio_valor,
        'porLoja', v_por_loja,
        'historicoMacro', v_historico
    );
END;
$$;
