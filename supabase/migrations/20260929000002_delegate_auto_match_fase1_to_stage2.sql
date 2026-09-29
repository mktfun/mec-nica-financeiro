-- ============================================================================
-- Migration: 20260929000002_delegate_auto_match_fase1_to_stage2.sql
-- Description: Unify auto_match_daily_transactions FASE 1 with match_stage2_rede_os.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_match_daily_transactions(p_date text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
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
    -- FASE 1: REDE x OS (CANÔNICO VIA MATCH_STAGE2_REDE_OS - MESMA FILIAL, BRUTO)
    -- =========================================================================
    BEGIN
        v_stage2_result := public.match_stage2_rede_os(v_target_date, NULL);
        v_pos_matched := COALESCE((v_stage2_result->>'matched_count')::int, 0);
        v_collision_count := v_collision_count + COALESCE((v_stage2_result->>'collisions_count')::int, 0);
    EXCEPTION WHEN OTHERS THEN
        v_pos_matched := 0;
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
                  (
                      LENGTH(REGEXP_REPLACE(COALESCE(v_ofx_record.cnpj_cpf, ''), '\\D', '', 'g')) >= 11
                      AND REGEXP_REPLACE(COALESCE(v_ofx_record.cnpj_cpf, ''), '\\D', '', 'g') = REGEXP_REPLACE(COALESCE(client_name, ''), '\\D', '', 'g')
                  )
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

            IF v_os_record.status NOT ILIKE '%finalizad%' AND v_os_record.status NOT ILIKE '%pago%' AND (v_os_record.total_value - v_os_record.paid_value) > 0.05 THEN
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
