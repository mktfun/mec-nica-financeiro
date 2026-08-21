-- =========================================================================
-- MIGRATION: 20260821000010_auto_match_pending_os.sql
-- DESCRIÇÃO: Motor Aprimorado de Pareamento de OSs Pendentes & Transações Órfãs
-- =========================================================================

DROP FUNCTION IF EXISTS public.auto_match_transactions(date);

CREATE OR REPLACE FUNCTION auto_match_transactions(p_date date)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    ofx_record RECORD;
    rede_record RECORD;
    os_record RECORD;
    v_target_amount numeric;
    v_accumulated numeric;
    v_rede_ids uuid[];
    v_count_matched_os int := 0;
    v_count_matched_rede int := 0;
BEGIN
    IF p_date IS NULL THEN
        RAISE EXCEPTION 'Data obrigatória para conciliação.';
    END IF;

    -- =========================================================================
    -- ETAPA 1: Parear transações OFX de entrada órfãs com OSs Pendentes do Pátio
    -- =========================================================================
    FOR ofx_record IN 
        SELECT id, amount, store_id, matched_os_number
        FROM public.ofx_transactions 
        WHERE (target_date = p_date OR DATE(occurred_at) = p_date)
          AND type = 'in' 
          AND matched_os_number IS NULL
    LOOP
        v_target_amount := ofx_record.amount;

        -- Busca OSs da mesma filial em aberto ou com pagamento parcial
        -- Prioriza: 1. Saldo Pendente (total_value - paid_value) -> 2. PIX -> 3. Valor Total
        SELECT 
            id, 
            os_number, 
            total_value, 
            COALESCE(paid_value, 0) as current_paid,
            (total_value - COALESCE(paid_value, 0)) as pending_balance
        INTO os_record
        FROM public.patio_os
        WHERE store_id = ofx_record.store_id
          AND matched_ofx_id IS NULL
          AND status IN ('em_aberto', 'pago_parcial')
          AND (
              ABS((total_value - COALESCE(paid_value, 0)) - v_target_amount) < 0.05
              OR ABS(COALESCE(pix_transfer_value, 0) - v_target_amount) < 0.05
              OR ABS(total_value - v_target_amount) < 0.05
          )
        ORDER BY 
          -- Prioridade 1: quem bate exatamente o saldo pendente restante
          ABS((total_value - COALESCE(paid_value, 0)) - v_target_amount) ASC,
          opened_at DESC
        LIMIT 1;

        IF FOUND THEN
            -- Atualiza a OS no Pátio: incrementa paid_value e se atingiu total_value vira finalizado
            UPDATE public.patio_os 
            SET 
                paid_value = LEAST(total_value, os_record.current_paid + v_target_amount),
                status = CASE 
                    WHEN (os_record.current_paid + v_target_amount) >= (total_value - 0.05) THEN 'finalizado' 
                    ELSE 'pago_parcial' 
                END,
                closed_at = CASE 
                    WHEN (os_record.current_paid + v_target_amount) >= (total_value - 0.05) THEN p_date 
                    ELSE closed_at 
                END,
                matched_ofx_id = ofx_record.id,
                match_status = 'MATCHED',
                updated_at = NOW()
            WHERE id = os_record.id;

            -- Vincula a OS no OFX
            UPDATE public.ofx_transactions 
            SET matched_os_number = os_record.os_number 
            WHERE id = ofx_record.id;

            -- Registra o pareamento na tabela de conciliação
            INSERT INTO public.conciliation_matches (
                store_id,
                target_date,
                system_os_number,
                ofx_transaction_id,
                status,
                divergence_amount
            ) VALUES (
                ofx_record.store_id,
                p_date,
                os_record.os_number,
                ofx_record.id,
                'matched',
                0
            ) ON CONFLICT DO NOTHING;

            v_count_matched_os := v_count_matched_os + 1;
            CONTINUE; -- Próximo OFX
        END IF;

        -- =====================================================================
        -- ETAPA 2: Parear créditos OFX com lotes acumulados de Cartão da Rede
        -- =====================================================================
        v_accumulated := 0;
        v_rede_ids := '{}'::uuid[];

        FOR rede_record IN
            SELECT id, net_amount, matched_os_number 
            FROM public.pos_transactions 
            WHERE (target_date = p_date OR DATE(occurred_at) = p_date)
              AND matched_os_number IS NULL 
              AND store_id = ofx_record.store_id
            ORDER BY occurred_at DESC, net_amount DESC
        LOOP
            v_accumulated := v_accumulated + rede_record.net_amount;
            v_rede_ids := array_append(v_rede_ids, rede_record.id);

            IF ABS(v_accumulated - v_target_amount) < 0.05 THEN
                -- Lote conciliado!
                UPDATE public.pos_transactions 
                SET matched_os_number = ofx_record.id::text 
                WHERE id = ANY(v_rede_ids);

                UPDATE public.ofx_transactions 
                SET matched_os_number = 'LOTE_REDE_' || ofx_record.id::text 
                WHERE id = ofx_record.id;

                v_count_matched_rede := v_count_matched_rede + 1;
                EXIT;
            END IF;

            IF v_accumulated > v_target_amount THEN
                v_accumulated := v_accumulated - rede_record.net_amount;
                v_rede_ids := array_remove(v_rede_ids, rede_record.id);
            END IF;
        END LOOP;

    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'date', p_date,
        'matched_os_count', v_count_matched_os,
        'matched_rede_count', v_count_matched_rede
    );
END;
$$;
