-- ==============================================================================
-- MIGRATION: 20260901000014_unified_auto_match_daily_transactions.sql
-- DESCRIÇÃO: RPC Atômica para Pareamento Automático Determinístico de:
--            1. Vendas REDE (pos_transactions) x Ordens de Serviço (patio_os) da mesma filial
--            2. PIX / Créditos Bancários (ofx_transactions) x Ordens de Serviço (patio_os) da mesma filial
--            3. Débitos Bancários (ofx_transactions) x Contas a Pagar (daily_manual_bills)
-- ==============================================================================

DROP FUNCTION IF EXISTS public.auto_match_daily_transactions(date);
DROP FUNCTION IF EXISTS public.auto_match_daily_transactions(text);

CREATE OR REPLACE FUNCTION public.auto_match_daily_transactions(p_date text)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_date DATE;
    v_pos_record RECORD;
    v_ofx_record RECORD;
    v_os_record RECORD;
    v_pos_matched INT := 0;
    v_pix_matched INT := 0;
    v_saidas_result JSONB;
BEGIN
    IF p_date IS NULL THEN
        RAISE EXCEPTION 'p_date não pode ser nulo';
    END IF;

    v_target_date := p_date::date;

    -- =========================================================================
    -- FASE 1: PAREAMENTO DETERMINÍSTICO DE POS (REDE) x PATIO_OS DA MESMA FILIAL
    -- =========================================================================
    FOR v_pos_record IN 
        SELECT id, store_id, net_amount, gross_amount, payment_method, machine_name, target_date, occurred_at
        FROM public.pos_transactions
        WHERE target_date = v_target_date
          AND matched_os_number IS NULL
          AND store_id IS NOT NULL
        ORDER BY net_amount DESC
    LOOP
        v_os_record := NULL;

        -- Procura OS em aberto na mesma filial cujo valor bate com o líquido ou bruto
        SELECT id, os_number, total_value, paid_value, status, credit_value, debit_value, credit_debit_value
        INTO v_os_record
        FROM public.patio_os
        WHERE store_id = v_pos_record.store_id
          AND (status ILIKE '%aberto%' OR status ILIKE '%parcial%' OR status ILIKE '%pendente%' OR status = 'ABERTA' OR status = 'PENDENTE')
          AND (
              ABS(COALESCE(credit_value, 0) - v_pos_record.net_amount) <= 0.05
              OR ABS(COALESCE(debit_value, 0) - v_pos_record.net_amount) <= 0.05
              OR ABS(COALESCE(credit_debit_value, 0) - v_pos_record.net_amount) <= 0.05
              OR ABS((total_value - paid_value) - v_pos_record.net_amount) <= 0.05
              OR ABS(total_value - v_pos_record.gross_amount) <= 0.05
              OR ABS(total_value - v_pos_record.net_amount) <= 0.05
          )
        ORDER BY opened_at DESC
        LIMIT 1;

        IF v_os_record.id IS NOT NULL THEN
            -- 1. Vincula a transação POS à OS
            UPDATE public.pos_transactions
            SET matched_os_number = v_os_record.os_number,
                settlement_status = COALESCE(settlement_status, 'entrou')
            WHERE id = v_pos_record.id;

            -- 2. Atualiza a OS em patio_os
            UPDATE public.patio_os
            SET paid_value = LEAST(total_value, paid_value + v_pos_record.net_amount),
                status = CASE 
                    WHEN (paid_value + v_pos_record.net_amount) >= total_value - 0.05 THEN 'finalizada'
                    ELSE 'pago_parcial'
                END,
                match_status = 'MATCHED',
                updated_at = now()
            WHERE id = v_os_record.id;

            -- 3. Registra em conciliation_matches
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
    -- FASE 2: PAREAMENTO DETERMINÍSTICO DE OFX (PIX / ENTRADAS) x PATIO_OS DA MESMA FILIAL
    -- =========================================================================
    FOR v_ofx_record IN 
        SELECT id, store_id, amount, counterpart_name, fitid, bank_name, target_date, occurred_at
        FROM public.ofx_transactions
        WHERE target_date = v_target_date
          AND type = 'in'
          AND matched_os_number IS NULL
        ORDER BY amount DESC
    LOOP
        v_os_record := NULL;

        -- 2A. Busca por número da OS contido no texto (FITID ou counterpart_name)
        IF v_ofx_record.store_id IS NOT NULL THEN
            SELECT id, os_number, total_value, paid_value, status, client_name
            INTO v_os_record
            FROM public.patio_os
            WHERE store_id = v_ofx_record.store_id
              AND (
                  (LENGTH(os_number) >= 3 AND (
                      COALESCE(v_ofx_record.fitid, '') ILIKE ('%' || os_number || '%')
                      OR COALESCE(v_ofx_record.counterpart_name, '') ILIKE ('%' || os_number || '%')
                      OR COALESCE(v_ofx_record.bank_name, '') ILIKE ('%' || os_number || '%')
                  ))
              )
            LIMIT 1;
        END IF;

        -- 2B. Se não achou por texto, busca por valor exato na mesma filial
        IF v_os_record.id IS NULL AND v_ofx_record.store_id IS NOT NULL THEN
            SELECT id, os_number, total_value, paid_value, status, client_name
            INTO v_os_record
            FROM public.patio_os
            WHERE store_id = v_ofx_record.store_id
              AND (status ILIKE '%aberto%' OR status ILIKE '%parcial%' OR status ILIKE '%pendente%' OR status = 'ABERTA' OR status = 'PENDENTE')
              AND (
                  ABS(COALESCE(pix_transfer_value, 0) - v_ofx_record.amount) <= 0.05
                  OR ABS((total_value - paid_value) - v_ofx_record.amount) <= 0.05
                  OR ABS(total_value - v_ofx_record.amount) <= 0.05
              )
            ORDER BY opened_at DESC
            LIMIT 1;
        END IF;

        -- 2C. Se não achou, busca por primeiro nome do cliente (se tiver pelo menos 4 caracteres)
        IF v_os_record.id IS NULL AND v_ofx_record.store_id IS NOT NULL AND LENGTH(COALESCE(v_ofx_record.counterpart_name, '')) >= 4 THEN
            SELECT id, os_number, total_value, paid_value, status, client_name
            INTO v_os_record
            FROM public.patio_os
            WHERE store_id = v_ofx_record.store_id
              AND (status ILIKE '%aberto%' OR status ILIKE '%parcial%' OR status ILIKE '%pendente%' OR status = 'ABERTA' OR status = 'PENDENTE')
              AND client_name IS NOT NULL
              AND (
                  client_name ILIKE ('%' || SPLIT_PART(TRIM(v_ofx_record.counterpart_name), ' ', 1) || '%')
                  OR v_ofx_record.counterpart_name ILIKE ('%' || SPLIT_PART(TRIM(client_name), ' ', 1) || '%')
              )
            ORDER BY opened_at DESC
            LIMIT 1;
        END IF;

        IF v_os_record.id IS NOT NULL THEN
            -- 1. Vincula a transação OFX à OS
            UPDATE public.ofx_transactions
            SET matched_os_number = v_os_record.os_number,
                manual_category = COALESCE(manual_category, 'PIX / Recebimento OS'),
                updated_at = now()
            WHERE id = v_ofx_record.id;

            -- 2. Atualiza a OS em patio_os
            UPDATE public.patio_os
            SET paid_value = LEAST(total_value, paid_value + v_ofx_record.amount),
                status = CASE 
                    WHEN (paid_value + v_ofx_record.amount) >= total_value - 0.05 THEN 'finalizada'
                    ELSE 'pago_parcial'
                END,
                match_status = 'MATCHED',
                matched_ofx_id = v_ofx_record.id,
                updated_at = now()
            WHERE id = v_os_record.id;

            -- 3. Registra em conciliation_matches
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
    -- FASE 3: PAREAMENTO DE SAÍDAS (DÉBITOS OFX x CONTAS A PAGAR)
    -- =========================================================================
    BEGIN
        v_saidas_result := public.auto_match_saidas(v_target_date);
    EXCEPTION WHEN OTHERS THEN
        v_saidas_result := jsonb_build_object('error', SQLERRM);
    END;

    RETURN jsonb_build_object(
        'success', true,
        'date', v_target_date,
        'matched_pos_count', v_pos_matched,
        'matched_pix_count', v_pix_matched,
        'saidas_result', v_saidas_result
    );
END;
$$;

NOTIFY pgrst, 'reload schema';
