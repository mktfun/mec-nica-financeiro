-- Migration: 20260924160000_strict_auto_match_daily_transactions.sql
-- Description: Blindagem estrita de auto_match_daily_transactions e auto_match_receivables contra falsos positivos PIX x OS e Intercompany

CREATE OR REPLACE FUNCTION public.auto_match_daily_transactions(p_date text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
BEGIN
    IF p_date IS NULL THEN
        RAISE EXCEPTION 'p_date não pode ser nulo';
    END IF;

    v_target_date := p_date::date;

    -- =========================================================================
    -- FASE 0: AUTO-TAGGING E ROTEAMENTO DE TRANSAÇÕES CORPORATIVAS / NÃO-OS
    -- =========================================================================
    -- 0A. Empréstimos e Capital de Giro
    UPDATE public.ofx_transactions
    SET manual_category = 'EMPRÉSTIMO',
        manual_justification = 'Empréstimo Capital de Giro (Corporativo / Não-OS)',
        updated_at = now()
    WHERE target_date = v_target_date
      AND type = 'in'
      AND matched_os_number IS NULL
      AND (
          COALESCE(counterpart_name, '') ILIKE '%EMPREST%'
          OR COALESCE(counterpart_name, '') ILIKE '%CAPITAL DE GIRO%'
          OR COALESCE(bank_name, '') ILIKE '%EMPREST%'
          OR COALESCE(fitid, '') ILIKE '%EMPREST%'
      );

    -- 0B. Seguros e Sinistros
    UPDATE public.ofx_transactions
    SET manual_category = 'OUTROS',
        manual_justification = 'Recebimento de Seguros / Sinistro (Não-OS)',
        updated_at = now()
    WHERE target_date = v_target_date
      AND type = 'in'
      AND matched_os_number IS NULL
      AND (
          COALESCE(counterpart_name, '') ILIKE '%SEGURO%'
          OR COALESCE(counterpart_name, '') ILIKE '%ITAU SEGUROS%'
          OR COALESCE(counterpart_name, '') ILIKE '%PORTO SEGURO%'
          OR COALESCE(bank_name, '') ILIKE '%SEGUROS%'
      );

    -- 0C. Transferências entre Lojas e Holding (Intercompany) - NUNCA CASAM COM OS
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
          OR COALESCE(bank_name, '') ILIKE '%MECANICA POPULAR%'
          OR COALESCE(fitid, '') ILIKE '%mecanicapopular%'
          OR COALESCE(fitid, '') ILIKE '%hdcentroautomotivo%'
      );

    -- 0D. Rendimentos e Resgates Automáticos
    UPDATE public.ofx_transactions
    SET manual_category = 'RENDIMENTOS',
        manual_justification = 'Aplicação / Resgate Automático',
        updated_at = now()
    WHERE target_date = v_target_date
      AND type = 'in'
      AND matched_os_number IS NULL
      AND (
          COALESCE(counterpart_name, '') ILIKE '%REND%'
          OR COALESCE(counterpart_name, '') ILIKE '%APLIC%'
          OR COALESCE(counterpart_name, '') ILIKE '%RESG%'
      );

    SELECT count(*) INTO v_corporate_tagged
    FROM public.ofx_transactions
    WHERE target_date = v_target_date
      AND type = 'in'
      AND manual_category IN ('EMPRÉSTIMO', 'OUTROS', 'TRANSFERÊNCIA', 'Transferência Entre Lojas [Apenas Conciliar]', 'RENDIMENTOS');

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

        -- 1A. Procura OS em aberto ou parcial na mesma filial cujo valor bate com o líquido ou bruto
        SELECT count(*) INTO v_count_candidates
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
          );

        IF v_count_candidates = 1 THEN
            SELECT *
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
            LIMIT 1;
        ELSIF v_count_candidates > 1 THEN
            v_collision_count := v_collision_count + 1;
            v_os_record := NULL;
        END IF;

        -- 1B. Se não achou em aberto único, busca em OSs com credit_value ou debit_value batendo na mesma filial
        IF v_os_record.id IS NULL AND v_count_candidates = 0 THEN
            SELECT count(*) INTO v_count_candidates
            FROM public.patio_os
            WHERE store_id = v_pos_record.store_id
              AND (
                  ABS(COALESCE(credit_value, 0) - v_pos_record.gross_amount) <= 0.05
                  OR ABS(COALESCE(debit_value, 0) - v_pos_record.gross_amount) <= 0.05
                  OR ABS(COALESCE(credit_debit_value, 0) - v_pos_record.gross_amount) <= 0.05
                  OR ABS(COALESCE(credit_value, 0) - v_pos_record.net_amount) <= 0.05
                  OR ABS(COALESCE(debit_value, 0) - v_pos_record.net_amount) <= 0.05
                  OR ABS(total_value - v_pos_record.gross_amount) <= 0.05
                  OR ABS(total_value - v_pos_record.net_amount) <= 0.05
              );

            IF v_count_candidates = 1 THEN
                SELECT *
                INTO v_os_record
                FROM public.patio_os
                WHERE store_id = v_pos_record.store_id
                  AND (
                      ABS(COALESCE(credit_value, 0) - v_pos_record.gross_amount) <= 0.05
                      OR ABS(COALESCE(debit_value, 0) - v_pos_record.gross_amount) <= 0.05
                      OR ABS(COALESCE(credit_debit_value, 0) - v_pos_record.gross_amount) <= 0.05
                      OR ABS(COALESCE(credit_value, 0) - v_pos_record.net_amount) <= 0.05
                      OR ABS(COALESCE(debit_value, 0) - v_pos_record.net_amount) <= 0.05
                      OR ABS(total_value - v_pos_record.gross_amount) <= 0.05
                      OR ABS(total_value - v_pos_record.net_amount) <= 0.05
                  )
                LIMIT 1;
            ELSIF v_count_candidates > 1 THEN
                v_collision_count := v_collision_count + 1;
                v_os_record := NULL;
            END IF;
        END IF;

        IF v_os_record.id IS NOT NULL THEN
            UPDATE public.pos_transactions
            SET matched_os_number = v_os_record.os_number,
                settlement_status = COALESCE(settlement_status, 'entrou')
            WHERE id = v_pos_record.id;

            IF v_os_record.status NOT ILIKE '%finalizad%' AND v_os_record.status NOT ILIKE '%pago%' THEN
                UPDATE public.patio_os
                SET paid_value = LEAST(total_value, paid_value + v_pos_record.net_amount),
                    status = CASE 
                        WHEN (paid_value + v_pos_record.net_amount) >= total_value - 0.05 THEN 'finalizada'
                        ELSE 'pago_parcial'
                    END,
                    match_status = 'MATCHED',
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
    -- FASE 2: PAREAMENTO DETERMINÍSTICO DE OFX (PIX / ENTRADAS) x PATIO_OS
    -- BLINDAGEM: Exige duplo fator cumulativo (parcela PIX + identidade de cliente)
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
              OR COALESCE(counterpart_name, '') ILIKE '%BIN%'
              OR COALESCE(bank_name, '') ILIKE '%REDE%' 
              OR COALESCE(bank_name, '') ILIKE '%CARD%'
              OR COALESCE(counterpart_name, '') ILIKE '%EMPORIO DO OLEO%'
              OR COALESCE(counterpart_name, '') ILIKE '%HOLDING%'
              OR COALESCE(counterpart_name, '') ILIKE '%TRANSFERENCIA ENTRE%'
              OR COALESCE(counterpart_name, '') ILIKE '%MP AUTO MECANICA%'
              OR COALESCE(counterpart_name, '') ILIKE '%MP JABAQUARA%'
              OR COALESCE(counterpart_name, '') ILIKE '%MECANICA POPULAR%'
              OR COALESCE(counterpart_name, '') ILIKE '%AUTO MECANICA POPULAR%'
              OR COALESCE(counterpart_name, '') ILIKE '%HD CENTRO AUTOMOTIVO%'
          )
        ORDER BY amount DESC
    LOOP
        v_os_record := NULL;

        -- 2A. Busca por número da OS explícito contido no texto (FITID ou counterpart_name ou bank_name)
        IF v_ofx_record.store_id IS NOT NULL THEN
            SELECT *
            INTO v_os_record
            FROM public.patio_os
            WHERE store_id = v_ofx_record.store_id
              AND (
                  (LENGTH(os_number) >= 3 AND (
                      COALESCE(v_ofx_record.fitid, '') ~ ('\y' || os_number || '\y')
                      OR COALESCE(v_ofx_record.counterpart_name, '') ~ ('\y' || os_number || '\y')
                      OR COALESCE(v_ofx_record.bank_name, '') ~ ('\y' || os_number || '\y')
                  ))
              )
            LIMIT 1;
        END IF;

        -- 2B. Busca por valor de pix_transfer_value na mesma filial COM CONFIRMAÇÃO DE IDENTIDADE DO CLIENTE
        IF v_os_record.id IS NULL AND v_ofx_record.store_id IS NOT NULL THEN
            SELECT *
            INTO v_os_record
            FROM public.patio_os
            WHERE store_id = v_ofx_record.store_id
              AND COALESCE(pix_transfer_value, 0) > 0
              AND ABS(COALESCE(pix_transfer_value, 0) - v_ofx_record.amount) <= 0.05
              AND client_name IS NOT NULL
              AND (
                  -- Documento CPF/CNPJ coincidente (se presente)
                  (
                      LENGTH(REGEXP_REPLACE(COALESCE(v_ofx_record.cnpj_cpf, ''), '\D', '', 'g')) >= 11
                      AND REGEXP_REPLACE(COALESCE(v_ofx_record.cnpj_cpf, ''), '\D', '', 'g') = REGEXP_REPLACE(COALESCE(client_name, ''), '\D', '', 'g')
                  )
                  -- Ou correspondência de nome relevante
                  OR (
                      LENGTH(SPLIT_PART(TRIM(client_name), ' ', 1)) >= 4
                      AND SPLIT_PART(TRIM(client_name), ' ', 1) NOT IN ('AUTO', 'CENTRO', 'POSTO', 'LTDA', 'MECANICA', 'SERVICOS', 'RECEBIMENTO', 'TRANSFERENCIA')
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
                    match_status = 'MATCHED',
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

    -- FASE 3: Auto-match de Saídas
    BEGIN
        v_saidas_result := public.auto_match_saidas(v_target_date::text);
    EXCEPTION WHEN OTHERS THEN
        v_saidas_result := jsonb_build_object('success', false, 'error', SQLERRM);
    END;

    RETURN jsonb_build_object(
        'success', true,
        'date', v_target_date,
        'pos_matched', v_pos_matched,
        'pix_matched', v_pix_matched,
        'collisions_prevented', v_collision_count,
        'corporate_tagged', v_corporate_tagged,
        'saidas_result', v_saidas_result
    );
END;
$$;


-- ============================================================================
-- RPC: auto_match_receivables BLINDADA CONTRA INTERCOMPANY E ADQUIRENTES
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_match_receivables(
    p_date date DEFAULT NULL::date,
    p_store_id text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_matched_count integer := 0;
    v_matched_amount numeric(15,2) := 0.00;
    r_ofx record;
    r_rec record;
    v_details jsonb := '[]'::jsonb;
BEGIN
    -- Itera sobre transações de entrada do extrato OFX não conciliadas
    -- FILTRO NEGATIVO: Ignora adquirentes e transferências intercompany
    FOR r_ofx IN 
        SELECT id, store_id, target_date, amount, counterpart_name, fitid
        FROM public.ofx_transactions
        WHERE type = 'in'
          AND (p_store_id IS NULL OR store_id = p_store_id)
          AND (p_date IS NULL OR target_date = p_date)
          AND matched_os_number IS NULL
          AND (manual_category IS NULL OR manual_category NOT IN ('TRANSFERÊNCIA', 'Transferência Entre Lojas [Apenas Conciliar]', 'EMPRÉSTIMO', 'RENDIMENTOS', 'OUTROS'))
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
              OR COALESCE(counterpart_name, '') ILIKE '%HD CENTRO AUTOMOTIVO%'
          )
        ORDER BY target_date ASC, amount DESC
    LOOP
        -- Busca um título em receivables que case por valor e loja
        SELECT id, os_number, installment, type, value, due_date, description
        INTO r_rec
        FROM public.receivables
        WHERE store_id = r_ofx.store_id
          AND status = 'pendente'
          AND (
            -- Match 1: Valor exato
            ROUND(value, 2) = ROUND(ABS(r_ofx.amount), 2)
            -- Match 2: Tolerância de tarifa bancária de boleto (até R$ 5,00)
            OR (type = 'Boleto' AND ROUND(ABS(r_ofx.amount), 2) BETWEEN (ROUND(value, 2) - 5.00) AND ROUND(value, 2))
          )
          AND (
            -- Janela de data: até 5 dias antes do vencimento ou até 30 dias após
            r_ofx.target_date BETWEEN (due_date - INTERVAL '5 days')::date AND (due_date + INTERVAL '30 days')::date
            -- Ou se o número da OS estiver explícito no descritivo do banco
            OR (os_number IS NOT NULL AND length(os_number) >= 3 AND COALESCE(r_ofx.counterpart_name, '') ILIKE '%' || os_number || '%')
          )
        ORDER BY 
          -- Prioriza quem tem número de OS no descritivo, depois menor diferença de data
          (CASE WHEN os_number IS NOT NULL AND length(os_number) >= 3 AND COALESCE(r_ofx.counterpart_name, '') ILIKE '%' || os_number || '%' THEN 0 ELSE 1 END),
          ABS(r_ofx.target_date - due_date) ASC
        LIMIT 1;

        IF FOUND THEN
            -- Atualiza o recebível dando baixa
            UPDATE public.receivables
            SET status = 'recebido',
                received_at = r_ofx.target_date::timestamptz,
                matched_ofx_id = r_ofx.id,
                paid_value = ABS(r_ofx.amount),
                discount_value = GREATEST(0, r_rec.value - ABS(r_ofx.amount)),
                updated_at = NOW()
            WHERE id = r_rec.id;

            -- Atualiza a transação OFX vinculando a OS
            UPDATE public.ofx_transactions
            SET matched_os_number = r_rec.os_number,
                manual_category = COALESCE(manual_category, 'Recebível ' || r_rec.type)
            WHERE id = r_ofx.id;

            v_matched_count := v_matched_count + 1;
            v_matched_amount := v_matched_amount + ABS(r_ofx.amount);

            v_details := v_details || jsonb_build_object(
                'ofx_id', r_ofx.id,
                'receivable_id', r_rec.id,
                'os_number', r_rec.os_number,
                'installment', r_rec.installment,
                'store_id', r_ofx.store_id,
                'amount', ABS(r_ofx.amount),
                'type', r_rec.type,
                'target_date', r_ofx.target_date
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'matched_count', v_matched_count,
        'matched_amount', v_matched_amount,
        'details', v_details
    );
END;
$$;
