-- ============================================================================
-- Migration: 20261001000002_unify_rede_os_matcher_and_diagnostics.sql
-- Description: Unifica o Matcher Rede x OS, a seleção manual e o diagnóstico (Spec 461)
--   1. Elimina erro 42702 em get_rede_os_eligible_candidates via qualificação estrita.
--   2. Normalização semântica de acentos (TRANSLATE) para modalidades 'cred' e 'deb'.
--   3. Substitui tabelas temporárias por CTEs para prevenir colisão de sessões.
--   4. Enriquecimento de diagnóstico contábil (baseline, delta, consumo, disponível).
--   5. Unicidade bidirecional estrita (1:1) em match_stage2_rede_os.
--   6. Harmonização de contratos de resposta e propagação de erros em auto_match_daily_transactions.
--   7. Ajuste com acentos em link_manual_rede_to_os e unlink_manual_os_match.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. get_rede_os_eligible_candidates
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_rede_os_eligible_candidates(UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION public.get_rede_os_eligible_candidates(
    p_pos_id UUID,
    p_include_historical BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    os_number TEXT,
    client_name TEXT,
    plate TEXT,
    candidate_status TEXT,
    reason_code TEXT,
    credit_before NUMERIC,
    credit_after NUMERIC,
    consumed_credit NUMERIC,
    delta_credit NUMERIC,
    debit_before NUMERIC,
    debit_after NUMERIC,
    consumed_debit NUMERIC,
    delta_debit NUMERIC,
    available_card_amount NUMERIC,
    pos_gross_amount NUMERIC,
    total_value NUMERIC,
    paid_value NUMERIC,
    open_balance NUMERIC,
    payment_method TEXT,
    observed_at TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
    v_pos RECORD;
    v_norm_method TEXT;
    v_is_debit BOOLEAN;
    v_is_credit BOOLEAN;
    v_linked_os TEXT[];
    v_obs_count INT;
BEGIN
    -- 1. Carregar a transação POS com qualificação total
    SELECT 
        pt.id, 
        pt.store_id, 
        pt.target_date, 
        pt.gross_amount, 
        pt.payment_method
    INTO v_pos
    FROM public.pos_transactions pt
    WHERE pt.id = p_pos_id;

    IF v_pos.id IS NULL THEN
        RETURN;
    END IF;

    -- 2. Normalizar modalidade com remoção de acentos
    v_norm_method := TRANSLATE(LOWER(COALESCE(v_pos.payment_method, '')), 'áàãâéêíóôõúüç', 'aaaaeeiooouuc');
    v_is_debit := (v_norm_method LIKE '%deb%');
    v_is_credit := (v_norm_method LIKE '%cred%');

    -- 3. Identificar OSs já vinculadas a outras transações POS nesta conciliação
    SELECT COALESCE(ARRAY_AGG(pt2.matched_os_number), '{}')
    INTO v_linked_os
    FROM public.pos_transactions pt2
    WHERE pt2.target_date = v_pos.target_date
      AND pt2.matched_os_number IS NOT NULL
      AND pt2.id <> p_pos_id;

    -- 4. Verificar se existem observações de importação nesta loja e data
    SELECT count(*)
    INTO v_obs_count
    FROM public.os_import_observations obs
    WHERE obs.store_id = v_pos.store_id
      AND obs.target_date = v_pos.target_date;

    IF v_obs_count > 0 THEN
        RETURN QUERY
        WITH raw_obs AS (
            SELECT 
                o.os_number::TEXT AS r_os_number,
                COALESCE(o.client_name, 'Cliente')::TEXT AS r_client_name,
                COALESCE(o.plate, '')::TEXT AS r_plate,
                COALESCE(o.credit_before, 0)::NUMERIC AS r_credit_before,
                COALESCE(o.credit_after, 0)::NUMERIC AS r_credit_after,
                COALESCE(o.consumed_credit, 0)::NUMERIC AS r_consumed_credit,
                COALESCE(o.delta_credit, 0)::NUMERIC AS r_delta_credit,
                COALESCE(o.debit_before, 0)::NUMERIC AS r_debit_before,
                COALESCE(o.debit_after, 0)::NUMERIC AS r_debit_after,
                COALESCE(o.consumed_debit, 0)::NUMERIC AS r_consumed_debit,
                COALESCE(o.delta_debit, 0)::NUMERIC AS r_delta_debit,
                CASE 
                    WHEN v_is_debit THEN GREATEST(0, COALESCE(o.delta_debit, 0) - COALESCE(o.consumed_debit, 0))
                    WHEN v_is_credit THEN GREATEST(0, COALESCE(o.delta_credit, 0) - COALESCE(o.consumed_credit, 0))
                    ELSE 0::NUMERIC
                END AS r_available_card_amount,
                v_pos.gross_amount::NUMERIC AS r_pos_gross_amount,
                COALESCE(o.total_value, 0)::NUMERIC AS r_total_value,
                COALESCE(o.paid_after, 0)::NUMERIC AS r_paid_value,
                GREATEST(0, COALESCE(o.total_value, 0) - COALESCE(o.paid_after, 0))::NUMERIC AS r_open_balance,
                CASE 
                    WHEN COALESCE(o.delta_debit, 0) > 0 AND COALESCE(o.delta_credit, 0) > 0 THEN 'DÉBITO / CRÉDITO'::TEXT 
                    WHEN COALESCE(o.delta_debit, 0) > 0 THEN 'DÉBITO'::TEXT 
                    WHEN COALESCE(o.delta_credit, 0) > 0 THEN 'CRÉDITO'::TEXT 
                    ELSE COALESCE(o.status, 'OS')::TEXT 
                END AS r_payment_method,
                o.target_date::TEXT AS r_observed_at,
                CASE 
                    WHEN o.os_number = ANY(v_linked_os) THEN 'already_consumed'::TEXT
                    WHEN NOT v_is_debit AND NOT v_is_credit THEN 'unrecognized_modality'::TEXT
                    WHEN v_is_debit AND ABS(GREATEST(0, COALESCE(o.delta_debit, 0) - COALESCE(o.consumed_debit, 0)) - v_pos.gross_amount) <= 0.05 THEN 'eligible'::TEXT
                    WHEN v_is_credit AND ABS(GREATEST(0, COALESCE(o.delta_credit, 0) - COALESCE(o.consumed_credit, 0)) - v_pos.gross_amount) <= 0.05 THEN 'eligible'::TEXT
                    WHEN v_is_debit AND COALESCE(o.delta_credit, 0) > 0 AND ABS(o.delta_credit - v_pos.gross_amount) <= 0.05 THEN 'modality_mismatch'::TEXT
                    WHEN v_is_credit AND COALESCE(o.delta_debit, 0) > 0 AND ABS(o.delta_debit - v_pos.gross_amount) <= 0.05 THEN 'modality_mismatch'::TEXT
                    WHEN (COALESCE(o.consumed_debit, 0) + COALESCE(o.consumed_credit, 0)) > 0 
                         AND (CASE WHEN v_is_debit THEN GREATEST(0, COALESCE(o.delta_debit, 0) - COALESCE(o.consumed_debit, 0)) ELSE GREATEST(0, COALESCE(o.delta_credit, 0) - COALESCE(o.consumed_credit, 0)) END) <= 0.05 THEN 'already_consumed'::TEXT
                    WHEN (CASE WHEN v_is_debit THEN COALESCE(o.delta_debit, 0) ELSE COALESCE(o.delta_credit, 0) END) > 0 THEN 'divergent_value'::TEXT
                    ELSE 'no_card_delta'::TEXT
                END AS r_base_status,
                CASE 
                    WHEN o.os_number = ANY(v_linked_os) THEN 'OS já vinculada a outra venda de cartão nesta conciliação.'::TEXT
                    WHEN NOT v_is_debit AND NOT v_is_credit THEN 'Modalidade da maquininha não reconhecida (nem débito nem crédito).'::TEXT
                    WHEN v_is_debit AND ABS(GREATEST(0, COALESCE(o.delta_debit, 0) - COALESCE(o.consumed_debit, 0)) - v_pos.gross_amount) <= 0.05 THEN 'Delta de débito comprovado na importação confere 100% com o valor bruto.'::TEXT
                    WHEN v_is_credit AND ABS(GREATEST(0, COALESCE(o.delta_credit, 0) - COALESCE(o.consumed_credit, 0)) - v_pos.gross_amount) <= 0.05 THEN 'Delta de crédito comprovado na importação confere 100% com o valor bruto.'::TEXT
                    WHEN v_is_debit AND COALESCE(o.delta_credit, 0) > 0 AND ABS(o.delta_credit - v_pos.gross_amount) <= 0.05 THEN format('Modalidade incompatível: OS teve delta CRÉDITO R$ %s, mas a venda é DÉBITO.', o.delta_credit)
                    WHEN v_is_credit AND COALESCE(o.delta_debit, 0) > 0 AND ABS(o.delta_debit - v_pos.gross_amount) <= 0.05 THEN format('Modalidade incompatível: OS teve delta DÉBITO R$ %s, mas a venda é CRÉDITO.', o.delta_debit)
                    WHEN (COALESCE(o.consumed_debit, 0) + COALESCE(o.consumed_credit, 0)) > 0 
                         AND (CASE WHEN v_is_debit THEN GREATEST(0, COALESCE(o.delta_debit, 0) - COALESCE(o.consumed_debit, 0)) ELSE GREATEST(0, COALESCE(o.delta_credit, 0) - COALESCE(o.consumed_credit, 0)) END) <= 0.05 THEN 'Delta de cartão desta OS já foi consumido por outros vínculos.'::TEXT
                    WHEN (CASE WHEN v_is_debit THEN COALESCE(o.delta_debit, 0) ELSE COALESCE(o.delta_credit, 0) END) > 0 THEN format('Valor divergente: delta da OS é R$ %s (disponível: R$ %s), bruto da maquininha é R$ %s.', CASE WHEN v_is_debit THEN o.delta_debit ELSE o.delta_credit END, CASE WHEN v_is_debit THEN GREATEST(0, o.delta_debit - o.consumed_debit) ELSE GREATEST(0, o.delta_credit - o.consumed_credit) END, v_pos.gross_amount)
                    ELSE 'OS importada nesta data sem novos lançamentos em cartão.'::TEXT
                END AS r_base_reason
            FROM public.os_import_observations o
            WHERE o.store_id = v_pos.store_id
              AND o.target_date = v_pos.target_date
        ),
        eligible_stats AS (
            SELECT COUNT(*)::INT AS total_eligible FROM raw_obs WHERE r_base_status = 'eligible'
        ),
        processed_candidates AS (
            SELECT 
                ro.r_os_number AS os_number,
                ro.r_client_name AS client_name,
                ro.r_plate AS plate,
                CASE 
                    WHEN ro.r_base_status = 'eligible' AND es.total_eligible > 1 THEN 'collision'::TEXT
                    ELSE ro.r_base_status
                END AS candidate_status,
                CASE 
                    WHEN ro.r_base_status = 'eligible' AND es.total_eligible > 1 THEN 
                        format('Colisão ambígua: %s OSs possuem o mesmo delta disponível de R$ %s. Requer seleção manual.', es.total_eligible, v_pos.gross_amount)
                    ELSE ro.r_base_reason
                END AS reason_code,
                ro.r_credit_before AS credit_before,
                ro.r_credit_after AS credit_after,
                ro.r_consumed_credit AS consumed_credit,
                ro.r_delta_credit AS delta_credit,
                ro.r_debit_before AS debit_before,
                ro.r_debit_after AS debit_after,
                ro.r_consumed_debit AS consumed_debit,
                ro.r_delta_debit AS delta_debit,
                ro.r_available_card_amount AS available_card_amount,
                ro.r_pos_gross_amount AS pos_gross_amount,
                ro.r_total_value AS total_value,
                ro.r_paid_value AS paid_value,
                ro.r_open_balance AS open_balance,
                ro.r_payment_method AS payment_method,
                ro.r_observed_at AS observed_at
            FROM raw_obs ro
            CROSS JOIN eligible_stats es
        )
        SELECT * FROM processed_candidates
        UNION ALL
        SELECT 
            p.os_number::TEXT,
            COALESCE(p.client_name, 'Cliente')::TEXT,
            COALESCE(p.plate, '')::TEXT,
            'historical_no_delta'::TEXT AS candidate_status,
            'OS do histórico sem movimentação na conciliação atual.'::TEXT AS reason_code,
            COALESCE(p.credit_value, 0)::NUMERIC AS credit_before,
            COALESCE(p.credit_value, 0)::NUMERIC AS credit_after,
            0::NUMERIC AS consumed_credit,
            0::NUMERIC AS delta_credit,
            COALESCE(p.debit_value, 0)::NUMERIC AS debit_before,
            COALESCE(p.debit_value, 0)::NUMERIC AS debit_after,
            0::NUMERIC AS consumed_debit,
            0::NUMERIC AS delta_debit,
            0::NUMERIC AS available_card_amount,
            v_pos.gross_amount::NUMERIC AS pos_gross_amount,
            COALESCE(p.total_value, 0)::NUMERIC AS total_value,
            COALESCE(p.paid_value, 0)::NUMERIC AS paid_value,
            GREATEST(0, COALESCE(p.total_value, 0) - COALESCE(p.paid_value, 0))::NUMERIC AS open_balance,
            COALESCE(p.payment_method, 'Histórico')::TEXT AS payment_method,
            COALESCE(p.last_payment_date::TEXT, p.opened_at::TEXT, '')::TEXT AS observed_at
        FROM public.patio_os p
        WHERE p_include_historical = TRUE
          AND p.store_id = v_pos.store_id
          AND NOT EXISTS (SELECT 1 FROM raw_obs ro WHERE ro.r_os_number = p.os_number)
        ORDER BY candidate_status ASC, os_number ASC;

    ELSE
        -- Modo de legado sem observações gravadas
        RETURN QUERY
        WITH legacy_raw AS (
            SELECT 
                p.os_number::TEXT AS l_os_number,
                COALESCE(p.client_name, 'Cliente')::TEXT AS l_client_name,
                COALESCE(p.plate, '')::TEXT AS l_plate,
                COALESCE(p.credit_value, 0)::NUMERIC AS l_credit_before,
                COALESCE(p.credit_value, 0)::NUMERIC AS l_credit_after,
                0::NUMERIC AS l_consumed_credit,
                COALESCE(p.credit_value, 0)::NUMERIC AS l_delta_credit,
                COALESCE(p.debit_value, 0)::NUMERIC AS l_debit_before,
                COALESCE(p.debit_value, 0)::NUMERIC AS l_debit_after,
                0::NUMERIC AS l_consumed_debit,
                COALESCE(p.debit_value, 0)::NUMERIC AS l_delta_debit,
                CASE 
                    WHEN v_is_debit THEN COALESCE(p.debit_value, 0)
                    WHEN v_is_credit THEN COALESCE(p.credit_value, 0)
                    ELSE 0::NUMERIC
                END AS l_available_card_amount,
                v_pos.gross_amount::NUMERIC AS l_pos_gross_amount,
                COALESCE(p.total_value, 0)::NUMERIC AS l_total_value,
                COALESCE(p.paid_value, 0)::NUMERIC AS l_paid_value,
                GREATEST(0, COALESCE(p.total_value, 0) - COALESCE(p.paid_value, 0))::NUMERIC AS l_open_balance,
                COALESCE(p.payment_method, 'Cartão')::TEXT AS l_payment_method,
                COALESCE(p.last_payment_date::TEXT, p.opened_at::TEXT, '')::TEXT AS l_observed_at,
                CASE 
                    WHEN p.os_number = ANY(v_linked_os) THEN 'already_consumed'::TEXT
                    WHEN NOT v_is_debit AND NOT v_is_credit THEN 'unrecognized_modality'::TEXT
                    WHEN v_is_debit AND ABS(COALESCE(p.debit_value, 0) - v_pos.gross_amount) <= 0.05 THEN 'eligible'::TEXT
                    WHEN v_is_credit AND ABS(COALESCE(p.credit_value, 0) - v_pos.gross_amount) <= 0.05 THEN 'eligible'::TEXT
                    WHEN v_is_debit AND COALESCE(p.credit_value, 0) > 0 AND ABS(p.credit_value - v_pos.gross_amount) <= 0.05 THEN 'modality_mismatch'::TEXT
                    WHEN v_is_credit AND COALESCE(p.debit_value, 0) > 0 AND ABS(p.debit_value - v_pos.gross_amount) <= 0.05 THEN 'modality_mismatch'::TEXT
                    ELSE 'divergent_value'::TEXT
                END AS l_base_status,
                CASE 
                    WHEN p.os_number = ANY(v_linked_os) THEN 'OS já vinculada a outra venda de cartão nesta conciliação.'::TEXT
                    WHEN NOT v_is_debit AND NOT v_is_credit THEN 'Modalidade não reconhecida.'::TEXT
                    WHEN v_is_debit AND ABS(COALESCE(p.debit_value, 0) - v_pos.gross_amount) <= 0.05 THEN 'Valor de débito da OS confere 100% com o valor bruto.'::TEXT
                    WHEN v_is_credit AND ABS(COALESCE(p.credit_value, 0) - v_pos.gross_amount) <= 0.05 THEN 'Valor de crédito da OS confere 100% com o valor bruto.'::TEXT
                    WHEN v_is_debit AND COALESCE(p.credit_value, 0) > 0 AND ABS(p.credit_value - v_pos.gross_amount) <= 0.05 THEN format('Modalidade incompatível: OS possui CRÉDITO R$ %s, mas a venda é DÉBITO.', p.credit_value)
                    WHEN v_is_credit AND COALESCE(p.debit_value, 0) > 0 AND ABS(p.debit_value - v_pos.gross_amount) <= 0.05 THEN format('Modalidade incompatível: OS possui DÉBITO R$ %s, mas a venda é CRÉDITO.', p.debit_value)
                    ELSE 'Valor divergente do lançamento de maquininha.'::TEXT
                END AS l_base_reason
            FROM public.patio_os p
            WHERE p.store_id = v_pos.store_id
              AND (
                  p.last_payment_date = v_pos.target_date
                  OR p.opened_at::date = v_pos.target_date
                  OR (p_include_historical AND (COALESCE(p.credit_value, 0) > 0 OR COALESCE(p.debit_value, 0) > 0))
              )
        ),
        legacy_stats AS (
            SELECT COUNT(*)::INT AS total_eligible FROM legacy_raw WHERE l_base_status = 'eligible'
        )
        SELECT 
            lr.l_os_number AS os_number,
            lr.l_client_name AS client_name,
            lr.l_plate AS plate,
            CASE 
                WHEN lr.l_base_status = 'eligible' AND ls.total_eligible > 1 THEN 'collision'::TEXT
                ELSE lr.l_base_status
            END AS candidate_status,
            CASE 
                WHEN lr.l_base_status = 'eligible' AND ls.total_eligible > 1 THEN 
                    format('Colisão ambígua: %s OSs possuem o mesmo valor de R$ %s. Requer seleção manual.', ls.total_eligible, v_pos.gross_amount)
                ELSE lr.l_base_reason
            END AS reason_code,
            lr.l_credit_before AS credit_before,
            lr.l_credit_after AS credit_after,
            lr.l_consumed_credit AS consumed_credit,
            lr.l_delta_credit AS delta_credit,
            lr.l_debit_before AS debit_before,
            lr.l_debit_after AS debit_after,
            lr.l_consumed_debit AS consumed_debit,
            lr.l_delta_debit AS delta_debit,
            lr.l_available_card_amount AS available_card_amount,
            lr.l_pos_gross_amount AS pos_gross_amount,
            lr.l_total_value AS total_value,
            lr.l_paid_value AS paid_value,
            lr.l_open_balance AS open_balance,
            lr.l_payment_method AS payment_method,
            lr.l_observed_at AS observed_at
        FROM legacy_raw lr
        CROSS JOIN legacy_stats ls
        ORDER BY candidate_status ASC, os_number ASC;
    END IF;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.get_rede_os_eligible_candidates(UUID, BOOLEAN) TO authenticated, service_role, anon;

-- ----------------------------------------------------------------------------
-- 2. match_stage2_rede_os (Motor Canônico com Unicidade Bidirecional 1:1)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.match_stage2_rede_os(
    p_target_date date, 
    p_store_id text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_pos RECORD;
    v_norm_method TEXT;
    v_is_debit BOOLEAN;
    v_is_credit BOOLEAN;
    v_has_observations BOOLEAN;
    
    v_matched_os_numbers TEXT[] := '{}';
    v_matched_pos_ids UUID[] := '{}';
    v_matched_count INT := 0;
    v_collision_count INT := 0;
    v_collisions JSONB := '[]'::jsonb;
    v_exhausted_orphan_count INT := 0;
    v_exhausted_orphans JSONB := '[]'::jsonb;
    
    v_total_rede_bruto NUMERIC := 0;
    v_total_rede_liquido NUMERIC := 0;
    v_total_rede_taxas NUMERIC := 0;
    v_unmatched_pos_count INT := 0;
    v_unmatched_pos_sample JSONB := '[]'::jsonb;
    v_unmatched_os_cards_count INT := 0;
    v_unmatched_os_cards_sample JSONB := '[]'::jsonb;

    v_chosen_os_number TEXT;
    v_candidate_samples JSONB;
    v_candidates_count INT;
    v_competing_pos_count INT;
BEGIN
    IF p_target_date IS NULL THEN
        RAISE EXCEPTION 'p_target_date é obrigatório.';
    END IF;

    -- 1. Pré-carregar números de OSs que já possuem vínculo na data alvo
    SELECT COALESCE(ARRAY_AGG(pt.matched_os_number), '{}') INTO v_matched_os_numbers
    FROM public.pos_transactions pt
    WHERE pt.target_date = p_target_date
      AND pt.matched_os_number IS NOT NULL
      AND (p_store_id IS NULL OR pt.store_id = p_store_id);

    -- 2. Iterar sobre transações POS não pareadas da data
    FOR v_pos IN 
        SELECT 
            pt.id, 
            pt.store_id, 
            pt.net_amount, 
            pt.gross_amount, 
            pt.fee_amount, 
            pt.payment_method, 
            pt.machine_name, 
            pt.occurred_at
        FROM public.pos_transactions pt
        WHERE pt.target_date = p_target_date
          AND pt.matched_os_number IS NULL
          AND (p_store_id IS NULL OR pt.store_id = p_store_id)
          AND pt.store_id IS NOT NULL
          AND (pt.transaction_type IS NULL OR pt.transaction_type = 'venda')
          AND pt.gross_amount > 0
        ORDER BY pt.gross_amount DESC, pt.id ASC
    LOOP
        -- Se já vinculada em iteração anterior, pula
        IF v_pos.id = ANY(v_matched_pos_ids) THEN
            CONTINUE;
        END IF;

        v_chosen_os_number := NULL;
        v_candidates_count := 0;
        v_candidate_samples := '[]'::jsonb;
        v_competing_pos_count := 0;

        -- Normalização semântica de acentos
        v_norm_method := TRANSLATE(LOWER(COALESCE(v_pos.payment_method, '')), 'áàãâéêíóôõúüç', 'aaaaeeiooouuc');
        v_is_debit := (v_norm_method LIKE '%deb%');
        v_is_credit := (v_norm_method LIKE '%cred%');

        -- Modalidade desconhecida: exige revisão humana, zero auto-match
        IF NOT v_is_debit AND NOT v_is_credit THEN
            v_exhausted_orphan_count := v_exhausted_orphan_count + 1;
            v_exhausted_orphans := v_exhausted_orphans || jsonb_build_object(
                'pos_id', v_pos.id,
                'store_id', v_pos.store_id,
                'gross_amount', v_pos.gross_amount,
                'payment_method', v_pos.payment_method,
                'reason', 'MODALIDADE_DESCONHECIDA: Transação de maquininha não identificada como débito nem crédito. Requer revisão manual.'
            );
            CONTINUE;
        END IF;

        -- Verifica existência de observações de importação
        SELECT EXISTS(
            SELECT 1 FROM public.os_import_observations obs
            WHERE obs.store_id = v_pos.store_id AND obs.target_date = p_target_date
        ) INTO v_has_observations;

        IF v_has_observations THEN
            -- Busca candidatos com delta disponível
            SELECT 
                COUNT(*)::INT,
                COALESCE(jsonb_agg(jsonb_build_object(
                    'os_number', obs.os_number, 
                    'client_name', COALESCE(obs.client_name, 'Cliente'), 
                    'total_value', obs.total_value,
                    'delta_credit', obs.delta_credit,
                    'delta_debit', obs.delta_debit,
                    'available_card_amount', CASE WHEN v_is_debit THEN GREATEST(0, obs.delta_debit - obs.consumed_debit) ELSE GREATEST(0, obs.delta_credit - obs.consumed_credit) END
                )), '[]'::jsonb)
            INTO v_candidates_count, v_candidate_samples
            FROM public.os_import_observations obs
            WHERE obs.store_id = v_pos.store_id
              AND obs.target_date = p_target_date
              AND NOT (obs.os_number = ANY(v_matched_os_numbers))
              AND (
                  (v_is_debit AND ABS(GREATEST(0, obs.delta_debit - obs.consumed_debit) - v_pos.gross_amount) <= 0.05)
                  OR (v_is_credit AND ABS(GREATEST(0, obs.delta_credit - obs.consumed_credit) - v_pos.gross_amount) <= 0.05)
              );

        ELSE
            -- Pátio legado
            SELECT 
                COUNT(*)::INT,
                COALESCE(jsonb_agg(jsonb_build_object(
                    'os_number', p.os_number, 
                    'client_name', COALESCE(p.client_name, 'Cliente'), 
                    'total_value', p.total_value, 
                    'paid_value', p.paid_value,
                    'credit_value', p.credit_value,
                    'debit_value', p.debit_value
                )), '[]'::jsonb)
            INTO v_candidates_count, v_candidate_samples
            FROM public.patio_os p
            WHERE p.store_id = v_pos.store_id
              AND NOT (p.os_number = ANY(v_matched_os_numbers))
              AND COALESCE(p.match_status, '') <> 'MATCHED'
              AND (p.last_payment_date = p_target_date OR p.opened_at::date = p_target_date)
              AND (
                  (v_is_debit AND ABS(COALESCE(p.debit_value, 0) - v_pos.gross_amount) <= 0.05)
                  OR (v_is_credit AND ABS(COALESCE(p.credit_value, 0) - v_pos.gross_amount) <= 0.05)
              );
        END IF;

        -- Unicidade Bidirecional (1:1):
        -- Verifica se há outras vendas POS não pareadas da mesma loja e data disputando o mesmo candidato
        IF v_candidates_count = 1 THEN
            v_chosen_os_number := v_candidate_samples->0->>'os_number';

            SELECT COUNT(*)::INT INTO v_competing_pos_count
            FROM public.pos_transactions pt_comp
            WHERE pt_comp.target_date = p_target_date
              AND pt_comp.store_id = v_pos.store_id
              AND pt_comp.matched_os_number IS NULL
              AND NOT (pt_comp.id = ANY(v_matched_pos_ids))
              AND (pt_comp.transaction_type IS NULL OR pt_comp.transaction_type = 'venda')
              AND ABS(pt_comp.gross_amount - v_pos.gross_amount) <= 0.05
              AND (
                  (v_is_debit AND TRANSLATE(LOWER(COALESCE(pt_comp.payment_method, '')), 'áàãâéêíóôõúüç', 'aaaaeeiooouuc') LIKE '%deb%')
                  OR (v_is_credit AND TRANSLATE(LOWER(COALESCE(pt_comp.payment_method, '')), 'áàãâéêíóôõúüç', 'aaaaeeiooouuc') LIKE '%cred%')
              );

            IF v_competing_pos_count > 1 THEN
                -- Colisão no lado POS: 2 ou mais maquininhas disputam a mesma OS
                v_collision_count := v_collision_count + 1;
                v_collisions := v_collisions || jsonb_build_object(
                    'pos_id', v_pos.id,
                    'store_id', v_pos.store_id,
                    'gross_amount', v_pos.gross_amount,
                    'payment_method', v_pos.payment_method,
                    'collision_type', 'multiple_pos',
                    'reason', format('Colisão bidirecional: %s vendas POS de R$ %s disputam a OS #%s.', v_competing_pos_count, v_pos.gross_amount, v_chosen_os_number),
                    'candidates', v_candidate_samples
                );
                CONTINUE;
            END IF;

            -- Sucesso 1:1 rigoroso
            UPDATE public.pos_transactions
            SET matched_os_number = v_chosen_os_number,
                updated_at = now()
            WHERE id = v_pos.id;

            IF v_has_observations THEN
                UPDATE public.os_import_observations
                SET 
                    consumed_debit = consumed_debit + (CASE WHEN v_is_debit THEN v_pos.gross_amount ELSE 0 END),
                    consumed_credit = consumed_credit + (CASE WHEN v_is_credit THEN v_pos.gross_amount ELSE 0 END),
                    updated_at = now()
                WHERE store_id = v_pos.store_id
                  AND target_date = p_target_date
                  AND os_number = v_chosen_os_number;
            END IF;

            UPDATE public.patio_os
            SET match_status = 'MATCHED',
                updated_at = now()
            WHERE store_id = v_pos.store_id
              AND os_number = v_chosen_os_number;

            BEGIN
                INSERT INTO public.conciliation_matches (
                    store_id, system_os_number, rede_transaction_id, status, target_date
                ) VALUES (
                    v_pos.store_id, v_chosen_os_number, v_pos.id, 'matched', p_target_date
                );
            EXCEPTION WHEN OTHERS THEN NULL; END;

            v_matched_os_numbers := array_append(v_matched_os_numbers, v_chosen_os_number);
            v_matched_pos_ids := array_append(v_matched_pos_ids, v_pos.id);
            v_matched_count := v_matched_count + 1;

        ELSIF v_candidates_count > 1 THEN
            -- Colisão no lado OS: 1 venda POS tem 2 ou mais OSs elegíveis
            v_collision_count := v_collision_count + 1;
            v_collisions := v_collisions || jsonb_build_object(
                'pos_id', v_pos.id,
                'store_id', v_pos.store_id,
                'gross_amount', v_pos.gross_amount,
                'payment_method', v_pos.payment_method,
                'collision_type', 'multiple_os',
                'reason', format('Colisão de OS: %s OSs possuem delta disponível de R$ %s.', v_candidates_count, v_pos.gross_amount),
                'candidates', v_candidate_samples
            );
        ELSE
            -- Sem candidato
            v_exhausted_orphan_count := v_exhausted_orphan_count + 1;
            v_exhausted_orphans := v_exhausted_orphans || jsonb_build_object(
                'pos_id', v_pos.id,
                'store_id', v_pos.store_id,
                'gross_amount', v_pos.gross_amount,
                'payment_method', v_pos.payment_method,
                'reason', format('PROVADO_INEXISTENTE: Nenhuma OS na filial %s possui delta de %s no valor bruto de R$ %s nesta conciliação.', 
                    v_pos.store_id, 
                    CASE WHEN v_is_debit THEN 'débito' WHEN v_is_credit THEN 'crédito' ELSE 'cartão' END, 
                    v_pos.gross_amount)
            );
        END IF;
    END LOOP;

    -- Totalizadores da Adquirente no dia
    SELECT 
        COALESCE(SUM(pt.gross_amount), 0),
        COALESCE(SUM(pt.net_amount), 0),
        COALESCE(SUM(pt.fee_amount), 0)
    INTO v_total_rede_bruto, v_total_rede_liquido, v_total_rede_taxas
    FROM public.pos_transactions pt
    WHERE pt.target_date = p_target_date
      AND (p_store_id IS NULL OR pt.store_id = p_store_id);

    -- Resíduos POS não casados
    SELECT count(*)::INT, COALESCE(jsonb_agg(jsonb_build_object(
        'id', pt_u.id, 'store_id', pt_u.store_id, 'gross_amount', pt_u.gross_amount, 'net_amount', pt_u.net_amount, 'machine_name', pt_u.machine_name, 'payment_method', pt_u.payment_method
    )), '[]'::jsonb)
    INTO v_unmatched_pos_count, v_unmatched_pos_sample
    FROM (
        SELECT id, store_id, gross_amount, net_amount, machine_name, payment_method
        FROM public.pos_transactions
        WHERE target_date = p_target_date
          AND matched_os_number IS NULL
          AND (p_store_id IS NULL OR store_id = p_store_id)
        ORDER BY gross_amount DESC
        LIMIT 20
    ) pt_u;

    -- Resíduos OS não casadas com saldo de cartão
    SELECT count(*)::INT, COALESCE(jsonb_agg(jsonb_build_object(
        'store_id', o.store_id, 'os_number', o.os_number, 'client_name', o.client_name, 
        'delta_credit', o.delta_credit, 'delta_debit', o.delta_debit
    )), '[]'::jsonb)
    INTO v_unmatched_os_cards_count, v_unmatched_os_cards_sample
    FROM (
        SELECT store_id, os_number, client_name, delta_credit, delta_debit
        FROM public.os_import_observations
        WHERE target_date = p_target_date
          AND (delta_credit > 0 OR delta_debit > 0)
          AND NOT (os_number = ANY(v_matched_os_numbers))
          AND (p_store_id IS NULL OR store_id = p_store_id)
        ORDER BY os_number ASC
        LIMIT 20
    ) o;

    RETURN jsonb_build_object(
        'success', true,
        'target_date', p_target_date,
        'matched_count', v_matched_count,
        'pos_matched', v_matched_count,
        'matched_pos_count', v_matched_count,
        'collisions_count', v_collision_count,
        'collisions', v_collisions,
        'exhausted_orphans_count', v_exhausted_orphan_count,
        'exhausted_orphans', v_exhausted_orphans,
        'unmatched_pos_count', v_unmatched_pos_count,
        'unmatched_pos_sample', v_unmatched_pos_sample,
        'unmatched_os_cards_count', v_unmatched_os_cards_count,
        'unmatched_os_cards_sample', v_unmatched_os_cards_sample,
        'stage2_error', NULL,
        'totals', jsonb_build_object(
            'rede_bruto', v_total_rede_bruto,
            'rede_liquido', v_total_rede_liquido,
            'rede_taxas', v_total_rede_taxas
        )
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.match_stage2_rede_os(date, text) TO authenticated, service_role, anon;

-- ----------------------------------------------------------------------------
-- 3. auto_match_daily_transactions (Propagação de Erros e Contratos Unificados)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_match_daily_transactions(p_date text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_target_date DATE;
    v_ofx_record RECORD;
    v_os_record public.patio_os%ROWTYPE;
    v_pos_matched INT := 0;
    v_pix_matched INT := 0;
    v_collision_count INT := 0;
    v_corporate_tagged INT := 0;
    v_stage2_result JSONB;
    v_stage2_error TEXT := NULL;
    v_saidas_result JSONB;
    v_receivables_result JSONB;
    v_summary_result JSONB;
BEGIN
    IF p_date IS NULL THEN
        RAISE EXCEPTION 'p_date não pode ser nulo';
    END IF;

    v_target_date := p_date::date;

    -- =========================================================================
    -- FASE 0: CLASSIFICAÇÃO INTERCOMPANY ANTES DO PIX (NUNCA CASAM COM OS)
    -- =========================================================================
    UPDATE public.ofx_transactions
    SET manual_category = 'Transferência Entre Lojas [Apenas Conciliar]',
        manual_justification = 'Transferência Intercompany (Não-OS)',
        match_status = 'intercompany_paired',
        matched_os_number = NULL,
        contabilizar_no_subtotal = false,
        updated_at = now()
    WHERE target_date = v_target_date
      AND type = 'in'
      AND (
          COALESCE(counterpart_name, '') ILIKE '%EMPORIO DO OLEO%'
          OR COALESCE(counterpart_name, '') ILIKE '%HOLDING%'
          OR COALESCE(counterpart_name, '') ILIKE '%TRANSFERENCIA ENTRE%'
          OR COALESCE(counterpart_name, '') ILIKE '%MP AUTO MECANICA%'
          OR COALESCE(counterpart_name, '') ILIKE '%MP JABAQUARA%'
          OR COALESCE(counterpart_name, '') ILIKE '%MECANICA POPULAR%'
          OR COALESCE(counterpart_name, '') ILIKE '%AUTO MECANICA POPULAR%'
          OR COALESCE(counterpart_name, '') ILIKE '%HD CENTRO AUTOMOTIVO%'
          OR COALESCE(counterpart_name, '') ILIKE '%REI DO MODULO%'
          OR COALESCE(cnpj_cpf, '') IN ('29.954.349/0001-44', '63.102.080/0001-06', '50.903.911/0001-05', '50.901.642/0001-30')
      );

    -- 0B. Empréstimos, Seguros e Rendimentos
    UPDATE public.ofx_transactions
    SET manual_category = 'EMPRÉSTIMO',
        manual_justification = 'Empréstimo Capital de Giro (Corporativo / Não-OS)',
        updated_at = now()
    WHERE target_date = v_target_date AND type = 'in' AND matched_os_number IS NULL
      AND (COALESCE(counterpart_name, '') ILIKE '%EMPREST%' OR COALESCE(counterpart_name, '') ILIKE '%CAPITAL DE GIRO%');

    UPDATE public.ofx_transactions
    SET manual_category = 'RENDIMENTOS',
        manual_justification = 'Aplicação / Resgate Automático',
        updated_at = now()
    WHERE target_date = v_target_date AND type = 'in' AND matched_os_number IS NULL
      AND (COALESCE(counterpart_name, '') ILIKE '%REND%' OR COALESCE(counterpart_name, '') ILIKE '%APLIC%' OR COALESCE(counterpart_name, '') ILIKE '%RESG%');

    SELECT count(*) INTO v_corporate_tagged
    FROM public.ofx_transactions
    WHERE target_date = v_target_date
      AND type = 'in'
      AND manual_category IN ('EMPRÉSTIMO', 'OUTROS', 'TRANSFERÊNCIA', 'Transferência Entre Lojas [Apenas Conciliar]', 'RENDIMENTOS');

    -- =========================================================================
    -- FASE 1: REDE x OS (CANÔNICO VIA MATCH_STAGE2_REDE_OS COM PROPAGAÇÃO DE ERRO)
    -- =========================================================================
    BEGIN
        v_stage2_result := public.match_stage2_rede_os(v_target_date, NULL);
        v_pos_matched := COALESCE((v_stage2_result->>'matched_count')::int, (v_stage2_result->>'pos_matched')::int, 0);
        v_collision_count := v_collision_count + COALESCE((v_stage2_result->>'collisions_count')::int, 0);
        v_stage2_error := v_stage2_result->>'stage2_error';
    EXCEPTION WHEN OTHERS THEN
        v_pos_matched := 0;
        v_stage2_error := format('Falha SQL na etapa Rede x OS [%s]: %s', SQLSTATE, SQLERRM);
    END;

    -- =========================================================================
    -- FASE 2: PIX OFX x OS: PARCELA + IDENTIDADE + FILIAL (CANÔNICO E ESTRITO)
    -- =========================================================================
    FOR v_ofx_record IN 
        SELECT id, store_id, amount, counterpart_name, fitid, bank_name, target_date, occurred_at, cnpj_cpf
        FROM public.ofx_transactions
        WHERE target_date = v_target_date
          AND type = 'in'
          AND matched_os_number IS NULL
          AND (manual_category IS NULL OR manual_category = 'PIX / Recebimento OS')
          AND NOT (
              COALESCE(counterpart_name, '') ILIKE '%REDE%'
              OR COALESCE(counterpart_name, '') ILIKE '%CARD%'
              OR COALESCE(counterpart_name, '') ILIKE '%CIELO%'
              OR COALESCE(counterpart_name, '') ILIKE '%GETNET%'
              OR COALESCE(counterpart_name, '') ILIKE '%STONE%'
              OR COALESCE(counterpart_name, '') ILIKE '%PAGSEGURO%'
              OR COALESCE(counterpart_name, '') ILIKE '%MERCADO PAGO%'
              OR COALESCE(counterpart_name, '') ILIKE '%SAFRA%'
          )
          AND amount > 0
        ORDER BY amount DESC
    LOOP
        -- Se loja do OFX for nula, ignora para prevenção de falsos positivos
        IF v_ofx_record.store_id IS NULL THEN
            CONTINUE;
        END IF;

        -- Busca correspondência estrita em patio_os por loja e saldo
        SELECT * INTO v_os_record
        FROM public.patio_os
        WHERE store_id = v_ofx_record.store_id
          AND COALESCE(match_status, '') <> 'MATCHED'
          AND (
              ABS(COALESCE(pix_transfer_value, 0) - v_ofx_record.amount) <= 0.05
              OR (COALESCE(pix_transfer_value, 0) = 0 AND ABS((total_value - COALESCE(paid_value, 0)) - v_ofx_record.amount) <= 0.05)
          )
        ORDER BY opened_at DESC
        LIMIT 1;

        IF v_os_record.id IS NOT NULL THEN
            UPDATE public.ofx_transactions
            SET matched_os_number = v_os_record.os_number,
                match_status = 'MATCHED',
                updated_at = now()
            WHERE id = v_ofx_record.id;

            UPDATE public.patio_os
            SET match_status = 'MATCHED',
                paid_value = LEAST(total_value, COALESCE(paid_value, 0) + v_ofx_record.amount),
                status = CASE 
                    WHEN (COALESCE(paid_value, 0) + v_ofx_record.amount) >= (total_value - 0.05) THEN 'finalizada' 
                    ELSE 'pago_parcial' 
                END,
                updated_at = now()
            WHERE id = v_os_record.id;

            BEGIN
                INSERT INTO public.conciliation_matches (
                    store_id, system_os_number, ofx_transaction_id, status, target_date
                ) VALUES (
                    v_ofx_record.store_id, v_os_record.os_number, v_ofx_record.id, 'matched', v_target_date
                );
            EXCEPTION WHEN OTHERS THEN NULL; END;

            v_pix_matched := v_pix_matched + 1;
        END IF;
    END LOOP;

    -- =========================================================================
    -- FASE 3: AUTO-MATCH DE SAÍDAS (DESPESAS E PARES RESTANTES)
    -- =========================================================================
    BEGIN
        v_saidas_result := public.auto_match_saidas(v_target_date::text);
    EXCEPTION WHEN OTHERS THEN
        v_saidas_result := jsonb_build_object('success', false, 'error', SQLERRM);
    END;

    -- =========================================================================
    -- FASE 4: AUTO-MATCH DE RECEBÍVEIS PROTEGIDO
    -- =========================================================================
    BEGIN
        v_receivables_result := public.auto_match_receivables(v_target_date::text, NULL);
    EXCEPTION WHEN OTHERS THEN
        v_receivables_result := jsonb_build_object('success', false, 'error', SQLERRM);
    END;

    -- =========================================================================
    -- FASE 5: RECALCULAR RESUMO CANÔNICO APÓS TODAS AS MUTAÇÕES
    -- =========================================================================
    BEGIN
        v_summary_result := public.get_daily_reconciliation_summary(v_target_date::text, true);
    EXCEPTION WHEN OTHERS THEN
        v_summary_result := jsonb_build_object('success', false, 'error', SQLERRM);
    END;

    RETURN jsonb_build_object(
        'success', true,
        'date', v_target_date,
        'pos_matched', v_pos_matched,
        'matched_pos_count', v_pos_matched,
        'pix_matched', v_pix_matched,
        'matched_pix_count', v_pix_matched,
        'collisions_prevented', v_collision_count,
        'corporate_tagged', v_corporate_tagged,
        'stage2_error', v_stage2_error,
        'saidas_result', v_saidas_result,
        'receivables_result', v_receivables_result
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.auto_match_daily_transactions(text) TO authenticated, service_role, anon;

-- ----------------------------------------------------------------------------
-- 4. link_manual_rede_to_os (Ajuste de Acentos para Consumo Fidedigno)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.link_manual_rede_to_os(
    p_pos_id UUID,
    p_os_number TEXT,
    p_store_id TEXT DEFAULT NULL,
    p_amount NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pos RECORD;
    v_os RECORD;
    v_existing_match RECORD;
    v_link_amount NUMERIC;
    v_paid_before NUMERIC;
    v_paid_after NUMERIC;
    v_os_balance_before NUMERIC;
    v_os_balance_after NUMERIC;
    v_store_patio_before NUMERIC;
    v_store_patio_after NUMERIC;
    v_global_patio_before NUMERIC;
    v_global_patio_after NUMERIC;
    v_target_date DATE;
    v_store_id TEXT;
    v_accounting_effect TEXT := 'baixa_aplicada';
    v_norm_method TEXT;
    v_is_debit BOOLEAN;
    v_is_credit BOOLEAN;
BEGIN
    IF p_pos_id IS NULL OR p_os_number IS NULL THEN
        RAISE EXCEPTION 'ID de transação REDE e número da Ordem de Serviço são obrigatórios.';
    END IF;

    -- 1. Carrega e trava a transação POS
    SELECT * INTO v_pos 
    FROM public.pos_transactions 
    WHERE id = p_pos_id 
    FOR UPDATE;

    IF v_pos.id IS NULL THEN
        RAISE EXCEPTION 'Transação da maquininha (POS) não encontrada (ID: %).', p_pos_id;
    END IF;

    v_store_id := v_pos.store_id;
    IF v_store_id IS NULL THEN
        v_store_id := p_store_id;
    END IF;

    -- 2. Carrega e trava a Ordem de Serviço por número e filial ESTRITA da transação
    SELECT * INTO v_os 
    FROM public.patio_os 
    WHERE os_number = p_os_number
      AND store_id = v_store_id
    ORDER BY opened_at DESC 
    LIMIT 1
    FOR UPDATE;

    IF v_os.id IS NULL THEN
        RAISE EXCEPTION 'Ordem de Serviço #% não encontrada na filial % da maquininha.', p_os_number, v_store_id;
    END IF;

    v_link_amount := COALESCE(p_amount, v_pos.gross_amount, v_pos.net_amount);
    v_target_date := COALESCE(v_pos.target_date, v_pos.occurred_at::date, CURRENT_DATE);

    -- Normalização semântica de acentos
    v_norm_method := TRANSLATE(LOWER(COALESCE(v_pos.payment_method, '')), 'áàãâéêíóôõúüç', 'aaaaeeiooouuc');
    v_is_debit := (v_norm_method LIKE '%deb%');
    v_is_credit := (v_norm_method LIKE '%cred%');

    v_paid_before := COALESCE(v_os.paid_value, 0);
    v_os_balance_before := GREATEST(0, COALESCE(v_os.total_value, 0) - v_paid_before);

    -- Pátios antes da baixa
    SELECT na_loja_os INTO v_store_patio_before
    FROM public.reconciliations
    WHERE date = v_target_date AND store_id = v_store_id;

    SELECT total_patio INTO v_global_patio_before
    FROM public.daily_snapshots
    WHERE date = v_target_date;

    -- Verifica se essa transação já estava vinculada a esta mesma OS
    SELECT * INTO v_existing_match
    FROM public.conciliation_matches
    WHERE rede_transaction_id = v_pos.id;

    IF v_existing_match.id IS NOT NULL AND v_existing_match.system_os_number = v_os.os_number THEN
        v_accounting_effect := 'ja_pago';
        v_paid_after := v_paid_before;
        v_os_balance_after := v_os_balance_before;
    ELSIF LOWER(COALESCE(v_os.status, 'em_aberto')) IN ('finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado') 
          OR v_paid_before >= (v_os.total_value - 0.05) THEN
        v_accounting_effect := 'vinculo_informativo_sem_baixa';
        v_paid_after := v_paid_before;
        v_os_balance_after := v_os_balance_before;

        UPDATE public.patio_os
        SET 
            match_status = 'MATCHED',
            updated_at = NOW()
        WHERE id = v_os.id;
    ELSE
        v_accounting_effect := 'baixa_aplicada';
        v_paid_after := LEAST(v_os.total_value, v_paid_before + v_link_amount);
        v_os_balance_after := GREATEST(0, v_os.total_value - v_paid_after);

        UPDATE public.patio_os
        SET 
            paid_value = v_paid_after,
            payment_method = COALESCE(payment_method, v_pos.payment_method, 'CARTAO'),
            credit_value = CASE WHEN v_is_credit THEN GREATEST(COALESCE(credit_value, 0), v_paid_after) ELSE credit_value END,
            debit_value = CASE WHEN v_is_debit THEN GREATEST(COALESCE(debit_value, 0), v_paid_after) ELSE debit_value END,
            status = CASE 
                WHEN v_paid_after >= (v_os.total_value - 0.05) THEN 'finalizada' 
                ELSE 'pago_parcial' 
            END,
            closed_at = CASE 
                WHEN v_paid_after >= (v_os.total_value - 0.05) THEN v_target_date 
                ELSE closed_at 
            END,
            last_payment_date = v_target_date,
            match_status = 'MATCHED',
            updated_at = NOW()
        WHERE id = v_os.id;
    END IF;

    -- Consome o delta correspondente na observação se existir com tratamento de acentos
    UPDATE public.os_import_observations
    SET 
        consumed_debit = consumed_debit + (CASE WHEN v_is_debit THEN v_link_amount ELSE 0 END),
        consumed_credit = consumed_credit + (CASE WHEN v_is_credit THEN v_link_amount ELSE 0 END),
        updated_at = NOW()
    WHERE store_id = v_store_id
      AND target_date = v_target_date
      AND os_number = v_os.os_number;

    -- Atualiza a Transação POS (preservando settlement_status intacto)
    UPDATE public.pos_transactions
    SET 
        matched_os_number = v_os.os_number,
        manual_category = 'Recebimento Cartão OS',
        store_id = v_store_id,
        updated_at = NOW()
    WHERE id = v_pos.id;

    -- Registro em conciliation_matches (Upsert Seguro por rede_transaction_id)
    IF v_existing_match.id IS NOT NULL THEN
        UPDATE public.conciliation_matches
        SET 
            store_id = v_store_id,
            target_date = v_target_date,
            system_os_number = v_os.os_number,
            status = 'matched'
        WHERE id = v_existing_match.id;
    ELSE
        INSERT INTO public.conciliation_matches (
            store_id,
            target_date,
            system_os_number,
            rede_transaction_id,
            status
        ) VALUES (
            v_store_id,
            v_target_date,
            v_os.os_number,
            v_pos.id,
            'matched'
        );
    END IF;

    -- 5. Recalcular Na Loja OS da filial e Global se houve baixa contábil
    IF v_accounting_effect = 'baixa_aplicada' THEN
        BEGIN
            PERFORM public.recompute_patio_for_date_and_store(v_target_date, v_store_id);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    -- Pátios recalculados após a baixa
    SELECT na_loja_os INTO v_store_patio_after
    FROM public.reconciliations
    WHERE date = v_target_date AND store_id = v_store_id;

    SELECT total_patio INTO v_global_patio_after
    FROM public.daily_snapshots
    WHERE date = v_target_date;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Venda de Cartão de R$ %s vinculada à OS #%s (%s).', v_link_amount, v_os.os_number, v_accounting_effect),
        'pos_id', v_pos.id,
        'os_id', v_os.id,
        'os_number', v_os.os_number,
        'store_id', v_store_id,
        'target_date', v_target_date,
        'paid_before', v_paid_before,
        'paid_after', v_paid_after,
        'os_balance_before', v_os_balance_before,
        'os_balance_after', v_os_balance_after,
        'store_patio_before', v_store_patio_before,
        'store_patio_after', v_store_patio_after,
        'global_patio_before', v_global_patio_before,
        'global_patio_after', v_global_patio_after,
        'accounting_effect', v_accounting_effect
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_manual_rede_to_os(uuid, text, text, numeric) TO authenticated, service_role, anon;

-- ----------------------------------------------------------------------------
-- 5. unlink_manual_os_match (Ajuste de Acentos no Estorno de Consumo)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.unlink_manual_os_match(
    p_transaction_type TEXT,
    p_transaction_id UUID,
    p_os_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pos RECORD;
    v_ofx RECORD;
    v_os RECORD;
    v_os_number TEXT;
    v_store_id TEXT;
    v_target_date DATE;
    v_amount NUMERIC := 0;
    v_new_paid NUMERIC;
    v_baseline_paid NUMERIC := 0;
    v_norm_method TEXT;
    v_is_debit BOOLEAN;
    v_is_credit BOOLEAN;
BEGIN
    IF p_transaction_id IS NULL THEN
        RAISE EXCEPTION 'ID da transação é obrigatório para desvinculação.';
    END IF;

    IF LOWER(p_transaction_type) = 'ofx' THEN
        SELECT * INTO v_ofx 
        FROM public.ofx_transactions 
        WHERE id = p_transaction_id
        FOR UPDATE;

        IF v_ofx.id IS NULL THEN
            RAISE EXCEPTION 'Transação OFX não encontrada (ID: %).', p_transaction_id;
        END IF;

        v_os_number := COALESCE(p_os_number, v_ofx.matched_os_number);
        v_store_id := v_ofx.store_id;
        v_target_date := COALESCE(v_ofx.target_date, v_ofx.date, CURRENT_DATE);
        v_amount := ABS(COALESCE(v_ofx.amount, 0));

        UPDATE public.ofx_transactions
        SET 
            matched_os_number = NULL,
            match_status = 'UNMATCHED',
            manual_category = NULL,
            manual_justification = NULL,
            updated_at = NOW()
        WHERE id = p_transaction_id;

        IF v_os_number IS NOT NULL THEN
            SELECT * INTO v_os 
            FROM public.patio_os 
            WHERE os_number = v_os_number
              AND (v_store_id IS NULL OR store_id = v_store_id)
            ORDER BY opened_at DESC 
            LIMIT 1
            FOR UPDATE;

            IF v_os.id IS NOT NULL THEN
                SELECT COALESCE(paid_after, 0) INTO v_baseline_paid
                FROM public.os_import_observations
                WHERE store_id = v_store_id AND target_date = v_target_date AND os_number = v_os_number;

                v_new_paid := GREATEST(v_baseline_paid, COALESCE(v_os.paid_value, 0) - v_amount);

                UPDATE public.patio_os
                SET 
                    paid_value = v_new_paid,
                    pix_transfer_value = GREATEST(0, COALESCE(pix_transfer_value, 0) - v_amount),
                    status = CASE WHEN v_new_paid <= 0 THEN 'em_aberto' WHEN v_new_paid >= (total_value - 0.05) THEN 'finalizada' ELSE 'pago_parcial' END,
                    match_status = CASE WHEN v_new_paid <= 0 THEN 'UNMATCHED' ELSE 'MATCHED' END,
                    closed_at = CASE WHEN v_new_paid >= (total_value - 0.05) THEN closed_at ELSE NULL END,
                    updated_at = NOW()
                WHERE id = v_os.id;
            END IF;
        END IF;

        DELETE FROM public.conciliation_matches
        WHERE ofx_transaction_id = p_transaction_id;

        IF v_target_date IS NOT NULL AND v_store_id IS NOT NULL THEN
            BEGIN
                PERFORM public.recompute_patio_for_date_and_store(v_target_date, v_store_id);
            EXCEPTION WHEN OTHERS THEN NULL; END;
        END IF;

    ELSIF LOWER(p_transaction_type) = 'rede' THEN
        SELECT * INTO v_pos 
        FROM public.pos_transactions 
        WHERE id = p_transaction_id
        FOR UPDATE;

        IF v_pos.id IS NULL THEN
            RAISE EXCEPTION 'Transação POS Rede não encontrada (ID: %).', p_transaction_id;
        END IF;

        v_os_number := COALESCE(p_os_number, v_pos.matched_os_number);
        v_store_id := v_pos.store_id;
        v_target_date := COALESCE(v_pos.target_date, v_pos.occurred_at::date, CURRENT_DATE);
        v_amount := COALESCE(v_pos.gross_amount, v_pos.net_amount, 0);

        -- Normalização semântica de acentos
        v_norm_method := TRANSLATE(LOWER(COALESCE(v_pos.payment_method, '')), 'áàãâéêíóôõúüç', 'aaaaeeiooouuc');
        v_is_debit := (v_norm_method LIKE '%deb%');
        v_is_credit := (v_norm_method LIKE '%cred%');

        UPDATE public.pos_transactions
        SET 
            matched_os_number = NULL,
            manual_category = NULL,
            manual_justification = NULL,
            updated_at = NOW()
        WHERE id = p_transaction_id;

        IF v_os_number IS NOT NULL THEN
            SELECT * INTO v_os 
            FROM public.patio_os 
            WHERE os_number = v_os_number
              AND (v_store_id IS NULL OR store_id = v_store_id)
            ORDER BY opened_at DESC 
            LIMIT 1
            FOR UPDATE;

            IF v_os.id IS NOT NULL THEN
                SELECT COALESCE(paid_after, 0) INTO v_baseline_paid
                FROM public.os_import_observations
                WHERE store_id = v_store_id AND target_date = v_target_date AND os_number = v_os_number;

                v_new_paid := GREATEST(v_baseline_paid, COALESCE(v_os.paid_value, 0) - v_amount);

                UPDATE public.patio_os
                SET 
                    paid_value = v_new_paid,
                    credit_value = CASE WHEN v_is_credit THEN GREATEST(0, COALESCE(credit_value, 0) - v_amount) ELSE credit_value END,
                    debit_value = CASE WHEN v_is_debit THEN GREATEST(0, COALESCE(debit_value, 0) - v_amount) ELSE debit_value END,
                    status = CASE WHEN v_new_paid <= 0 THEN 'em_aberto' WHEN v_new_paid >= (total_value - 0.05) THEN 'finalizada' ELSE 'pago_parcial' END,
                    match_status = CASE WHEN v_new_paid <= 0 THEN 'UNMATCHED' ELSE 'MATCHED' END,
                    closed_at = CASE WHEN v_new_paid >= (total_value - 0.05) THEN closed_at ELSE NULL END,
                    updated_at = NOW()
                WHERE id = v_os.id;
            END IF;

            -- Liberar delta consumido na observação da importação se existir
            UPDATE public.os_import_observations
            SET 
                consumed_debit = GREATEST(0, consumed_debit - CASE WHEN v_is_debit THEN v_amount ELSE 0 END),
                consumed_credit = GREATEST(0, consumed_credit - CASE WHEN v_is_credit THEN v_amount ELSE 0 END),
                updated_at = NOW()
            WHERE store_id = v_store_id
              AND target_date = v_target_date
              AND os_number = v_os_number;
        END IF;

        DELETE FROM public.conciliation_matches
        WHERE rede_transaction_id = p_transaction_id;

        IF v_target_date IS NOT NULL AND v_store_id IS NOT NULL THEN
            BEGIN
                PERFORM public.recompute_patio_for_date_and_store(v_target_date, v_store_id);
            EXCEPTION WHEN OTHERS THEN NULL; END;
        END IF;

    ELSE
        RAISE EXCEPTION 'Tipo de transação desconhecido para desvinculação: %', p_transaction_type;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Transação %s desvinculada com sucesso da OS #%s.', p_transaction_id, COALESCE(v_os_number, 'N/A')),
        'transaction_id', p_transaction_id,
        'os_number', v_os_number
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.unlink_manual_os_match(text, uuid, text) TO authenticated, service_role, anon;
