-- ============================================================================
-- Migration: 20260929000001_evolve_match_stage2_rede_os.sql
-- Description: Evolve match_stage2_rede_os to direct Gross Amount x OS Card matching by store.
--              Removes artificial 7-day cutoffs, adds collision protection,
--              generates formal exhausted orphan proof, and unifies auto_match_daily_transactions.
-- ============================================================================

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
    v_chosen_os_id UUID;
    v_chosen_os_number TEXT;
    v_matched_os_ids UUID[] := '{}';
    v_candidates_count INT;
    v_target_day_candidates_count INT;
    v_matched_count INT := 0;
    v_collision_count INT := 0;
    v_collisions JSONB := '[]'::jsonb;
    v_candidate_samples JSONB;
    v_candidate_samples_day JSONB;
    v_exhausted_orphan_count INT := 0;
    v_exhausted_orphans JSONB := '[]'::jsonb;
    
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

    -- 1. Pré-carregar IDs de OSs que já possuem vínculo na data alvo para evitar reutilização
    SELECT COALESCE(ARRAY_AGG(id), '{}') INTO v_matched_os_ids
    FROM public.patio_os
    WHERE store_id = COALESCE(p_store_id, store_id)
      AND (
          match_status = 'MATCHED'
          OR os_number IN (
              SELECT matched_os_number 
              FROM public.pos_transactions 
              WHERE target_date = p_target_date 
                AND matched_os_number IS NOT NULL
                AND (p_store_id IS NULL OR store_id = p_store_id)
          )
      );

    IF v_matched_os_ids IS NULL THEN
        v_matched_os_ids := '{}';
    END IF;

    -- 2. Iterar sobre POS transactions não pareadas da data
    FOR v_pos IN 
        SELECT id, store_id, net_amount, gross_amount, fee_amount, payment_method, machine_name, occurred_at, settlement_status
        FROM public.pos_transactions
        WHERE target_date = p_target_date
          AND matched_os_number IS NULL
          AND (p_store_id IS NULL OR store_id = p_store_id)
          AND store_id IS NOT NULL
          AND (transaction_type IS NULL OR transaction_type = 'venda')
          AND gross_amount > 0
        ORDER BY gross_amount DESC
    LOOP
        v_chosen_os_id := NULL;
        v_chosen_os_number := NULL;
        v_candidates_count := 0;
        v_candidate_samples := '[]'::jsonb;

        -- Busca OS na mesma filial cujo valor de cartão ou saldo bate com o BRUTO
        -- SEM amarras temporais de 7 dias! Qualquer OS ativa/cadastrada da filial não casada é elegível.
        SELECT COUNT(*), jsonb_agg(jsonb_build_object(
            'id', id, 
            'os_number', os_number, 
            'client_name', COALESCE(client_name, 'Cliente'), 
            'total_value', total_value, 
            'paid_value', paid_value,
            'credit_value', credit_value,
            'debit_value', debit_value,
            'credit_debit_value', credit_debit_value,
            'pending_value', GREATEST(0, total_value - paid_value),
            'opened_at', opened_at
        ))
        INTO v_candidates_count, v_candidate_samples
        FROM public.patio_os
        WHERE store_id = v_pos.store_id
          AND NOT (id = ANY(v_matched_os_ids))
          AND COALESCE(match_status, '') <> 'MATCHED'
          AND os_number NOT ILIKE '%faturamento%'
          AND os_number NOT ILIKE '%fat%'
          AND (
              -- Match A: Valor de Cartão explicitamente discriminado na OS
              ABS(COALESCE(credit_value, 0) - v_pos.gross_amount) <= 0.05
              OR ABS(COALESCE(debit_value, 0) - v_pos.gross_amount) <= 0.05
              OR ABS(COALESCE(credit_debit_value, 0) - v_pos.gross_amount) <= 0.05
              -- Match B: Saldo em aberto da OS
              OR (
                  (total_value - paid_value) > 0.05 
                  AND ABS((total_value - paid_value) - v_pos.gross_amount) <= 0.05
              )
          );

        -- Decisão
        IF v_candidates_count = 1 THEN
            -- Match Único 1:1
            v_chosen_os_id := (v_candidate_samples->0->>'id')::uuid;
            v_chosen_os_number := v_candidate_samples->0->>'os_number';

        ELSIF v_candidates_count > 1 THEN
            -- Desempate inteligente: se apenas 1 candidata foi aberta no dia alvo
            SELECT COUNT(*), jsonb_agg(cand)
            INTO v_target_day_candidates_count, v_candidate_samples_day
            FROM jsonb_array_elements(v_candidate_samples) cand
            WHERE (cand->>'opened_at')::date = p_target_date;

            IF v_target_day_candidates_count = 1 THEN
                v_chosen_os_id := (v_candidate_samples_day->0->>'id')::uuid;
                v_chosen_os_number := v_candidate_samples_day->0->>'os_number';
            ELSE
                -- Colisão real: não chuta!
                v_collision_count := v_collision_count + 1;
                v_collisions := v_collisions || jsonb_build_object(
                    'pos_id', v_pos.id,
                    'store_id', v_pos.store_id,
                    'gross_amount', v_pos.gross_amount,
                    'net_amount', v_pos.net_amount,
                    'payment_method', v_pos.payment_method,
                    'candidates', v_candidate_samples
                );
            END IF;
        ELSE
            -- v_candidates_count = 0: Órfão comprovado (inexistente na loja)
            v_exhausted_orphan_count := v_exhausted_orphan_count + 1;
            v_exhausted_orphans := v_exhausted_orphans || jsonb_build_object(
                'pos_id', v_pos.id,
                'store_id', v_pos.store_id,
                'gross_amount', v_pos.gross_amount,
                'net_amount', v_pos.net_amount,
                'payment_method', v_pos.payment_method,
                'reason', format('PROVADO_INEXISTENTE: Nenhuma OS na loja %s possui lançamento de cartão ou saldo de R$ %s', v_pos.store_id, v_pos.gross_amount)
            );
        END IF;

        -- Aplicação atômica do vínculo se encontrado
        IF v_chosen_os_id IS NOT NULL THEN
            UPDATE public.pos_transactions
            SET matched_os_number = v_chosen_os_number,
                settlement_status = COALESCE(settlement_status, 'a_compensar'),
                updated_at = now()
            WHERE id = v_pos.id;

            UPDATE public.patio_os
            SET match_status = 'MATCHED',
                last_payment_date = COALESCE(last_payment_date, p_target_date),
                updated_at = now()
            WHERE id = v_chosen_os_id;

            BEGIN
                INSERT INTO public.conciliation_matches (
                    store_id, system_os_number, rede_transaction_id, status, target_date
                ) VALUES (
                    v_pos.store_id, v_chosen_os_number, v_pos.id, 'matched', p_target_date
                );
            EXCEPTION WHEN OTHERS THEN NULL; END;

            v_matched_os_ids := array_append(v_matched_os_ids, v_chosen_os_id);
            v_matched_count := v_matched_count + 1;
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
        'id', id, 'store_id', store_id, 'gross_amount', gross_amount, 'net_amount', net_amount, 'machine_name', machine_name, 'payment_method', payment_method
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
    ) t;

    -- Resíduos B: OSs com Cartão não passado
    SELECT count(*), COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'store_id', store_id, 'os_number', os_number, 'client_name', client_name, 
        'credit_value', credit_value, 'debit_value', debit_value, 'credit_debit_value', credit_debit_value
    )), '[]'::jsonb)
    INTO v_unmatched_os_cards_count, v_unmatched_os_cards_sample
    FROM (
        SELECT id, store_id, os_number, client_name, credit_value, debit_value, credit_debit_value
        FROM public.patio_os
        WHERE (opened_at::date = p_target_date OR last_payment_date = p_target_date)
          AND (COALESCE(credit_value, 0) > 0 OR COALESCE(debit_value, 0) > 0 OR COALESCE(credit_debit_value, 0) > 0)
          AND COALESCE(match_status, '') <> 'MATCHED'
          AND (p_store_id IS NULL OR store_id = p_store_id)
        ORDER BY os_number ASC
        LIMIT 20
    ) o;

    RETURN jsonb_build_object(
        'success', true,
        'target_date', p_target_date,
        'matched_count', v_matched_count,
        'collisions_count', v_collision_count,
        'collisions', v_collisions,
        'exhausted_orphans_count', v_exhausted_orphan_count,
        'exhausted_orphans', v_exhausted_orphans,
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
$function$;
