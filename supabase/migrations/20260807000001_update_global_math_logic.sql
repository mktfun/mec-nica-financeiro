-- Migration: update_global_math_logic
-- Created: 20260807000001

-- Atualizar RPC 1: calculate_daily_conciliation
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
BEGIN
    FOR store_record IN SELECT id, name FROM stores LOOP
        -- Faturamento Banco: AGORA SIM, O SALDO REAL DO BANCO
        SELECT COALESCE(bank_total, 0), COALESCE(na_loja_os, NULL) 
        INTO v_faturamento_banco, v_historical_na_loja
        FROM reconciliations 
        WHERE store_id = store_record.id AND date = p_date
        LIMIT 1;
        
        IF v_faturamento_banco IS NULL THEN
            v_faturamento_banco := 0;
        END IF;

        -- Maquininha: sum of 'in' from rede (mantido)
        SELECT COALESCE(SUM(gross_amount), COALESCE(SUM(amount), 0)) INTO v_maquininha 
        FROM transactions 
        WHERE store_id = store_record.id AND target_date = p_date AND type = 'in' AND source = 'rede';

        -- Previsto OFX: O faturamento líquido de entrada (o que realmente entrou)
        SELECT COALESCE(SUM(amount), 0) INTO v_previsto_ofx 
        FROM transactions 
        WHERE store_id = store_record.id AND target_date = p_date AND type = 'in' AND source = 'ofx';

        -- PIX: Extração heurística do pátio
        -- Na falta de uma tabela de importação amarrada ao dia para o PIX, extraímos os veículos do pátio
        -- cujo valor do pix declarado via legado ou keyword na forma de pgto indique PIX.
        SELECT COALESCE(SUM(
            CASE 
                WHEN COALESCE(pix_transfer_value, parsed_pix_transfer, 0) > 0 
                THEN COALESCE(pix_transfer_value, parsed_pix_transfer, 0)
                WHEN payment_methods ILIKE '%pix%' OR payment_methods ILIKE '%transfer%'
                THEN COALESCE(paid_value, total_value, 0)
                ELSE 0
            END
        ), 0) INTO v_pix
        FROM patio_os
        WHERE store_id = store_record.id; -- Nota: Pátio não tem controle temporal perfeito.

        -- Na Loja OS: Histórico vs Atual
        IF v_historical_na_loja IS NOT NULL THEN
            v_na_loja_os := v_historical_na_loja;
        ELSE
            SELECT COALESCE(SUM(COALESCE(paid_value, total_value)), 0) INTO v_na_loja_os
            FROM patio_os
            WHERE store_id = store_record.id AND (status = 'em_aberto' OR status = 'pago_parcial');
        END IF;

        -- Diferença = Previsto - (Maquininha + Pix) (Corrigido)
        v_diferenca := v_previsto_ofx - (v_maquininha + v_pix);

        v_status := CASE WHEN v_diferenca >= -1 THEN 'approved' ELSE 'divergence' END;

        -- Gravar Snapshot
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
            
        -- Add to result
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
-- RPC 2: get_dashboard_metrics (CORREO DE BUGS DE NULL E MATEMTICA)
CREATE OR REPLACE FUNCTION get_dashboard_metrics(p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_saldo_total numeric := 0;
    v_caixa_atual numeric := 0;
    v_caixa_anterior numeric := 0;
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
    v_has_snapshot boolean;
BEGIN
    v_date_anterior := p_date - interval '1 day';

    -- Prevenir NULL values quando no existe snapshot
    SELECT true INTO v_has_snapshot FROM daily_snapshots WHERE date = p_date;
    IF v_has_snapshot THEN
        SELECT COALESCE(dinheiro_mp, 0), COALESCE(a_receber_manual, 0), COALESCE(saldo_negativo_itau, 0), COALESCE(juros_rede, 0), COALESCE(faturamento_outros_valor, 0), COALESCE(contas_a_pagar, 0)
        INTO v_dinheiro_mp, v_a_receber_manual, v_saldo_negativo_itau, v_juros_rede, v_faturamento_atual, v_contas_a_pagar
        FROM daily_snapshots WHERE date = p_date;
    END IF;

    SELECT true INTO v_has_snapshot FROM dashboard_daily_logs WHERE date = v_date_anterior;
    IF v_has_snapshot THEN
        SELECT COALESCE(faturamento_atual, 0), COALESCE(caixa_atual, 0)
        INTO v_faturamento_anterior, v_caixa_anterior
        FROM dashboard_daily_logs WHERE date = v_date_anterior;
    END IF;
    
    FOR store_record IN SELECT id, name FROM stores LOOP
        DECLARE
            v_store_bank_total numeric;
            v_store_fat numeric;
            v_store_fat_ant numeric;
            v_store_contas numeric;
            v_store_patio_count int;
            v_store_patio_valor numeric;
        BEGIN
            -- Saldo Bancrio = REAL bank_total, NOT SUM of OFX
            SELECT COALESCE(bank_total, 0) INTO v_store_bank_total
            FROM reconciliations
            WHERE store_id = store_record.id AND date <= p_date
            ORDER BY date DESC LIMIT 1;
            
            v_saldo_total := v_saldo_total + COALESCE(v_store_bank_total, 0);
            
            -- Faturamento Atual (O que REALMENTE entrou do Banco OFX + Maquininha)
            SELECT COALESCE(SUM(amount), 0) INTO v_store_fat
            FROM transactions
            WHERE store_id = store_record.id AND target_date = p_date AND type = 'in';
            
            v_faturamento_atual := v_faturamento_atual + COALESCE(v_store_fat, 0);
            
            -- Faturamento Anterior
            SELECT COALESCE(SUM(amount), 0) INTO v_store_fat_ant
            FROM transactions
            WHERE store_id = store_record.id AND target_date = v_date_anterior AND type = 'in';
            
            v_faturamento_anterior := v_faturamento_anterior + COALESCE(v_store_fat_ant, 0);
            
            -- Contas a pagar (Saidas)
            SELECT ABS(COALESCE(SUM(amount), 0)) INTO v_store_contas
            FROM transactions
            WHERE store_id = store_record.id AND target_date = p_date AND type = 'out';
            
            v_contas_a_pagar := v_contas_a_pagar + COALESCE(v_store_contas, 0);
            
            -- Patio
            SELECT COUNT(*), COALESCE(SUM(COALESCE(total_value, 0) - COALESCE(paid_value, 0)), 0)
            INTO v_store_patio_count, v_store_patio_valor
            FROM patio_os
            WHERE store_id = store_record.id AND (status = 'em_aberto' OR status = 'pago_parcial');
            
            v_veiculos_patio := v_veiculos_patio + COALESCE(v_store_patio_count, 0);
            v_veiculos_patio_valor := v_veiculos_patio_valor + COALESCE(v_store_patio_valor, 0);
            
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

    v_a_receber := v_a_receber_manual + v_veiculos_patio_valor;
    v_caixa_atual := (v_saldo_total + v_dinheiro_mp + v_a_receber) - v_saldo_negativo_itau;
    v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;
    
    IF v_faturamento_anterior > 0 THEN
        v_variacao_faturamento := ((v_faturamento_atual - v_faturamento_anterior) / v_faturamento_anterior) * 100;
    ELSE
        v_variacao_faturamento := 0;
    END IF;

    v_diferenca := (v_faturamento_atual + v_fluxo_caixa) - (v_contas_a_pagar + v_juros_rede);
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
