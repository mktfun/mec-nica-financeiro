-- ============================================================================
-- MIGRATION: 20260903000030_fix_match_stage2_rede_os_v_chosen_os_record.sql
-- Description: Corrige erro SQLSTATE 55000 (record "v_chosen_os" is not assigned yet)
--              substituindo o uso de RECORD genérico por variáveis escalares tipadas
--              (v_chosen_os_id, v_chosen_os_number, v_chosen_os_total_value,
--               v_chosen_os_paid_value, v_chosen_os_status).
-- ============================================================================

DROP FUNCTION IF EXISTS public.match_stage2_rede_os(date, text);
DROP FUNCTION IF EXISTS public.match_stage2_rede_os(text, text);
DROP FUNCTION IF EXISTS public.match_stage2_rede_os(date);
DROP FUNCTION IF EXISTS public.match_stage2_rede_os(text);

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
    v_chosen_os_id UUID;
    v_chosen_os_number TEXT;
    v_chosen_os_total_value NUMERIC;
    v_chosen_os_paid_value NUMERIC;
    v_chosen_os_status TEXT;
    v_matched_os_ids UUID[] := '{}';
    v_candidates_count INT;
    v_target_day_candidates_count INT;
    v_matched_count INT := 0;
    v_collision_count INT := 0;
    v_collisions JSONB := '[]'::jsonb;
    v_candidate_samples JSONB;
    v_tier INT;
    
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
        SELECT id, store_id, net_amount, gross_amount, fee_amount, payment_method, machine_name, occurred_at
        FROM public.pos_transactions
        WHERE target_date = p_target_date
          AND matched_os_number IS NULL
          AND (p_store_id IS NULL OR store_id = p_store_id)
          AND store_id IS NOT NULL
          AND (transaction_type IS NULL OR transaction_type = 'venda')
          AND net_amount > 0
        ORDER BY net_amount DESC
    LOOP
        v_chosen_os_id := NULL;
        v_chosen_os_number := NULL;
        v_chosen_os_total_value := NULL;
        v_chosen_os_paid_value := NULL;
        v_chosen_os_status := NULL;
        v_candidates_count := 0;
        v_candidate_samples := '[]'::jsonb;
        v_tier := 0;

        -- =====================================================================
        -- TIER 1: Match Específico de Cartão (credit_value, debit_value, credit_debit_value)
        -- =====================================================================
        SELECT COUNT(*), jsonb_agg(jsonb_build_object(
            'id', id, 
            'os_number', os_number, 
            'client_name', COALESCE(client_name, 'Cliente'), 
            'total_value', total_value, 
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
              (opened_at::date = p_target_date OR last_payment_date = p_target_date OR closed_at::date = p_target_date)
              OR (
                  opened_at >= (p_target_date - INTERVAL '60 days')
                  AND opened_at::date <= p_target_date
                  AND (
                      status ILIKE '%abert%' 
                      OR status ILIKE '%parcial%' 
                      OR status ILIKE '%pendent%' 
                      OR (total_value - paid_value) > 0.05
                  )
              )
          )
          AND (
              ABS(COALESCE(credit_value, 0) - v_pos.net_amount) <= 0.05
              OR ABS(COALESCE(credit_value, 0) - v_pos.gross_amount) <= 0.05
              OR ABS(COALESCE(debit_value, 0) - v_pos.net_amount) <= 0.05
              OR ABS(COALESCE(debit_value, 0) - v_pos.gross_amount) <= 0.05
              OR ABS(COALESCE(credit_debit_value, 0) - v_pos.net_amount) <= 0.05
              OR ABS(COALESCE(credit_debit_value, 0) - v_pos.gross_amount) <= 0.05
          );

        IF v_candidates_count > 0 THEN
            v_tier := 1;
        END IF;

        -- =====================================================================
        -- TIER 2: Match por Saldo Pendente (total_value - paid_value)
        -- =====================================================================
        IF v_tier = 0 THEN
            SELECT COUNT(*), jsonb_agg(jsonb_build_object(
                'id', id, 
                'os_number', os_number, 
                'client_name', COALESCE(client_name, 'Cliente'), 
                'total_value', total_value, 
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
                  (opened_at::date = p_target_date OR last_payment_date = p_target_date OR closed_at::date = p_target_date)
                  OR (
                      opened_at >= (p_target_date - INTERVAL '60 days')
                      AND opened_at::date <= p_target_date
                      AND (
                          status ILIKE '%abert%' 
                          OR status ILIKE '%parcial%' 
                          OR status ILIKE '%pendent%' 
                          OR (total_value - paid_value) > 0.05
                      )
                  )
              )
              AND (total_value - paid_value) > 0.05
              AND (
                  ABS((total_value - paid_value) - v_pos.net_amount) <= 0.05
                  OR ABS((total_value - paid_value) - v_pos.gross_amount) <= 0.05
              );

            IF v_candidates_count > 0 THEN
                v_tier := 2;
            END IF;
        END IF;

        -- =====================================================================
        -- TIER 3: Match por Valor Total da OS (Estritamente na Data Alvo)
        -- =====================================================================
        IF v_tier = 0 THEN
            SELECT COUNT(*), jsonb_agg(jsonb_build_object(
                'id', id, 
                'os_number', os_number, 
                'client_name', COALESCE(client_name, 'Cliente'), 
                'total_value', total_value, 
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
              AND (opened_at::date = p_target_date OR last_payment_date = p_target_date)
              AND (
                  ABS(total_value - v_pos.net_amount) <= 0.05
                  OR ABS(total_value - v_pos.gross_amount) <= 0.05
              );

            IF v_candidates_count > 0 THEN
                v_tier := 3;
            END IF;
        END IF;

        -- =====================================================================
        -- RESOLUÇÃO DE DECISÃO E DESEMPATE INTELIGENTE
        -- =====================================================================
        IF v_candidates_count = 1 THEN
            -- Exatamente 1 candidato no tier vencedor
            SELECT id, os_number, total_value, paid_value, status
            INTO v_chosen_os_id, v_chosen_os_number, v_chosen_os_total_value, v_chosen_os_paid_value, v_chosen_os_status
            FROM public.patio_os
            WHERE id = (v_candidate_samples->0->>'id')::uuid;

        ELSIF v_candidates_count > 1 THEN
            -- Múltiplos candidatos: desempate determinístico
            -- 1. Verificar se há exatamente 1 candidato da data alvo
            SELECT COUNT(*), jsonb_agg(cand)
            INTO v_target_day_candidates_count, v_candidate_samples
            FROM jsonb_array_elements(v_candidate_samples) cand
            WHERE (cand->>'opened_at')::date = p_target_date;

            IF v_target_day_candidates_count = 1 THEN
                -- Desempate por prevalência da data alvo
                SELECT id, os_number, total_value, paid_value, status
                INTO v_chosen_os_id, v_chosen_os_number, v_chosen_os_total_value, v_chosen_os_paid_value, v_chosen_os_status
                FROM public.patio_os
                WHERE id = (v_candidate_samples->0->>'id')::uuid;
            ELSIF v_target_day_candidates_count > 1 AND v_pos.occurred_at IS NOT NULL THEN
                -- Desempate por proximidade temporal no mesmo dia
                SELECT id, os_number, total_value, paid_value, status
                INTO v_chosen_os_id, v_chosen_os_number, v_chosen_os_total_value, v_chosen_os_paid_value, v_chosen_os_status
                FROM public.patio_os
                WHERE id IN (
                    SELECT (cand->>'id')::uuid 
                    FROM jsonb_array_elements(v_candidate_samples) cand
                )
                ORDER BY ABS(EXTRACT(EPOCH FROM (v_pos.occurred_at - opened_at))) ASC
                LIMIT 1;
            ELSE
                -- Colisão real não desempatável: suspensão para escolha do operador na UI
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
        END IF;

        -- =====================================================================
        -- APLICAÇÃO ATÔMICA DO CASAMENTO
        -- =====================================================================
        IF v_chosen_os_id IS NOT NULL THEN
            -- Atualiza POS transaction
            UPDATE public.pos_transactions
            SET matched_os_number = v_chosen_os_number,
                settlement_status = 'entrou',
                updated_at = now()
            WHERE id = v_pos.id;

            -- Atualiza Ordem de Serviço
            IF v_chosen_os_status NOT ILIKE '%finalizad%' AND v_chosen_os_status NOT ILIKE '%pago%' THEN
                UPDATE public.patio_os
                SET paid_value = LEAST(total_value, paid_value + v_pos.net_amount),
                    status = CASE 
                        WHEN (paid_value + v_pos.net_amount) >= total_value - 0.05 THEN 'finalizada' 
                        ELSE 'pago_parcial' 
                    END,
                    closed_at = CASE 
                        WHEN (paid_value + v_pos.net_amount) >= total_value - 0.05 THEN COALESCE(closed_at, p_target_date::timestamptz)
                        ELSE closed_at 
                    END,
                    last_payment_date = p_target_date,
                    match_status = 'MATCHED',
                    updated_at = now()
                WHERE id = v_chosen_os_id;
            ELSE
                -- Se já estava finalizada/paga, apenas registra match_status para blindar concorrência
                UPDATE public.patio_os
                SET match_status = 'MATCHED',
                    last_payment_date = COALESCE(last_payment_date, p_target_date),
                    updated_at = now()
                WHERE id = v_chosen_os_id;
            END IF;

            -- Registro idempotente na tabela de auditoria
            BEGIN
                INSERT INTO public.conciliation_matches (
                    store_id, system_os_number, rede_transaction_id, status, target_date
                ) VALUES (
                    v_pos.store_id, v_chosen_os_number, v_pos.id, 'matched', p_target_date
                );
            EXCEPTION WHEN OTHERS THEN NULL; END;

            -- Adiciona ID na lista negra em memória
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
        'id', id, 'store_id', store_id, 'net_amount', net_amount, 'machine_name', machine_name, 'payment_method', payment_method
    )), '[]'::jsonb)
    INTO v_unmatched_pos_count, v_unmatched_pos_sample
    FROM (
        SELECT id, store_id, net_amount, machine_name, payment_method
        FROM public.pos_transactions
        WHERE target_date = p_target_date
          AND matched_os_number IS NULL
          AND (p_store_id IS NULL OR store_id = p_store_id)
        ORDER BY net_amount DESC
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

GRANT EXECUTE ON FUNCTION public.match_stage2_rede_os(date, text) TO authenticated, service_role, anon;
