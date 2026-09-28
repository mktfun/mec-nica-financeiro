-- =========================================================================
-- Migration: 20260928000005_fix_close_daily_snapshot_coalesce.sql
-- Description: Blindagem com COALESCE em close_daily_snapshot para evitar
--              violações de restrição NOT NULL em colunas numéricas de daily_snapshots
-- =========================================================================

CREATE OR REPLACE FUNCTION public.close_daily_snapshot(
    p_date text, 
    p_notes text DEFAULT 'Fechamento homologado via Central de Conciliação'::text, 
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_target_date date := COALESCE(p_date::date, CURRENT_DATE);
    v_summary jsonb;
    v_stores_count int;
    v_is_all_empty boolean := true;
    v_store jsonb;
    v_existing_rev int := 0;
BEGIN
    -- Forçar cálculo dinâmico para capturar todas as mutações e arquivos reais
    v_summary := public.get_daily_reconciliation_summary(v_target_date::text, true);

    v_stores_count := jsonb_array_length(COALESCE(v_summary->'stores', '[]'::jsonb));
    IF v_stores_count = 0 AND (COALESCE((v_summary->>'total_saldo_banco')::numeric, 0) > 0 OR COALESCE((v_summary->>'faturamento_periodo')::numeric, 0) > 0) THEN
        RAISE EXCEPTION 'SNAPSHOT_FECHAMENTO_BLOQUEADO: O detalhamento por filiais está zerado enquanto há movimentação consolidada. Operação abortada.';
    END IF;

    -- Verificar se todas as lojas estão completamente vazias de movimento bancário e operacional
    FOR v_store IN SELECT * FROM jsonb_array_elements(COALESCE(v_summary->'stores', '[]'::jsonb))
    LOOP
        IF NOT COALESCE((v_store->>'is_empty_store')::boolean, false) THEN
            v_is_all_empty := false;
            EXIT;
        END IF;
    END LOOP;

    IF v_is_all_empty 
       AND COALESCE((v_summary->>'faturamento_periodo')::numeric, 0) = 0 
       AND COALESCE((v_summary->>'total_saldo_banco')::numeric, 0) = 0 
       AND NOT COALESCE((p_metadata->>'is_marco_zero')::boolean, false) THEN
        RAISE EXCEPTION 'SNAPSHOT_FECHAMENTO_BLOQUEADO: Nenhuma movimentação bancária (OFX), cartões (Rede) ou contas foi registrada para esta data. Fechamento de dia vazio abortado.';
    END IF;

    SELECT COALESCE((metadata->>'revision')::int, 0) INTO v_existing_rev
    FROM public.daily_snapshots
    WHERE date = v_target_date;

    INSERT INTO public.daily_snapshots (
        date,
        caixa_atual,
        faturamento,
        dinheiro_mp,
        total_recebiveis,
        total_patio,
        saldo_bancario,
        a_receber_manual,
        contas_a_pagar,
        saldo_negativo_itau,
        juros_rede,
        is_closed,
        closed_at,
        notes,
        metadata,
        updated_at
    ) VALUES (
        v_target_date,
        COALESCE((v_summary->>'caixa_atual')::numeric, 0),
        COALESCE((v_summary->>'faturamento_periodo')::numeric, 0),
        COALESCE((v_summary->>'dinheiro_mp')::numeric, 0),
        COALESCE((v_summary->>'dinheiro_mp')::numeric, 0) + COALESCE((v_summary->>'a_receber')::numeric, 0),
        COALESCE((v_summary->>'na_loja_os')::numeric, 0),
        COALESCE((v_summary->>'saldo_bancos_ofx')::numeric, 0),
        COALESCE((v_summary->>'a_receber')::numeric, 0),
        COALESCE((v_summary->>'contas_manual')::numeric, 0),
        COALESCE((v_summary->>'saldo_negativo_itau')::numeric, 0),
        COALESCE((v_summary->>'juros_rede')::numeric, 0),
        true,
        NOW(),
        p_notes,
        jsonb_build_object(
            'revision', v_existing_rev + 1,
            'saldo_bancos_ofx', COALESCE((v_summary->>'saldo_bancos_ofx')::numeric, 0),
            'saldo_bancos_positivo', COALESCE((v_summary->>'saldo_bancos_positivo')::numeric, 0),
            'saldo_negativo_itau', COALESCE((v_summary->>'saldo_negativo_itau')::numeric, 0),
            'dinheiro_em_lojas', COALESCE((v_summary->>'dinheiro_lojas')::numeric, 0),
            'cartoes_a_compensar', COALESCE((v_summary->>'cartoes_a_compensar')::numeric, 0),
            'devolucoes_rede', COALESCE((v_summary->>'devolucoes_rede')::numeric, 0),
            'dinheiro_mp', COALESCE((v_summary->>'dinheiro_mp')::numeric, 0),
            'a_receber', COALESCE((v_summary->>'a_receber')::numeric, 0),
            'total_patio', COALESCE((v_summary->>'na_loja_os')::numeric, 0),
            'caixa_atual', COALESCE((v_summary->>'caixa_atual')::numeric, 0),
            'caixa_anterior', COALESCE((v_summary->>'caixa_anterior')::numeric, 0),
            'fluxo_caixa', COALESCE((v_summary->>'fluxo_caixa')::numeric, 0),
            'faturamento_periodo', COALESCE((v_summary->>'faturamento_periodo')::numeric, 0),
            'faturamento_oi_base', COALESCE((v_summary->>'faturamento_oi_base')::numeric, 0),
            'faturamento_anterior', COALESCE((v_summary->>'faturamento_anterior')::numeric, 0),
            'valor_disp_contas', COALESCE((v_summary->>'valor_disp_contas')::numeric, 0),
            'contas_base', COALESCE((v_summary->>'contas_base')::numeric, 0),
            'contas_manual', COALESCE((v_summary->>'contas_manual')::numeric, 0),
            'subtotal_contas', COALESCE((v_summary->>'subtotal_contas')::numeric, 0),
            'diferenca_final', COALESCE((v_summary->>'diferenca_final')::numeric, 0),
            'status_geral', (v_summary->>'status_geral'),
            'stores', v_summary->'stores',
            'triple_recon', v_summary->'triple_recon',
            'is_closed', true
        ) || p_metadata,
        NOW()
    )
    ON CONFLICT (date) DO UPDATE SET
        caixa_atual = EXCLUDED.caixa_atual,
        faturamento = EXCLUDED.faturamento,
        dinheiro_mp = EXCLUDED.dinheiro_mp,
        total_recebiveis = EXCLUDED.total_recebiveis,
        total_patio = EXCLUDED.total_patio,
        saldo_bancario = EXCLUDED.saldo_bancario,
        a_receber_manual = EXCLUDED.a_receber_manual,
        contas_a_pagar = EXCLUDED.contas_a_pagar,
        saldo_negativo_itau = EXCLUDED.saldo_negativo_itau,
        juros_rede = EXCLUDED.juros_rede,
        is_closed = true,
        closed_at = NOW(),
        notes = EXCLUDED.notes,
        metadata = EXCLUDED.metadata,
        updated_at = NOW();

    RETURN jsonb_build_object(
        'success', true,
        'date', v_target_date,
        'revision', v_existing_rev + 1,
        'stores_count', v_stores_count,
        'cartoes_a_compensar', COALESCE((v_summary->>'cartoes_a_compensar')::numeric, 0),
        'saldo_bancario', COALESCE((v_summary->>'saldo_bancos_ofx')::numeric, 0),
        'diferenca', COALESCE((v_summary->>'diferenca_final')::numeric, 0)
    );
END;
$function$;
