-- Migration: process_marco_zero_rpc
-- Created: 20260813113000
-- Spec: 186-refatoracao-marco-zero
-- Description: RPC atomica e idempotente para salvar a implantacao de saldo do Marco Zero com tenant isolation estrito e retorno de log JSON.

CREATE OR REPLACE FUNCTION public.process_marco_zero_import(
    p_target_date date,
    p_global jsonb,
    p_stores jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caixa_atual numeric;
    v_caixa_anterior numeric;
    v_dinheiro_mp numeric;
    v_a_receber numeric;
    v_saldo_negativo numeric;
    v_faturamento_atual numeric;
    v_faturamento_anterior numeric;
    v_fluxo_caixa numeric;
    v_valor_contas numeric;
    v_diferenca numeric;
    v_juros_atual numeric;
    v_contas numeric;
    
    v_store_item jsonb;
    v_os_item jsonb;
    v_store_id text;
    v_store_name text;
    v_saldo_loja numeric;
    
    v_total_stores_count int := 0;
    v_total_os_inserted int := 0;
    v_logs text[] := ARRAY[]::text[];
    v_stores_summary jsonb := '[]'::jsonb;
    v_store_os_count int;
BEGIN
    v_logs := array_append(v_logs, format('Iniciando transação atômica do Marco Zero para data: %s', p_target_date));

    -- Extração resiliente dos valores globais do payload JSON
    v_caixa_atual := COALESCE((p_global->>'caixaAtual')::numeric, 0);
    v_caixa_anterior := COALESCE((p_global->>'caixaAnterior')::numeric, 0);
    v_dinheiro_mp := COALESCE((p_global->>'dinheiroMp')::numeric, 0);
    v_a_receber := COALESCE((p_global->>'aReceber')::numeric, 0);
    v_saldo_negativo := COALESCE((p_global->>'negativo')::numeric, 0);
    v_faturamento_atual := COALESCE((p_global->>'faturamentoAtual')::numeric, 0);
    v_faturamento_anterior := COALESCE((p_global->>'faturamentoAnterior')::numeric, 0);
    v_fluxo_caixa := COALESCE((p_global->>'fluxoCaixa')::numeric, 0);
    v_valor_contas := COALESCE((p_global->>'valorDasContas')::numeric, 0);
    v_diferenca := COALESCE((p_global->>'diferenca')::numeric, 0);
    v_juros_atual := COALESCE((p_global->>'jurosAtual')::numeric, 0);
    v_contas := COALESCE((p_global->>'contas')::numeric, 0);

    -- 1. Idempotência: Limpeza isolada da data p_target_date
    DELETE FROM daily_snapshots WHERE date = p_target_date;
    DELETE FROM dashboard_daily_logs WHERE date = p_target_date;
    v_logs := array_append(v_logs, 'Limpeza de snapshots e logs anteriores da data concluída com sucesso.');

    -- 2. Insert em daily_snapshots com flag metadata.is_marco_zero = true
    INSERT INTO daily_snapshots (
        date,
        caixa_atual,
        dinheiro_mp,
        total_recebiveis,
        a_receber_manual,
        saldo_bancario,
        saldo_negativo_itau,
        faturamento,
        contas_a_pagar,
        total_patio,
        notes,
        metadata
    ) VALUES (
        p_target_date,
        v_caixa_atual,
        v_dinheiro_mp,
        v_a_receber,
        v_a_receber,
        v_saldo_negativo,
        v_saldo_negativo,
        v_faturamento_atual,
        v_valor_contas,
        0,
        'Implantação de Saldo Inicial (Marco Zero)',
        jsonb_build_object(
            'is_marco_zero', true,
            'caixa_anterior', v_caixa_anterior,
            'fluxo_caixa', v_fluxo_caixa,
            'faturamento_anterior', v_faturamento_anterior,
            'valor_disponivel_contas', v_faturamento_atual - v_faturamento_anterior - v_fluxo_caixa,
            'valor_das_contas', v_valor_contas,
            'diferenca', v_diferenca,
            'juros_atual', v_juros_atual,
            'contas', v_contas
        )
    );
    v_logs := array_append(v_logs, 'daily_snapshots gravado com metadata.is_marco_zero = true.');

    -- 3. Insert em dashboard_daily_logs
    INSERT INTO dashboard_daily_logs (
        date,
        saldo_total,
        caixa_atual,
        contas_a_pagar,
        diferenca,
        faturamento_atual,
        faturamento_anterior,
        variacao_faturamento,
        fluxo_caixa,
        a_receber,
        veiculos_patio,
        veiculos_patio_valor,
        por_loja,
        historico_macro
    ) VALUES (
        p_target_date,
        v_caixa_atual - v_dinheiro_mp - v_a_receber,
        v_caixa_atual,
        v_valor_contas,
        v_diferenca,
        v_faturamento_atual,
        v_faturamento_anterior,
        CASE WHEN v_faturamento_anterior > 0 THEN ((v_faturamento_atual - v_faturamento_anterior) / v_faturamento_anterior) * 100 ELSE 0 END,
        v_fluxo_caixa,
        v_a_receber,
        0,
        0,
        '[]'::jsonb,
        '[]'::jsonb
    );
    v_logs := array_append(v_logs, 'dashboard_daily_logs gravado com os valores consolidados.');

    -- 4. Processar Lojas e OSs com Tenant Isolation Estrito
    IF p_stores IS NOT NULL AND jsonb_array_length(p_stores) > 0 THEN
        FOR v_store_item IN SELECT * FROM jsonb_array_elements(p_stores) LOOP
            v_store_id := (v_store_item->>'store_id')::text;
            v_store_name := v_store_item->>'store_name';
            v_saldo_loja := COALESCE((v_store_item->>'saldoLoja')::numeric, 0);
            v_store_os_count := 0;

            IF v_store_id IS NOT NULL THEN
                v_total_stores_count := v_total_stores_count + 1;

                -- Reconciliação isolada para a loja naquela data
                DELETE FROM reconciliations WHERE store_id = v_store_id AND date = p_target_date;
                INSERT INTO reconciliations (
                    store_id,
                    date,
                    daily_cash,
                    bank_total,
                    status
                ) VALUES (
                    v_store_id,
                    p_target_date,
                    v_saldo_loja,
                    v_saldo_loja,
                    'completed'
                );

                -- Limpar OSs do pátio para essa data/loja para garantir idempotência sem ON CONFLICT
                DELETE FROM patio_os WHERE store_id = v_store_id AND opened_at = p_target_date;

                -- OSs do Pátio salvas com opened_at = p_target_date (isolamento temporal)
                IF v_store_item->'osPendentes' IS NOT NULL AND jsonb_array_length(v_store_item->'osPendentes') > 0 THEN
                    FOR v_os_item IN SELECT * FROM jsonb_array_elements(v_store_item->'osPendentes') LOOP
                        INSERT INTO patio_os (
                            store_id,
                            store_name,
                            os_number,
                            plate,
                            total_value,
                            paid_value,
                            status,
                            opened_at,
                            updated_at
                        ) VALUES (
                            v_store_id,
                            v_store_name,
                            v_os_item->>'numero_os',
                            'N/I',
                            COALESCE((v_os_item->>'valor_os')::numeric, 0),
                            0,
                            'em_aberto',
                            p_target_date,
                            now()
                        );

                        v_store_os_count := v_store_os_count + 1;
                        v_total_os_inserted := v_total_os_inserted + 1;
                    END LOOP;
                END IF;

                v_stores_summary := v_stores_summary || jsonb_build_object(
                    'store_id', v_store_id,
                    'store_name', v_store_name,
                    'os_count', v_store_os_count,
                    'saldo_loja', v_saldo_loja
                );

                v_logs := array_append(v_logs, format('Loja %s (%s): %s OSs inseridas/atualizadas.', v_store_name, v_store_id, v_store_os_count));
            END IF;
        END LOOP;
    END IF;

    v_logs := array_append(v_logs, 'Transação do Marco Zero finalizada com sucesso (100% idempotente).');

    RETURN jsonb_build_object(
        'status', 'success',
        'target_date', p_target_date,
        'processed_stores_count', v_total_stores_count,
        'processed_os_count', v_total_os_inserted,
        'stores_summary', v_stores_summary,
        'global_summary', jsonb_build_object(
            'caixa_atual', v_caixa_atual,
            'caixa_anterior', v_caixa_anterior,
            'faturamento_atual', v_faturamento_atual,
            'faturamento_anterior', v_faturamento_anterior,
            'fluxo_caixa', v_fluxo_caixa,
            'contas', v_valor_contas,
            'diferenca', v_diferenca
        ),
        'execution_logs', v_logs,
        'timestamp', now()
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'status', 'error',
        'target_date', p_target_date,
        'error_message', SQLERRM,
        'execution_logs', array_append(v_logs, format('ERRO FATAL: %s', SQLERRM)),
        'timestamp', now()
    );
END;
$$;
