-- =========================================================================
-- MIGRATION: 20260928000001_canonical_rede_os_matcher_and_date_isolation.sql
-- Description: Matcher canônico Rede x OS, isolamento temporal de vendas,
--              confronto estrito pelo valor BRUTO, blindagem contra dupla baixa,
--              preservação do status bancário 'a_compensar' (não força 'entrou')
--              e detecção estrita de colisões.
-- =========================================================================

-- 1. CORREÇÃO DE match_stage2_rede_os
CREATE OR REPLACE FUNCTION public.match_stage2_rede_os(p_target_date date, p_store_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        v_chosen_os_total_value := NULL;
        v_chosen_os_paid_value := NULL;
        v_chosen_os_status := NULL;
        v_candidates_count := 0;
        v_candidate_samples := '[]'::jsonb;
        v_tier := 0;

        -- =====================================================================
        -- TIER 1: Match Específico de Cartão por Valor BRUTO
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
              ABS(COALESCE(credit_value, 0) - v_pos.gross_amount) <= 0.05
              OR ABS(COALESCE(debit_value, 0) - v_pos.gross_amount) <= 0.05
              OR ABS(COALESCE(credit_debit_value, 0) - v_pos.gross_amount) <= 0.05
          );

        IF v_candidates_count > 0 THEN
            v_tier := 1;
        END IF;

        -- =====================================================================
        -- TIER 2: Match por Saldo Pendente (total_value - paid_value) via BRUTO
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
              AND ABS((total_value - paid_value) - v_pos.gross_amount) <= 0.05;

            IF v_candidates_count > 0 THEN
                v_tier := 2;
            END IF;
        END IF;

        -- =====================================================================
        -- RESOLUÇÃO DE DECISÃO E DESEMPATE INTELIGENTE
        -- =====================================================================
        IF v_candidates_count = 1 THEN
            SELECT id, os_number, total_value, paid_value, status
            INTO v_chosen_os_id, v_chosen_os_number, v_chosen_os_total_value, v_chosen_os_paid_value, v_chosen_os_status
            FROM public.patio_os
            WHERE id = (v_candidate_samples->0->>'id')::uuid;

        ELSIF v_candidates_count > 1 THEN
            SELECT COUNT(*), jsonb_agg(cand)
            INTO v_target_day_candidates_count, v_candidate_samples
            FROM jsonb_array_elements(v_candidate_samples) cand
            WHERE (cand->>'opened_at')::date = p_target_date;

            IF v_target_day_candidates_count = 1 THEN
                SELECT id, os_number, total_value, paid_value, status
                INTO v_chosen_os_id, v_chosen_os_number, v_chosen_os_total_value, v_chosen_os_paid_value, v_chosen_os_status
                FROM public.patio_os
                WHERE id = (v_candidate_samples->0->>'id')::uuid;
            ELSIF v_target_day_candidates_count > 1 AND v_pos.occurred_at IS NOT NULL THEN
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
        END IF;

        -- =====================================================================
        -- APLICAÇÃO ATÔMICA DO CASAMENTO
        -- =====================================================================
        IF v_chosen_os_id IS NOT NULL THEN
            -- CRÍTICO: settlement_status NÃO é alterado para 'entrou'. Preserva 'a_compensar'
            UPDATE public.pos_transactions
            SET matched_os_number = v_chosen_os_number,
                settlement_status = COALESCE(settlement_status, 'a_compensar'),
                updated_at = now()
            WHERE id = v_pos.id;

            -- Atualiza Ordem de Serviço
            IF v_chosen_os_status NOT ILIKE '%finalizad%' AND v_chosen_os_status NOT ILIKE '%pago%' THEN
                UPDATE public.patio_os
                SET paid_value = LEAST(total_value, paid_value + v_pos.gross_amount),
                    status = CASE 
                        WHEN (paid_value + v_pos.gross_amount) >= total_value - 0.05 THEN 'finalizada' 
                        ELSE 'pago_parcial' 
                    END,
                    closed_at = CASE 
                        WHEN (paid_value + v_pos.gross_amount) >= total_value - 0.05 THEN COALESCE(closed_at, p_target_date::timestamptz)
                        ELSE closed_at 
                    END,
                    last_payment_date = p_target_date,
                    match_status = 'MATCHED',
                    updated_at = now()
                WHERE id = v_chosen_os_id;
            ELSE
                -- Se já estava finalizada, NÃO soma novamente ao paid_value! Apenas associa
                UPDATE public.patio_os
                SET match_status = 'MATCHED',
                    last_payment_date = COALESCE(last_payment_date, p_target_date),
                    updated_at = now()
                WHERE id = v_chosen_os_id;
            END IF;

            -- Registro idempotente na tabela de conciliação
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


-- 2. CORREÇÃO DE auto_match_daily_transactions
CREATE OR REPLACE FUNCTION public.auto_match_daily_transactions(p_date text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_target_date DATE;
    v_pos_record RECORD;
    v_ofx_record RECORD;
    v_os_record public.patio_os%ROWTYPE;
    v_count_candidates INT := 0;
    v_pos_matched INT := 0;
    v_pix_matched INT := 0;
    v_collision_count INT := 0;
    v_corporate_tagged INT := 0;
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
    -- FASE 1: REDE x OS (CANÔNICO: MESMA FILIAL, VALOR BRUTO, IDEMPOTÊNCIA)
    -- =========================================================================
    FOR v_pos_record IN 
        SELECT id, store_id, net_amount, gross_amount, payment_method, machine_name, target_date, occurred_at, settlement_status
        FROM public.pos_transactions
        WHERE target_date = v_target_date
          AND matched_os_number IS NULL
          AND store_id IS NOT NULL
          AND (transaction_type IS NULL OR transaction_type = 'venda')
          AND gross_amount > 0
        ORDER BY gross_amount DESC
    LOOP
        v_os_record := NULL;
        v_count_candidates := 0;

        -- 1A. Procura OS na mesma filial cujo crédito/débito bata exatamente com o BRUTO
        SELECT count(*) INTO v_count_candidates
        FROM public.patio_os
        WHERE store_id = v_pos_record.store_id
          AND COALESCE(match_status, '') <> 'MATCHED'
          AND os_number NOT ILIKE '%faturamento%'
          AND os_number NOT ILIKE '%fat%'
          AND (
              (opened_at::date = v_target_date OR last_payment_date = v_target_date OR closed_at::date = v_target_date)
              OR (
                  opened_at >= (v_target_date - INTERVAL '60 days')
                  AND opened_at::date <= v_target_date
                  AND (
                      status ILIKE '%abert%' 
                      OR status ILIKE '%parcial%' 
                      OR status ILIKE '%pendent%' 
                      OR (total_value - paid_value) > 0.05
                  )
              )
          )
          AND (
              ABS(COALESCE(credit_value, 0) - v_pos_record.gross_amount) <= 0.05
              OR ABS(COALESCE(debit_value, 0) - v_pos_record.gross_amount) <= 0.05
              OR ABS(COALESCE(credit_debit_value, 0) - v_pos_record.gross_amount) <= 0.05
          );

        IF v_count_candidates = 1 THEN
            SELECT * INTO v_os_record
            FROM public.patio_os
            WHERE store_id = v_pos_record.store_id
              AND COALESCE(match_status, '') <> 'MATCHED'
              AND os_number NOT ILIKE '%faturamento%'
              AND os_number NOT ILIKE '%fat%'
              AND (
                  (opened_at::date = v_target_date OR last_payment_date = v_target_date OR closed_at::date = v_target_date)
                  OR (
                      opened_at >= (v_target_date - INTERVAL '60 days')
                      AND opened_at::date <= v_target_date
                      AND (
                          status ILIKE '%abert%' 
                          OR status ILIKE '%parcial%' 
                          OR status ILIKE '%pendent%' 
                          OR (total_value - paid_value) > 0.05
                      )
                  )
              )
              AND (
                  ABS(COALESCE(credit_value, 0) - v_pos_record.gross_amount) <= 0.05
                  OR ABS(COALESCE(debit_value, 0) - v_pos_record.gross_amount) <= 0.05
                  OR ABS(COALESCE(credit_debit_value, 0) - v_pos_record.gross_amount) <= 0.05
              )
            LIMIT 1;
        ELSIF v_count_candidates > 1 THEN
            v_collision_count := v_collision_count + 1;
        END IF;

        -- 1B. Fallback para OS em aberto/pendente batendo por saldo pendente (total_value - paid_value)
        IF v_os_record.id IS NULL AND v_count_candidates = 0 THEN
            SELECT count(*) INTO v_count_candidates
            FROM public.patio_os
            WHERE store_id = v_pos_record.store_id
              AND COALESCE(match_status, '') <> 'MATCHED'
              AND os_number NOT ILIKE '%faturamento%'
              AND os_number NOT ILIKE '%fat%'
              AND (
                  status ILIKE '%abert%' 
                  OR status ILIKE '%parcial%' 
                  OR status ILIKE '%pendent%' 
                  OR (total_value - paid_value) > 0.05
              )
              AND (opened_at >= (v_target_date - INTERVAL '60 days') AND opened_at::date <= v_target_date)
              AND ABS((total_value - paid_value) - v_pos_record.gross_amount) <= 0.05;

            IF v_count_candidates = 1 THEN
                SELECT * INTO v_os_record
                FROM public.patio_os
                WHERE store_id = v_pos_record.store_id
                  AND COALESCE(match_status, '') <> 'MATCHED'
                  AND os_number NOT ILIKE '%faturamento%'
                  AND os_number NOT ILIKE '%fat%'
                  AND (
                      status ILIKE '%abert%' 
                      OR status ILIKE '%parcial%' 
                      OR status ILIKE '%pendent%' 
                      OR (total_value - paid_value) > 0.05
                  )
                  AND (opened_at >= (v_target_date - INTERVAL '60 days') AND opened_at::date <= v_target_date)
                  AND ABS((total_value - paid_value) - v_pos_record.gross_amount) <= 0.05
                LIMIT 1;
            ELSIF v_count_candidates > 1 THEN
                v_collision_count := v_collision_count + 1;
            END IF;
        END IF;

        -- 1C. Aplicação Segura e Idempotente do Vínculo
        IF v_os_record.id IS NOT NULL THEN
            -- Preserva 'a_compensar' (NUNCA altera para 'entrou')
            UPDATE public.pos_transactions
            SET matched_os_number = v_os_record.os_number,
                settlement_status = COALESCE(settlement_status, 'a_compensar'),
                updated_at = now()
            WHERE id = v_pos_record.id;

            IF v_os_record.status NOT ILIKE '%finalizad%' AND v_os_record.status NOT ILIKE '%pago%' THEN
                UPDATE public.patio_os
                SET paid_value = LEAST(total_value, paid_value + v_pos_record.gross_amount),
                    status = CASE 
                        WHEN (paid_value + v_pos_record.gross_amount) >= total_value - 0.05 THEN 'finalizada'
                        ELSE 'pago_parcial'
                    END,
                    closed_at = CASE 
                        WHEN (paid_value + v_pos_record.gross_amount) >= total_value - 0.05 THEN COALESCE(closed_at, v_target_date::timestamptz)
                        ELSE closed_at 
                    END,
                    last_payment_date = v_target_date,
                    match_status = 'MATCHED',
                    updated_at = now()
                WHERE id = v_os_record.id;
            ELSE
                UPDATE public.patio_os
                SET match_status = 'MATCHED',
                    last_payment_date = COALESCE(last_payment_date, v_target_date),
                    updated_at = now()
                WHERE id = v_os_record.id;
            END IF;

            BEGIN
                INSERT INTO public.conciliation_matches (
                    store_id, system_os_number, rede_transaction_id, status, target_date
                ) VALUES (
                    v_pos_record.store_id,
                    v_os_record.os_number,
                    v_pos_record.id,
                    'matched',
                    v_target_date
                );
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;

            v_pos_matched := v_pos_matched + 1;
        END IF;
    END LOOP;

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
              OR COALESCE(counterpart_name, '') ILIKE '%STONE%'
              OR COALESCE(counterpart_name, '') ILIKE '%PAGSEGURO%'
              OR COALESCE(counterpart_name, '') ILIKE '%EMPORIO DO OLEO%'
              OR COALESCE(counterpart_name, '') ILIKE '%HOLDING%'
              OR COALESCE(counterpart_name, '') ILIKE '%TRANSFERENCIA ENTRE%'
              OR COALESCE(counterpart_name, '') ILIKE '%MP AUTO MECANICA%'
              OR COALESCE(counterpart_name, '') ILIKE '%MP JABAQUARA%'
              OR COALESCE(counterpart_name, '') ILIKE '%MECANICA POPULAR%'
              OR COALESCE(counterpart_name, '') ILIKE '%AUTO MECANICA POPULAR%'
              OR COALESCE(counterpart_name, '') ILIKE '%HD CENTRO AUTOMOTIVO%'
              OR COALESCE(counterpart_name, '') ILIKE '%REI DO MODULO%'
          )
        ORDER BY amount DESC
    LOOP
        v_os_record := NULL;

        -- 2A. Busca por número da OS explícito contido no descritivo bancário
        IF v_ofx_record.store_id IS NOT NULL THEN
            SELECT * INTO v_os_record
            FROM public.patio_os
            WHERE store_id = v_ofx_record.store_id
              AND (
                  (LENGTH(os_number) >= 3 AND (
                      COALESCE(v_ofx_record.fitid, '') ~ ('\\y' || os_number || '\\y')
                      OR COALESCE(v_ofx_record.counterpart_name, '') ~ ('\\y' || os_number || '\\y')
                      OR COALESCE(v_ofx_record.bank_name, '') ~ ('\\y' || os_number || '\\y')
                  ))
              )
            LIMIT 1;
        END IF;

        -- 2B. Busca estrita por pix_transfer_value + IDENTIDADE FORTE DO CLIENTE
        IF v_os_record.id IS NULL AND v_ofx_record.store_id IS NOT NULL THEN
            SELECT * INTO v_os_record
            FROM public.patio_os
            WHERE store_id = v_ofx_record.store_id
              AND COALESCE(pix_transfer_value, 0) > 0
              AND ABS(COALESCE(pix_transfer_value, 0) - v_ofx_record.amount) <= 0.05
              AND client_name IS NOT NULL
              AND (
                  -- Match por documento (CPF/CNPJ limpo)
                  (
                      LENGTH(REGEXP_REPLACE(COALESCE(v_ofx_record.cnpj_cpf, ''), '\\D', '', 'g')) >= 11
                      AND REGEXP_REPLACE(COALESCE(v_ofx_record.cnpj_cpf, ''), '\\D', '', 'g') = REGEXP_REPLACE(COALESCE(client_name, ''), '\\D', '', 'g')
                  )
                  -- Ou match por nome forte (mínimo 4 caracteres úteis)
                  OR (
                      LENGTH(SPLIT_PART(TRIM(client_name), ' ', 1)) >= 4
                      AND SPLIT_PART(TRIM(client_name), ' ', 1) NOT IN ('AUTO', 'CENTRO', 'POSTO', 'LTDA', 'MECANICA', 'SERVICOS', 'RECEBIMENTO', 'TRANSFERENCIA', 'CLIENTE')
                      AND v_ofx_record.counterpart_name ILIKE ('%' || SPLIT_PART(TRIM(client_name), ' ', 1) || '%')
                  )
              )
            ORDER BY opened_at DESC
            LIMIT 1;
        END IF;

        IF v_os_record.id IS NOT NULL THEN
            UPDATE public.ofx_transactions
            SET matched_os_number = v_os_record.os_number,
                manual_category = COALESCE(manual_category, 'PIX / Recebimento OS'),
                updated_at = now()
            WHERE id = v_ofx_record.id;

            IF v_os_record.status NOT ILIKE '%finalizad%' AND v_os_record.status NOT ILIKE '%pago%' THEN
                UPDATE public.patio_os
                SET paid_value = LEAST(total_value, paid_value + v_ofx_record.amount),
                    status = CASE 
                        WHEN (paid_value + v_ofx_record.amount) >= total_value - 0.05 THEN 'finalizada'
                        ELSE 'pago_parcial'
                    END,
                    closed_at = CASE 
                        WHEN (paid_value + v_ofx_record.amount) >= total_value - 0.05 THEN COALESCE(closed_at, v_target_date::timestamptz)
                        ELSE closed_at 
                    END,
                    last_payment_date = v_target_date,
                    match_status = 'MATCHED',
                    updated_at = now()
                WHERE id = v_os_record.id;
            ELSE
                UPDATE public.patio_os
                SET match_status = 'MATCHED',
                    last_payment_date = COALESCE(last_payment_date, v_target_date),
                    updated_at = now()
                WHERE id = v_os_record.id;
            END IF;

            BEGIN
                INSERT INTO public.conciliation_matches (
                    store_id, system_os_number, ofx_transaction_id, status, target_date
                ) VALUES (
                    v_ofx_record.store_id,
                    v_os_record.os_number,
                    v_ofx_record.id,
                    'matched',
                    v_target_date
                );
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;

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
        'pix_matched', v_pix_matched,
        'collisions_prevented', v_collision_count,
        'corporate_tagged', v_corporate_tagged,
        'saidas_result', v_saidas_result,
        'receivables_result', v_receivables_result
    );
END;
$function$;
