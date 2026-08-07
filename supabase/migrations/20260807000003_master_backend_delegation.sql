-- Migration: master_backend_delegation
-- Created: 20260807000003
-- Specs: 099, 110, 109
-- Description: Consolidação de RPCs para transferência total de cálculos pesados do frontend para o banco de dados.

-- =========================================================================
-- 0. PREPARAÇÃO DO SCHEMA
-- =========================================================================

-- Adicionar colunas de pareamento para a tabela de transações e pátio, se não existirem
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS matched_ofx_id uuid,
ADD COLUMN IF NOT EXISTS match_status text DEFAULT 'pending';

ALTER TABLE patio_os 
ADD COLUMN IF NOT EXISTS matched_ofx_id uuid,
ADD COLUMN IF NOT EXISTS match_status text DEFAULT 'pending';


-- =========================================================================
-- 1. O MOTOR DE PAREAMENTO (auto_match_transactions)
-- =========================================================================
CREATE OR REPLACE FUNCTION auto_match_transactions(p_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    ofx_record RECORD;
    rede_record RECORD;
    os_record RECORD;
    v_target_amount numeric;
    v_accumulated numeric;
    v_rede_ids uuid[];
BEGIN
    -- Limpar matches anteriores para a data (Idempotência)
    UPDATE transactions SET matched_ofx_id = NULL, match_status = 'pending' WHERE target_date = p_date;
    UPDATE patio_os SET matched_ofx_id = NULL, match_status = 'pending' WHERE updated_at::date = p_date; -- Ajustar coluna de data se necessário

    -- Loop em cada transação OFX de entrada (tipo = 'in')
    FOR ofx_record IN 
        SELECT id, amount, store_id 
        FROM transactions 
        WHERE target_date = p_date AND type = 'in' AND source = 'ofx'
    LOOP
        v_target_amount := ofx_record.amount;
        v_accumulated := 0;
        v_rede_ids := '{}'::uuid[];

        -- Tentativa 1: Parear com PIX/Transferência nas Ordens de Serviço (Pátio)
        SELECT id, COALESCE(pix_transfer_value, paid_value, total_value, 0)
        INTO os_record
        FROM patio_os
        WHERE store_id = ofx_record.store_id 
          AND match_status = 'pending'
          AND ABS(COALESCE(pix_transfer_value, paid_value, total_value, 0) - v_target_amount) < 0.1
        LIMIT 1;

        IF FOUND THEN
            -- Match direto 1:1 com OS
            UPDATE patio_os SET matched_ofx_id = ofx_record.id, match_status = 'MATCHED' WHERE id = os_record.id;
            UPDATE transactions SET matched_ofx_id = ofx_record.id, match_status = 'MATCHED' WHERE id = ofx_record.id;
            CONTINUE; -- Próximo OFX
        END IF;

        -- Tentativa 2: Parear com a Maquininha (Rede) usando cursor para agrupar
        FOR rede_record IN
            SELECT id, amount 
            FROM transactions 
            WHERE target_date = p_date AND type = 'in' AND source = 'rede' AND match_status = 'pending' AND store_id = ofx_record.store_id
            ORDER BY amount DESC
        LOOP
            v_accumulated := v_accumulated + rede_record.amount;
            v_rede_ids := array_append(v_rede_ids, rede_record.id);

            IF ABS(v_accumulated - v_target_amount) < 0.1 THEN
                -- Match encontrado (Grupo -> 1 OFX)
                UPDATE transactions SET matched_ofx_id = ofx_record.id, match_status = 'MATCHED' WHERE id = ANY(v_rede_ids);
                UPDATE transactions SET matched_ofx_id = ofx_record.id, match_status = 'MATCHED' WHERE id = ofx_record.id;
                EXIT; -- Sai do loop da rede e vai para o próximo OFX
            END IF;

            IF v_accumulated > v_target_amount THEN
                -- Estourou o valor, este agrupamento não é válido. 
                -- (Numa v2 mais complexa, usaríamos algoritmos de Subset Sum. Por ora, ignoramos a combinação).
                EXIT;
            END IF;
        END LOOP;
    END LOOP;
END;
$$;


-- =========================================================================
-- 2. CALCULO DIARIO CONCILIAÇÃO (calculate_daily_conciliation) - PROTEGIDO NULL CONTAGION
-- =========================================================================
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
        -- Faturamento Banco: AGORA SIM, O SALDO REAL DO BANCO
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

        -- Maquininha: sum of 'in' from rede
        SELECT COALESCE(SUM(gross_amount), COALESCE(SUM(amount), 0)) INTO v_maquininha 
        FROM transactions 
        WHERE store_id = store_record.id AND target_date = p_date AND type = 'in' AND source = 'rede';

        -- Previsto OFX: O faturamento líquido de entrada real
        SELECT COALESCE(SUM(amount), 0) INTO v_previsto_ofx 
        FROM transactions 
        WHERE store_id = store_record.id AND target_date = p_date AND type = 'in' AND source = 'ofx';

        -- PIX: Extração heurística rigorosa
        SELECT COALESCE(SUM(
            CASE 
                WHEN COALESCE(pix_transfer_value, 0) > 0 
                THEN COALESCE(pix_transfer_value, 0)
                WHEN payment_method ILIKE '%pix%' OR payment_method ILIKE '%transfer%'
                THEN COALESCE(paid_value, total_value, 0)
                ELSE 0
            END
        ), 0) INTO v_pix
        FROM patio_os
        WHERE store_id = store_record.id; 

        -- Na Loja OS: Histórico vs Atual
        IF v_historical_na_loja IS NOT NULL THEN
            v_na_loja_os := v_historical_na_loja;
        ELSE
            SELECT COALESCE(SUM(COALESCE(total_value, 0) - COALESCE(paid_value, 0)), 0) INTO v_na_loja_os
            FROM patio_os
            WHERE store_id = store_record.id AND (status = 'em_aberto' OR status = 'pago_parcial');
        END IF;

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


-- =========================================================================
-- 3. O DASHBOARD MESTRE (get_dashboard_metrics) - MATEMÁTICA INVIOLÁVEL
-- =========================================================================
CREATE OR REPLACE FUNCTION get_dashboard_metrics(p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    -- Variáveis de Matemática (Inicializadas rigorosamente com 0 para evitar Null Contagion)
    v_saldo_total numeric := 0;
    v_dinheiro_mp numeric := 0;
    v_a_receber numeric := 0;
    v_na_loja numeric := 0;
    v_caixa_atual numeric := 0;
    v_fluxo_cx numeric := 0;
    v_fatura numeric := 0;
    v_valor_disp_contas numeric := 0;
    v_valor_contas numeric := 0;
    v_diferenca numeric := 0;

    -- Sub-variáveis
    v_saldo_negativo_itau numeric := 0;
    v_a_receber_manual numeric := 0;
    v_a_receber_boletos numeric := 0;
    v_caixa_anterior numeric := 0;
    v_faturamento_atual numeric := 0;
    v_faturamento_anterior numeric := 0;
    v_outros_fat numeric := 0;
    v_juros_rede numeric := 0;
    v_contas_pagas_ofx numeric := 0;

    -- Controle
    v_date_anterior date;
    v_has_snapshot boolean;
BEGIN
    v_date_anterior := p_date - interval '1 day';

    -- [Passo 1] Saldo = soma de todos os saldos no banco
    SELECT COALESCE(SUM(b_total), 0) INTO v_saldo_total
    FROM (
        SELECT store_id, (
            SELECT COALESCE(bank_total, 0)
            FROM reconciliations r2
            WHERE r2.store_id = stores.id AND r2.date <= p_date
            ORDER BY r2.date DESC LIMIT 1
        ) as b_total FROM stores
    ) sub;

    -- Carregar Snapshots Manuais Diários
    SELECT EXISTS(SELECT 1 FROM daily_snapshots WHERE date = p_date) INTO v_has_snapshot;
    IF v_has_snapshot THEN
        SELECT 
            COALESCE(dinheiro_mp, 0), COALESCE(a_receber_manual, 0), 
            COALESCE(saldo_negativo_itau, 0), COALESCE(faturamento_outros_valor, 0), COALESCE(juros_rede, 0)
        INTO 
            v_dinheiro_mp, v_a_receber_manual, 
            v_saldo_negativo_itau, v_outros_fat, v_juros_rede
        FROM daily_snapshots WHERE date = p_date;
    END IF;

    -- [Passo 2] Dinheiro MP = dinheiro manual (Extraído acima)

    -- [Passo 3] A receber = boletos + descontos manuais
    SELECT COALESCE(SUM(value), 0) INTO v_a_receber_boletos FROM receivables WHERE status = 'pendente';
    v_a_receber := v_a_receber_manual + v_a_receber_boletos;

    -- [Passo 4] Na loja = soma total das OSs não pagas
    SELECT COALESCE(SUM(COALESCE(total_value, 0) - COALESCE(paid_value, 0)), 0) INTO v_na_loja
    FROM patio_os WHERE status IN ('em_aberto', 'pago_parcial');

    -- [Passo 5] Caixa atual = (soma de todos acima) - negativo (Itaú)
    v_caixa_atual := (v_saldo_total + v_dinheiro_mp + v_a_receber + v_na_loja) - v_saldo_negativo_itau;

    -- [Passo 6] Fluxo CX = Caixa atual - Caixa conciliação anterior
    SELECT EXISTS(SELECT 1 FROM dashboard_daily_logs WHERE date = v_date_anterior) INTO v_has_snapshot;
    IF v_has_snapshot THEN
        SELECT COALESCE(caixa_atual, 0) INTO v_caixa_anterior FROM dashboard_daily_logs WHERE date = v_date_anterior;
    END IF;
    v_fluxo_cx := v_caixa_atual - v_caixa_anterior;

    -- [Passo 7] Fatura = (Faturamento atual - Faturamento anterior) + Outros fat.
    SELECT COALESCE(SUM(amount), 0) INTO v_faturamento_atual FROM transactions WHERE target_date = p_date AND type = 'in' AND source = 'ofx';
    SELECT COALESCE(SUM(amount), 0) INTO v_faturamento_anterior FROM transactions WHERE target_date = v_date_anterior AND type = 'in' AND source = 'ofx';
    v_fatura := (v_faturamento_atual - v_faturamento_anterior) + v_outros_fat;

    -- [Passo 8] Valor disp contas = Fatura + Fluxo CX
    v_valor_disp_contas := v_fatura + v_fluxo_cx;

    -- [Passo 9] Valor contas = Juros + contas (saídas dos OFX, soma de todos)
    SELECT ABS(COALESCE(SUM(amount), 0)) INTO v_contas_pagas_ofx FROM transactions WHERE target_date = p_date AND type = 'out' AND source = 'ofx';
    v_valor_contas := v_juros_rede + v_contas_pagas_ofx;

    -- [Passo 10] Diferença = Valor disp - Valor contas
    v_diferenca := v_valor_disp_contas - v_valor_contas;

    -- Gravar log do Dashboard
    INSERT INTO dashboard_daily_logs (
        date, saldo_total, caixa_atual, contas_a_pagar, diferenca, faturamento_atual, faturamento_anterior,
        variacao_faturamento, fluxo_caixa, a_receber, veiculos_patio, veiculos_patio_valor
    ) VALUES (
        p_date, v_saldo_total, v_caixa_atual, v_valor_contas, v_diferenca, v_faturamento_atual, v_faturamento_anterior,
        0, v_fluxo_cx, v_a_receber, 0, v_na_loja
    )
    ON CONFLICT (date) DO UPDATE SET
        saldo_total = EXCLUDED.saldo_total,
        caixa_atual = EXCLUDED.caixa_atual,
        contas_a_pagar = EXCLUDED.contas_a_pagar,
        diferenca = EXCLUDED.diferenca,
        faturamento_atual = EXCLUDED.faturamento_atual,
        faturamento_anterior = EXCLUDED.faturamento_anterior,
        fluxo_caixa = EXCLUDED.fluxo_caixa,
        a_receber = EXCLUDED.a_receber,
        veiculos_patio_valor = EXCLUDED.veiculos_patio_valor,
        updated_at = now();

    -- Retornar Objeto Completo Rigoroso
    RETURN jsonb_build_object(
        'dataAtual', p_date,
        'saldoTotal', v_saldo_total,
        'dinheiroMp', v_dinheiro_mp,
        'aReceber', v_a_receber,
        'naLoja', v_na_loja,
        'caixaAtual', v_caixa_atual,
        'fluxoCx', v_fluxo_cx,
        'fatura', v_fatura,
        'valorDispContas', v_valor_disp_contas,
        'valorContas', v_valor_contas,
        'diferenca', v_diferenca
    );
END;
$$;


-- =========================================================================
-- 4. AGGREGATION VIEWS (Recebíveis, Pátio, Loja individual)
-- =========================================================================

-- Resumo de Recebiveis
CREATE OR REPLACE FUNCTION get_receivables_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb := '[]'::jsonb;
    store_record RECORD;
    v_total_pendente numeric;
    v_total_vencido numeric;
    v_count_pendente integer;
    v_count_vencido integer;
BEGIN
    FOR store_record IN SELECT id, name FROM stores LOOP
        SELECT 
            COALESCE(SUM(CASE WHEN due_date >= CURRENT_DATE THEN value ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE THEN value ELSE 0 END), 0),
            COUNT(CASE WHEN due_date >= CURRENT_DATE THEN 1 END),
            COUNT(CASE WHEN due_date < CURRENT_DATE THEN 1 END)
        INTO 
            v_total_pendente, v_total_vencido, v_count_pendente, v_count_vencido
        FROM receivables
        WHERE store_id = store_record.id AND status = 'pendente';
        
        v_result := v_result || jsonb_build_object(
            'store_id', store_record.id,
            'store_name', store_record.name,
            'total_pendente', v_total_pendente,
            'total_vencido', v_total_vencido,
            'count_pendente', v_count_pendente,
            'count_vencido', v_count_vencido
        );
    END LOOP;
    RETURN v_result;
END;
$$;

-- Resumo de Pátio
CREATE OR REPLACE FUNCTION get_patio_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb := '[]'::jsonb;
    store_record RECORD;
    v_total_aberto numeric;
    v_veiculos_count integer;
BEGIN
    FOR store_record IN SELECT id, name FROM stores LOOP
        SELECT 
            COALESCE(SUM(COALESCE(total_value, 0) - COALESCE(paid_value, 0)), 0), COUNT(*)
        INTO 
            v_total_aberto, v_veiculos_count
        FROM patio_os
        WHERE store_id = store_record.id AND status IN ('em_aberto', 'pago_parcial');
        
        v_result := v_result || jsonb_build_object(
            'store_id', store_record.id,
            'store_name', store_record.name,
            'total_aberto', v_total_aberto,
            'veiculos_count', v_veiculos_count
        );
    END LOOP;
    RETURN v_result;
END;
$$;

-- Estatísticas Financeiras da Loja
CREATE OR REPLACE FUNCTION get_store_financial_stats(p_store_id uuid, p_start_date date, p_end_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_entradas numeric;
    v_total_saidas numeric;
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO v_total_entradas
    FROM transactions
    WHERE store_id = p_store_id AND target_date >= p_start_date AND target_date <= p_end_date AND type = 'in';

    SELECT ABS(COALESCE(SUM(amount), 0)) INTO v_total_saidas
    FROM transactions
    WHERE store_id = p_store_id AND target_date >= p_start_date AND target_date <= p_end_date AND type = 'out';

    RETURN jsonb_build_object(
        'store_id', p_store_id,
        'start_date', p_start_date,
        'end_date', p_end_date,
        'total_entradas', v_total_entradas,
        'total_saidas', v_total_saidas
    );
END;
$$;
