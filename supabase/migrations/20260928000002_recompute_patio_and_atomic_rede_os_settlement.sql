-- ============================================================================
-- Migration: 20260928000002_recompute_patio_and_atomic_rede_os_settlement.sql
-- Spec 441: Baixa Rede x OS e Recálculo Atômico do Pátio de Loja e Holding
-- ============================================================================

-- 1. Helper Canônico: Recálculo e Sincronização Atômica de Pátio
CREATE OR REPLACE FUNCTION public.recompute_patio_for_date_and_store(
    p_date DATE,
    p_store_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_store_patio NUMERIC := 0;
    v_global_patio NUMERIC := 0;
    v_old_global_patio NUMERIC := 0;
    v_delta_global NUMERIC := 0;
    v_snapshot RECORD;
    v_new_caixa_atual NUMERIC;
    v_updated_stores JSONB := '[]'::jsonb;
    v_store_rec RECORD;
BEGIN
    IF p_date IS NULL THEN
        RAISE EXCEPTION 'Data de referência (p_date) é obrigatória para o recálculo do pátio.';
    END IF;

    -- A) Se informada uma filial específica, calcula e atualiza reconciliations para essa filial
    IF p_store_id IS NOT NULL THEN
        SELECT COALESCE(SUM(GREATEST(0, COALESCE(total_value, 0) - COALESCE(paid_value, 0))), 0)
        INTO v_store_patio
        FROM public.patio_os
        WHERE store_id = p_store_id
          AND LOWER(COALESCE(status, 'em_aberto')) NOT IN ('finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado')
          AND opened_at::date <= p_date;

        UPDATE public.reconciliations
        SET na_loja_os = v_store_patio
        WHERE date = p_date AND store_id = p_store_id;
    ELSE
        -- Atualiza reconciliations para todas as filiais existentes
        FOR v_store_rec IN 
            SELECT DISTINCT s.id as store_id
            FROM public.stores s
        LOOP
            SELECT COALESCE(SUM(GREATEST(0, COALESCE(total_value, 0) - COALESCE(paid_value, 0))), 0)
            INTO v_store_patio
            FROM public.patio_os
            WHERE store_id = v_store_rec.store_id
              AND LOWER(COALESCE(status, 'em_aberto')) NOT IN ('finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado')
              AND opened_at::date <= p_date;

            UPDATE public.reconciliations
            SET na_loja_os = v_store_patio
            WHERE date = p_date AND store_id = v_store_rec.store_id;
        END LOOP;
    END IF;

    -- B) Calcula o somatório do pátio da holding na data (todas as lojas com OS elegível)
    SELECT COALESCE(SUM(GREATEST(0, COALESCE(total_value, 0) - COALESCE(paid_value, 0))), 0)
    INTO v_global_patio
    FROM public.patio_os
    WHERE LOWER(COALESCE(status, 'em_aberto')) NOT IN ('finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado')
      AND opened_at::date <= p_date;

    -- C) Sincroniza daily_snapshots caso exista para a data
    SELECT * INTO v_snapshot
    FROM public.daily_snapshots
    WHERE date = p_date
    FOR UPDATE;

    IF v_snapshot.id IS NOT NULL THEN
        v_old_global_patio := COALESCE(v_snapshot.total_patio, 0);
        v_delta_global := v_global_patio - v_old_global_patio;
        v_new_caixa_atual := COALESCE(v_snapshot.caixa_atual, 0) + v_delta_global;

        -- Se houver array de stores no metadata, atualiza a entrada da loja
        IF v_snapshot.metadata->'stores' IS NOT NULL AND jsonb_typeof(v_snapshot.metadata->'stores') = 'array' THEN
            SELECT jsonb_agg(
                CASE 
                    WHEN (elem->>'store_id') = p_store_id THEN
                        elem || jsonb_build_object(
                            'na_loja_os', v_store_patio,
                            'patio_os', v_store_patio
                        )
                    ELSE elem
                END
            )
            INTO v_updated_stores
            FROM jsonb_array_elements(v_snapshot.metadata->'stores') elem;
        ELSE
            v_updated_stores := v_snapshot.metadata->'stores';
        END IF;

        UPDATE public.daily_snapshots
        SET 
            total_patio = v_global_patio,
            caixa_atual = v_new_caixa_atual,
            metadata = jsonb_set(
                jsonb_set(
                    jsonb_set(
                        COALESCE(metadata, '{}'::jsonb),
                        '{total_patio}', to_jsonb(v_global_patio)
                    ),
                    '{caixa_atual}', to_jsonb(v_new_caixa_atual)
                ),
                '{patio_last_sync}', jsonb_build_object(
                    'synced_at', NOW(),
                    'store_id', p_store_id,
                    'delta_global', v_delta_global,
                    'reason', 'recompute_patio_for_date_and_store'
                )
            ),
            updated_at = NOW()
        WHERE id = v_snapshot.id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'date', p_date,
        'store_id', p_store_id,
        'store_patio', v_store_patio,
        'global_patio', v_global_patio,
        'delta_global', v_delta_global,
        'snapshot_updated', (v_snapshot.id IS NOT NULL)
    );
END;
$$;


-- 2. Atualização Atômica da RPC link_manual_rede_to_os
DROP FUNCTION IF EXISTS public.link_manual_rede_to_os(uuid, uuid, text, numeric);
DROP FUNCTION IF EXISTS public.link_manual_rede_to_os(uuid, text, text);
DROP FUNCTION IF EXISTS public.link_manual_rede_to_os(uuid, uuid, text);

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

    -- 2. Carrega e trava a Ordem de Serviço por número e filial
    SELECT * INTO v_os 
    FROM public.patio_os 
    WHERE os_number = p_os_number
      AND (p_store_id IS NULL OR store_id = p_store_id OR store_id = v_pos.store_id)
    ORDER BY opened_at DESC 
    LIMIT 1
    FOR UPDATE;

    IF v_os.id IS NULL THEN
        RAISE EXCEPTION 'Ordem de Serviço #% não encontrada na filial %.', p_os_number, COALESCE(p_store_id, v_pos.store_id);
    END IF;

    v_store_id := COALESCE(v_os.store_id, v_pos.store_id, p_store_id);
    v_link_amount := COALESCE(p_amount, v_pos.gross_amount, v_pos.net_amount);
    v_target_date := COALESCE(v_pos.target_date, v_pos.occurred_at::date, CURRENT_DATE);

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
        -- OS já estava paga ou finalizada, vínculo é puramente informativo de conciliação
        v_accounting_effect := 'vinculo_informativo_sem_baixa';
        v_paid_after := v_paid_before;
        v_os_balance_after := v_os_balance_before;

        UPDATE public.patio_os
        SET 
            match_status = 'MATCHED',
            updated_at = NOW()
        WHERE id = v_os.id;
    ELSE
        -- 3. Aplica a Baixa Efetiva na OS
        v_accounting_effect := 'baixa_aplicada';
        v_paid_after := LEAST(v_os.total_value, v_paid_before + v_link_amount);
        v_os_balance_after := GREATEST(0, v_os.total_value - v_paid_after);

        UPDATE public.patio_os
        SET 
            paid_value = v_paid_after,
            payment_method = COALESCE(payment_method, v_pos.payment_method, 'CARTAO'),
            credit_value = CASE WHEN v_pos.payment_method ILIKE '%credito%' THEN GREATEST(COALESCE(credit_value, 0), v_paid_after) ELSE credit_value END,
            debit_value = CASE WHEN v_pos.payment_method ILIKE '%debito%' THEN GREATEST(COALESCE(debit_value, 0), v_paid_after) ELSE debit_value END,
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

    -- 4. Atualização da Transação POS
    UPDATE public.pos_transactions
    SET 
        matched_os_number = v_os.os_number,
        manual_category = 'Recebimento Cartão OS',
        store_id = v_store_id
    WHERE id = v_pos.id;

    -- 5. Registro em conciliation_matches (Upsert Seguro)
    IF v_existing_match.id IS NOT NULL THEN
        UPDATE public.conciliation_matches
        SET 
            store_id = v_store_id,
            target_date = v_target_date,
            system_os_number = v_os.os_number,
            status = 'matched_manual',
            divergence_amount = 0
        WHERE id = v_existing_match.id;
    ELSE
        INSERT INTO public.conciliation_matches (
            store_id,
            target_date,
            system_os_number,
            rede_transaction_id,
            status,
            divergence_amount
        ) VALUES (
            v_store_id,
            v_target_date,
            v_os.os_number,
            v_pos.id,
            'matched_manual',
            0
        );
    END IF;

    -- 6. Recálculo Canônico do Pátio de Loja e Holding
    PERFORM public.recompute_patio_for_date_and_store(v_target_date, v_store_id);

    -- Pátios após o recálculo
    SELECT na_loja_os INTO v_store_patio_after
    FROM public.reconciliations
    WHERE date = v_target_date AND store_id = v_store_id;

    SELECT total_patio INTO v_global_patio_after
    FROM public.daily_snapshots
    WHERE date = v_target_date;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Transação Cartão de R$ %s vinculada à OS #%s (%s).', v_link_amount, v_os.os_number, v_accounting_effect),
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


-- 3. Atualização Atômica da RPC unlink_manual_os_match
DROP FUNCTION IF EXISTS public.unlink_manual_os_match(text, uuid, uuid);
DROP FUNCTION IF EXISTS public.unlink_manual_os_match(text, uuid);

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
            manual_category = NULL,
            manual_justification = NULL
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
                v_new_paid := GREATEST(0, COALESCE(v_os.paid_value, 0) - v_amount);
                UPDATE public.patio_os
                SET 
                    paid_value = v_new_paid,
                    pix_transfer_value = GREATEST(0, COALESCE(pix_transfer_value, 0) - v_amount),
                    status = CASE WHEN v_new_paid <= 0 THEN 'em_aberto' ELSE 'pago_parcial' END,
                    match_status = CASE WHEN v_new_paid <= 0 THEN 'UNMATCHED' ELSE 'MATCHED' END,
                    closed_at = CASE WHEN v_new_paid >= (total_value - 0.05) THEN closed_at ELSE NULL END,
                    updated_at = NOW()
                WHERE id = v_os.id;
            END IF;
        END IF;

        DELETE FROM public.conciliation_matches
        WHERE ofx_transaction_id = p_transaction_id;

        IF v_target_date IS NOT NULL AND v_store_id IS NOT NULL THEN
            PERFORM public.recompute_patio_for_date_and_store(v_target_date, v_store_id);
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

        UPDATE public.pos_transactions
        SET 
            matched_os_number = NULL,
            manual_category = NULL,
            manual_justification = NULL
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
                v_new_paid := GREATEST(0, COALESCE(v_os.paid_value, 0) - v_amount);
                UPDATE public.patio_os
                SET 
                    paid_value = v_new_paid,
                    credit_value = CASE WHEN v_pos.payment_method ILIKE '%credito%' THEN GREATEST(0, COALESCE(credit_value, 0) - v_amount) ELSE credit_value END,
                    debit_value = CASE WHEN v_pos.payment_method ILIKE '%debito%' THEN GREATEST(0, COALESCE(debit_value, 0) - v_amount) ELSE debit_value END,
                    status = CASE WHEN v_new_paid <= 0 THEN 'em_aberto' ELSE 'pago_parcial' END,
                    match_status = CASE WHEN v_new_paid <= 0 THEN 'UNMATCHED' ELSE 'MATCHED' END,
                    closed_at = CASE WHEN v_new_paid >= (total_value - 0.05) THEN closed_at ELSE NULL END,
                    updated_at = NOW()
                WHERE id = v_os.id;
            END IF;
        END IF;

        DELETE FROM public.conciliation_matches
        WHERE rede_transaction_id = p_transaction_id;

        IF v_target_date IS NOT NULL AND v_store_id IS NOT NULL THEN
            PERFORM public.recompute_patio_for_date_and_store(v_target_date, v_store_id);
        END IF;
    ELSE
        RAISE EXCEPTION 'Tipo de transação inválido: %. Use "ofx" ou "rede".', p_transaction_type;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Desvinculação concluída com sucesso para a transação %s e saldos recompostos.', p_transaction_id),
        'transaction_id', p_transaction_id,
        'os_number', v_os_number,
        'store_id', v_store_id,
        'target_date', v_target_date
    );
END;
$$;
