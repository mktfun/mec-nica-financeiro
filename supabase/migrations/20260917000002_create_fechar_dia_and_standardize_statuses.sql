-- Migration: 20260917000002_create_fechar_dia_and_standardize_statuses.sql
-- Milestone 3 & 4: Backend Fechamento RPC & Padronização de Status

-- =========================================================================
-- ETAPA 1: NORMALIZAÇÃO DE STATUS NAS TABELAS BASE
-- =========================================================================

-- A) ofx_transactions
UPDATE public.ofx_transactions 
SET match_status = 'pending' 
WHERE match_status IS NULL OR TRIM(match_status) = '';

UPDATE public.ofx_transactions 
SET match_status = 'matched' 
WHERE LOWER(TRIM(match_status)) = 'matched';

-- B) pos_transactions
UPDATE public.pos_transactions 
SET settlement_status = 'pending' 
WHERE settlement_status IS NULL OR TRIM(settlement_status) = '';

UPDATE public.pos_transactions 
SET settlement_status = 'matched' 
WHERE LOWER(TRIM(settlement_status)) = 'matched';

-- C) daily_manual_bills
UPDATE public.daily_manual_bills 
SET match_status = 'pending' 
WHERE match_status IS NULL OR TRIM(match_status) = '';

UPDATE public.daily_manual_bills 
SET match_status = 'matched' 
WHERE LOWER(TRIM(match_status)) = 'matched';

-- =========================================================================
-- ETAPA 2: CRIAÇÃO DA RPC TRANSACIONAL E IDEMPOTENTE fechar_dia
-- =========================================================================

CREATE OR REPLACE FUNCTION public.fechar_dia(
    p_date text,
    p_force_reopen boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_lock_key bigint;
    v_summary jsonb;
    v_existing_snapshot record;
    v_result jsonb;
    v_status text;
    v_diferenca numeric;
    v_tolerancia numeric := 50.00;
BEGIN
    -- 1. Trava de Concorrência Transacional por Data
    v_lock_key := ('x' || substr(md5('fechar_dia_' || p_date), 1, 16))::bit(64)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- 2. Verifica se o dia já está fechado e se não foi solicitado forçar reabertura
    SELECT * INTO v_existing_snapshot
    FROM public.daily_snapshots
    WHERE date = p_date;

    IF FOUND AND v_existing_snapshot.is_closed AND NOT p_force_reopen THEN
        -- Retorna idempotente o snapshot já consolidado
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Dia já estava fechado (idempotente). Retornando dados consolidados.',
            'date', p_date,
            'snapshot_id', v_existing_snapshot.id,
            'is_closed', true,
            'diferenca_final', v_existing_snapshot.diferenca_final,
            'status', v_existing_snapshot.status
        );
    END IF;

    -- 3. Executa a Calculadora Canônica SSOT no modo Dinâmico para obter os números matemáticos reais
    v_summary := public.get_daily_reconciliation_summary(p_date, true);

    IF v_summary IS NULL THEN
        RAISE EXCEPTION 'Erro ao calcular resumo diário para fechamento na data %', p_date;
    END IF;

    -- Extrai métricas consolidadas
    v_diferenca := COALESCE((v_summary->>'diferenca_final')::numeric, 0);
    
    IF ABS(v_diferenca) <= v_tolerancia THEN
        v_status := 'approved';
    ELSE
        v_status := 'divergence';
    END IF;

    -- 4. Gravação / Atualização em daily_snapshots
    IF FOUND THEN
        UPDATE public.daily_snapshots
        SET is_closed = true,
            status = v_status,
            faturamento = COALESCE((v_summary->>'faturamento_periodo')::numeric, (v_summary->>'faturamento')::numeric, 0),
            saldo_bancos = COALESCE((v_summary->>'saldo_bancos')::numeric, 0),
            dinheiro_mp = COALESCE((v_summary->>'dinheiro_mp')::numeric, 0),
            a_receber_manual = COALESCE((v_summary->>'a_receber')::numeric, 0),
            total_patio = COALESCE((v_summary->>'na_loja_os')::numeric, 0),
            caixa_atual = COALESCE((v_summary->>'caixa_atual')::numeric, 0),
            caixa_anterior = COALESCE((v_summary->>'caixa_anterior')::numeric, 0),
            contas_a_pagar = COALESCE((v_summary->>'contas_manual')::numeric, 0),
            diferenca_final = v_diferenca,
            metadata = v_summary,
            updated_at = now()
        WHERE date = p_date
        RETURNING id INTO v_existing_snapshot.id;
    ELSE
        INSERT INTO public.daily_snapshots (
            date,
            is_closed,
            status,
            faturamento,
            saldo_bancos,
            dinheiro_mp,
            a_receber_manual,
            total_patio,
            caixa_atual,
            caixa_anterior,
            contas_a_pagar,
            diferenca_final,
            metadata,
            created_at,
            updated_at
        ) VALUES (
            p_date,
            true,
            v_status,
            COALESCE((v_summary->>'faturamento_periodo')::numeric, (v_summary->>'faturamento')::numeric, 0),
            COALESCE((v_summary->>'saldo_bancos')::numeric, 0),
            COALESCE((v_summary->>'dinheiro_mp')::numeric, 0),
            COALESCE((v_summary->>'a_receber')::numeric, 0),
            COALESCE((v_summary->>'na_loja_os')::numeric, 0),
            COALESCE((v_summary->>'caixa_atual')::numeric, 0),
            COALESCE((v_summary->>'caixa_anterior')::numeric, 0),
            COALESCE((v_summary->>'contas_manual')::numeric, 0),
            v_diferenca,
            v_summary,
            now(),
            now()
        )
        RETURNING id INTO v_existing_snapshot.id;
    END IF;

    -- 5. Payload de Retorno
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Dia fechado com sucesso.',
        'date', p_date,
        'snapshot_id', v_existing_snapshot.id,
        'is_closed', true,
        'diferenca_final', v_diferenca,
        'status', v_status,
        'summary', v_summary
    );
END;
$$;
