-- ============================================================================
-- Migration: 20260903000027_reconciliation_pipeline_sessions.sql
-- Descrição: Tabela canônica de sessões da esteira de conciliação diária e
--            RPCs determinísticas para o pipeline de 4 fases (ZERO IA).
-- ============================================================================

-- 1. TABELA CANÔNICA DE SESSÕES DO PIPELINE SEQUENCIAL
CREATE TABLE IF NOT EXISTS public.reconciliation_pipeline_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_date DATE NOT NULL UNIQUE,
    current_step INT NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 5),
    selected_mode TEXT NOT NULL DEFAULT 'undecided' CHECK (selected_mode IN ('undecided', 'manual', 'ai')),
    steps_completed JSONB NOT NULL DEFAULT '[]'::jsonb,
    step_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    bifurcated_to_chat BOOLEAN NOT NULL DEFAULT false,
    chat_conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'paused', 'completed', 'abandoned')),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_sessions_target_date 
ON public.reconciliation_pipeline_sessions(target_date);

CREATE INDEX IF NOT EXISTS idx_pipeline_sessions_status 
ON public.reconciliation_pipeline_sessions(status);

ALTER TABLE public.reconciliation_pipeline_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_pipeline_sessions" ON public.reconciliation_pipeline_sessions;
CREATE POLICY "allow_all_pipeline_sessions" 
ON public.reconciliation_pipeline_sessions FOR ALL USING (true) WITH CHECK (true);


-- ============================================================================
-- 2. RPC: get_pipeline_session_state (Hidratação Instantânea no F5)
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_pipeline_session_state(date);

CREATE OR REPLACE FUNCTION public.get_pipeline_session_state(p_target_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session RECORD;
    v_summary JSONB;
    v_os_count INT := 0;
    v_pos_total INT := 0;
    v_pos_unmatched INT := 0;
    v_ofx_in_total INT := 0;
    v_ofx_in_unmatched INT := 0;
    v_ofx_out_total INT := 0;
    v_ofx_out_unmatched INT := 0;
    v_bills_total INT := 0;
    v_bills_unmatched INT := 0;
    v_active_conv_id UUID;
BEGIN
    IF p_target_date IS NULL THEN
        RAISE EXCEPTION 'p_target_date é obrigatório.';
    END IF;

    -- Localiza ou cria a sessão para o targetDate
    SELECT * INTO v_session 
    FROM public.reconciliation_pipeline_sessions 
    WHERE target_date = p_target_date;

    IF v_session.id IS NULL THEN
        -- Tenta encontrar conversa ativa existente
        SELECT id INTO v_active_conv_id 
        FROM public.conversations 
        WHERE target_date = p_target_date AND status = 'active'
        ORDER BY updated_at DESC LIMIT 1;

        INSERT INTO public.reconciliation_pipeline_sessions (
            target_date, current_step, selected_mode, steps_completed, step_data, chat_conversation_id
        ) VALUES (
            p_target_date, 1, 'undecided', '[]'::jsonb, '{}'::jsonb, v_active_conv_id
        )
        RETURNING * INTO v_session;
    END IF;

    -- Métricas em tempo real das 4 etapas
    SELECT count(*) INTO v_os_count 
    FROM public.patio_os 
    WHERE opened_at::date = p_target_date OR last_payment_date = p_target_date;

    SELECT count(*), count(*) FILTER (WHERE matched_os_number IS NULL)
    INTO v_pos_total, v_pos_unmatched 
    FROM public.pos_transactions 
    WHERE target_date = p_target_date;

    SELECT count(*), count(*) FILTER (WHERE matched_os_number IS NULL AND manual_category IS NULL)
    INTO v_ofx_in_total, v_ofx_in_unmatched 
    FROM public.ofx_transactions 
    WHERE target_date = p_target_date AND type = 'in';

    SELECT count(*), count(*) FILTER (WHERE matched_bill_id IS NULL AND manual_category IS NULL)
    INTO v_ofx_out_total, v_ofx_out_unmatched 
    FROM public.ofx_transactions 
    WHERE target_date = p_target_date AND type = 'out';

    SELECT count(*), count(*) FILTER (WHERE matched_ofx_id IS NULL)
    INTO v_bills_total, v_bills_unmatched 
    FROM public.daily_manual_bills 
    WHERE date = p_target_date;

    -- Resumo dinâmico dos 5 Pilares no PostgreSQL
    v_summary := public.get_daily_reconciliation_summary(p_target_date::text, true);

    RETURN jsonb_build_object(
        'session_id', v_session.id,
        'target_date', v_session.target_date,
        'current_step', v_session.current_step,
        'selected_mode', v_session.selected_mode,
        'steps_completed', v_session.steps_completed,
        'step_data', v_session.step_data,
        'bifurcated_to_chat', v_session.bifurcated_to_chat,
        'chat_conversation_id', v_session.chat_conversation_id,
        'status', v_session.status,
        'metrics', jsonb_build_object(
            'stage1_os', jsonb_build_object('total_os', v_os_count),
            'stage2_rede', jsonb_build_object('total_pos', v_pos_total, 'unmatched_pos', v_pos_unmatched),
            'stage3_ofx', jsonb_build_object('total_in', v_ofx_in_total, 'unmatched_in', v_ofx_in_unmatched),
            'stage4_contas', jsonb_build_object(
                'total_out', v_ofx_out_total, 
                'unmatched_out', v_ofx_out_unmatched, 
                'total_bills', v_bills_total, 
                'unmatched_bills', v_bills_unmatched
            )
        ),
        'reconciliation_summary', v_summary
    );
END;
$$;


-- ============================================================================
-- 3. RPC: save_pipeline_step_progress (Avanço & Rascunho sem Perda no Reload)
-- ============================================================================
DROP FUNCTION IF EXISTS public.save_pipeline_step_progress(date, int, text, jsonb, boolean, uuid, text);

CREATE OR REPLACE FUNCTION public.save_pipeline_step_progress(
    p_target_date DATE,
    p_step INT,
    p_step_name TEXT,
    p_step_data JSONB DEFAULT '{}'::jsonb,
    p_mark_completed BOOLEAN DEFAULT false,
    p_chat_conversation_id UUID DEFAULT NULL,
    p_selected_mode TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session RECORD;
    v_steps JSONB;
    v_next_step INT;
    v_mode TEXT;
BEGIN
    SELECT * INTO v_session 
    FROM public.reconciliation_pipeline_sessions 
    WHERE target_date = p_target_date FOR UPDATE;

    IF v_session.id IS NULL THEN
        INSERT INTO public.reconciliation_pipeline_sessions (
            target_date, current_step, selected_mode
        ) VALUES (
            p_target_date, p_step, COALESCE(p_selected_mode, 'manual')
        )
        RETURNING * INTO v_session;
    END IF;

    v_steps := COALESCE(v_session.steps_completed, '[]'::jsonb);
    IF p_mark_completed AND NOT (v_steps ? p_step_name) THEN
        v_steps := v_steps || to_jsonb(p_step_name);
    END IF;

    v_next_step := v_session.current_step;
    IF p_mark_completed AND p_step = v_session.current_step AND p_step < 5 THEN
        v_next_step := p_step + 1;
    END IF;

    v_mode := COALESCE(p_selected_mode, v_session.selected_mode);

    UPDATE public.reconciliation_pipeline_sessions
    SET 
        current_step = v_next_step,
        selected_mode = v_mode,
        steps_completed = v_steps,
        step_data = COALESCE(step_data, '{}'::jsonb) || jsonb_build_object(p_step_name, p_step_data),
        chat_conversation_id = COALESCE(p_chat_conversation_id, chat_conversation_id),
        last_activity_at = now(),
        updated_at = now()
    WHERE id = v_session.id
    RETURNING * INTO v_session;

    RETURN public.get_pipeline_session_state(p_target_date);
END;
$$;


-- ============================================================================
-- 4. RPC: match_stage2_rede_os (Pré-Matching 100% Determinístico Balcão x OS)
-- ============================================================================
DROP FUNCTION IF EXISTS public.match_stage2_rede_os(date, text);

CREATE OR REPLACE FUNCTION public.match_stage2_rede_os(
    p_target_date DATE,
    p_store_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pos RECORD;
    v_os RECORD;
    v_candidates_count INT;
    v_matched_count INT := 0;
    v_collision_count INT := 0;
    v_collisions JSONB := '[]'::jsonb;
    v_candidate_samples JSONB;
    
    v_total_rede_bruto NUMERIC := 0;
    v_total_rede_liquido NUMERIC := 0;
    v_total_rede_taxas NUMERIC := 0;
    v_unmatched_pos_count INT := 0;
    v_unmatched_pos_sample JSONB := '[]'::jsonb;
    v_unmatched_os_cards_count INT := 0;
    v_unmatched_os_cards_sample JSONB := '[]'::jsonb;
BEGIN
    IF p_target_date IS NULL THEN
        RAISE EXCEPTION 'p_target_date é obrigatório.';
    END IF;

    -- Iterar sobre POS transactions não pareadas da data
    FOR v_pos IN 
        SELECT id, store_id, net_amount, gross_amount, fee_amount, payment_method, machine_name, occurred_at
        FROM public.pos_transactions
        WHERE target_date = p_target_date
          AND matched_os_number IS NULL
          AND (p_store_id IS NULL OR store_id = p_store_id)
        ORDER BY net_amount DESC
    LOOP
        v_os := NULL;
        v_candidates_count := 0;

        -- Teste de correspondência determinística na mesma filial
        SELECT count(*), jsonb_agg(jsonb_build_object(
            'id', id, 
            'os_number', os_number, 
            'client_name', client_name, 
            'total_value', total_value, 
            'pending_value', (total_value - paid_value)
        ))
        INTO v_candidates_count, v_candidate_samples
        FROM public.patio_os
        WHERE store_id = v_pos.store_id
          AND (
              ABS(COALESCE(credit_value, 0) - v_pos.net_amount) <= 0.05
              OR ABS(COALESCE(debit_value, 0) - v_pos.net_amount) <= 0.05
              OR ABS(COALESCE(credit_value, 0) - v_pos.gross_amount) <= 0.05
              OR ABS(COALESCE(debit_value, 0) - v_pos.gross_amount) <= 0.05
              OR ABS((total_value - paid_value) - v_pos.net_amount) <= 0.05
              OR ABS(total_value - v_pos.gross_amount) <= 0.05
              OR ABS(total_value - v_pos.net_amount) <= 0.05
          );

        -- GUARDA DE UNICIDADE: Apenas 1 candidato -> Match 100% Determinístico
        IF v_candidates_count = 1 THEN
            SELECT id, os_number, total_value, paid_value, status
            INTO v_os
            FROM public.patio_os
            WHERE store_id = v_pos.store_id
              AND (
                  ABS(COALESCE(credit_value, 0) - v_pos.net_amount) <= 0.05
                  OR ABS(COALESCE(debit_value, 0) - v_pos.net_amount) <= 0.05
                  OR ABS(COALESCE(credit_value, 0) - v_pos.gross_amount) <= 0.05
                  OR ABS(COALESCE(debit_value, 0) - v_pos.gross_amount) <= 0.05
                  OR ABS((total_value - paid_value) - v_pos.net_amount) <= 0.05
                  OR ABS(total_value - v_pos.gross_amount) <= 0.05
                  OR ABS(total_value - v_pos.net_amount) <= 0.05
              )
            LIMIT 1;

            UPDATE public.pos_transactions
            SET matched_os_number = v_os.os_number,
                settlement_status = 'entrou',
                updated_at = now()
            WHERE id = v_pos.id;

            IF v_os.status NOT ILIKE '%finalizad%' AND v_os.status NOT ILIKE '%pago%' THEN
                UPDATE public.patio_os
                SET paid_value = LEAST(total_value, paid_value + v_pos.net_amount),
                    status = CASE WHEN (paid_value + v_pos.net_amount) >= total_value - 0.05 THEN 'finalizada' ELSE 'pago_parcial' END,
                    match_status = 'MATCHED',
                    updated_at = now()
                WHERE id = v_os.id;
            END IF;

            BEGIN
                INSERT INTO public.conciliation_matches (
                    store_id, system_os_number, rede_transaction_id, status, target_date
                ) VALUES (v_pos.store_id, v_os.os_number, v_pos.id, 'matched', p_target_date);
            EXCEPTION WHEN OTHERS THEN NULL; END;

            v_matched_count := v_matched_count + 1;

        -- GUARDA DE COLISÃO: Mais de 1 candidato -> Suspensão para desempate do operador
        ELSIF v_candidates_count > 1 THEN
            v_collision_count := v_collision_count + 1;
            v_collisions := v_collisions || jsonb_build_object(
                'pos_id', v_pos.id,
                'store_id', v_pos.store_id,
                'net_amount', v_pos.net_amount,
                'gross_amount', v_pos.gross_amount,
                'payment_method', v_pos.payment_method,
                'candidates', v_candidate_samples
            );
        END IF;
    END LOOP;

    -- Totalizadores da Adquirente no dia
    SELECT 
        COALESCE(SUM(gross_amount), 0),
        COALESCE(SUM(net_amount), 0),
        COALESCE(SUM(fee_amount), 0)
    INTO v_total_rede_bruto, v_total_rede_liquido, v_total_rede_taxas
    FROM public.pos_transactions
    WHERE target_date = p_target_date
      AND (p_store_id IS NULL OR store_id = p_store_id);

    -- Resíduos A: Cartões sem OS
    SELECT count(*), COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'store_id', store_id, 'net_amount', net_amount, 'machine_name', machine_name, 'payment_method', payment_method
    )), '[]'::jsonb)
    INTO v_unmatched_pos_count, v_unmatched_pos_sample
    FROM (
        SELECT id, store_id, net_amount, machine_name, payment_method
        FROM public.pos_transactions
        WHERE target_date = p_target_date
          AND matched_os_number IS NULL
          AND (p_store_id IS NULL OR store_id = p_store_id)
        LIMIT 20
    ) t;

    -- Resíduos B: OSs com Cartão não passado
    SELECT count(*), COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'store_id', store_id, 'os_number', os_number, 'client_name', client_name, 'credit_value', credit_value, 'debit_value', debit_value
    )), '[]'::jsonb)
    INTO v_unmatched_os_cards_count, v_unmatched_os_cards_sample
    FROM (
        SELECT id, store_id, os_number, client_name, credit_value, debit_value
        FROM public.patio_os
        WHERE opened_at::date = p_target_date
          AND (COALESCE(credit_value, 0) > 0 OR COALESCE(debit_value, 0) > 0)
          AND match_status <> 'MATCHED'
          AND (p_store_id IS NULL OR store_id = p_store_id)
        LIMIT 20
    ) o;

    RETURN jsonb_build_object(
        'success', true,
        'target_date', p_target_date,
        'matched_count', v_matched_count,
        'collisions_count', v_collision_count,
        'collisions', v_collisions,
        'unmatched_pos_count', v_unmatched_pos_count,
        'unmatched_pos_sample', v_unmatched_pos_sample,
        'unmatched_os_cards_count', v_unmatched_os_cards_count,
        'unmatched_os_cards_sample', v_unmatched_os_cards_sample,
        'totals', jsonb_build_object(
            'rede_bruto', v_total_rede_bruto,
            'rede_liquido', v_total_rede_liquido,
            'rede_taxas', v_total_rede_taxas
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pipeline_session_state(date) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.save_pipeline_step_progress(date, int, text, jsonb, boolean, uuid, text) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.match_stage2_rede_os(date, text) TO authenticated, service_role, anon;
