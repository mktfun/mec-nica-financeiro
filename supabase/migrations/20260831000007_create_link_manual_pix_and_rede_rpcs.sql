
-- ============================================================================
-- Migration: 20260831000007_create_link_manual_pix_and_rede_rpcs.sql
-- Description: RPCs atômicas de vínculo e desvínculo de PIX e REDE a OSs do pátio
-- ============================================================================

-- 1. RPC: link_manual_pix_to_os
DROP FUNCTION IF EXISTS public.link_manual_pix_to_os(uuid, uuid, text, numeric);
DROP FUNCTION IF EXISTS public.link_manual_pix_to_os(uuid, text, text);
DROP FUNCTION IF EXISTS public.link_manual_pix_to_os(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.link_manual_pix_to_os(
    p_ofx_id UUID,
    p_os_number TEXT,
    p_store_id TEXT,
    p_amount NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ofx RECORD;
    v_os RECORD;
    v_link_amount NUMERIC;
    v_new_paid NUMERIC;
    v_target_date DATE;
BEGIN
    IF p_ofx_id IS NULL OR p_os_number IS NULL THEN
        RAISE EXCEPTION 'ID de transação OFX e número da Ordem de Serviço são obrigatórios.';
    END IF;

    -- 1. Carrega e trava a transação OFX
    SELECT * INTO v_ofx 
    FROM public.ofx_transactions 
    WHERE id = p_ofx_id 
    FOR UPDATE;

    IF v_ofx.id IS NULL THEN
        RAISE EXCEPTION 'Transação OFX não encontrada (ID: %).', p_ofx_id;
    END IF;

    -- 2. Carrega e trava a Ordem de Serviço por número e filial
    SELECT * INTO v_os 
    FROM public.patio_os 
    WHERE os_number = p_os_number
      AND (p_store_id IS NULL OR store_id = p_store_id OR store_id = v_ofx.store_id)
    ORDER BY opened_at DESC 
    LIMIT 1;

    IF v_os.id IS NULL THEN
        RAISE EXCEPTION 'Ordem de Serviço #% não encontrada na filial %.', p_os_number, COALESCE(p_store_id, v_ofx.store_id);
    END IF;

    v_link_amount := COALESCE(p_amount, ABS(v_ofx.amount));
    v_target_date := COALESCE(v_ofx.target_date, v_ofx.occurred_at::date, CURRENT_DATE);

    -- 3. Atualização Atômica da OS
    IF LOWER(COALESCE(v_os.status, 'em_aberto')) IN ('em_aberto', 'pago_parcial', 'em_andamento', 'aberta', 'aberto', 'pendente') THEN
        v_new_paid := LEAST(v_os.total_value, COALESCE(v_os.paid_value, 0) + v_link_amount);
        
        UPDATE public.patio_os
        SET 
            paid_value = v_new_paid,
            payment_method = COALESCE(payment_method, 'PIX'),
            pix_transfer_value = COALESCE(pix_transfer_value, 0) + v_link_amount,
            status = CASE 
                WHEN v_new_paid >= (v_os.total_value - 0.05) THEN 'finalizada' 
                ELSE 'pago_parcial' 
            END,
            closed_at = CASE 
                WHEN v_new_paid >= (v_os.total_value - 0.05) THEN v_target_date 
                ELSE closed_at 
            END,
            last_payment_date = v_target_date,
            matched_ofx_id = v_ofx.id,
            match_status = 'MATCHED',
            updated_at = NOW()
        WHERE id = v_os.id;
    ELSE
        -- OS já finalizada: apenas vincula comprovante sem inflar faturamento
        UPDATE public.patio_os
        SET 
            matched_ofx_id = v_ofx.id,
            match_status = 'MATCHED',
            updated_at = NOW()
        WHERE id = v_os.id;
    END IF;

    -- 4. Atualização da Transação OFX
    UPDATE public.ofx_transactions
    SET 
        matched_os_number = v_os.os_number,
        manual_category = 'Recebimento OS',
        store_id = COALESCE(v_ofx.store_id, v_os.store_id, p_store_id)
    WHERE id = v_ofx.id;

    -- 5. Registro em conciliation_matches
    INSERT INTO public.conciliation_matches (
        store_id,
        target_date,
        system_os_number,
        ofx_transaction_id,
        status,
        divergence_amount
    ) VALUES (
        COALESCE(v_os.store_id, v_ofx.store_id, p_store_id),
        v_target_date,
        v_os.os_number,
        v_ofx.id,
        'matched_manual',
        0
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('PIX de R$ %s vinculado com sucesso à OS #%s.', v_link_amount, v_os.os_number),
        'ofx_id', v_ofx.id,
        'os_id', v_os.id,
        'os_number', v_os.os_number,
        'store_id', COALESCE(v_os.store_id, v_ofx.store_id, p_store_id)
    );
END;
$$;


-- 2. RPC: link_manual_rede_to_os
DROP FUNCTION IF EXISTS public.link_manual_rede_to_os(uuid, uuid, text, numeric);
DROP FUNCTION IF EXISTS public.link_manual_rede_to_os(uuid, text, text);
DROP FUNCTION IF EXISTS public.link_manual_rede_to_os(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.link_manual_rede_to_os(
    p_pos_id UUID,
    p_os_number TEXT,
    p_store_id TEXT,
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
    v_link_amount NUMERIC;
    v_new_paid NUMERIC;
    v_target_date DATE;
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
    LIMIT 1;

    IF v_os.id IS NULL THEN
        RAISE EXCEPTION 'Ordem de Serviço #% não encontrada na filial %.', p_os_number, COALESCE(p_store_id, v_pos.store_id);
    END IF;

    v_link_amount := COALESCE(p_amount, v_pos.gross_amount, v_pos.net_amount);
    v_target_date := COALESCE(v_pos.target_date, v_pos.occurred_at::date, CURRENT_DATE);

    -- 3. Atualização Atômica da OS
    IF LOWER(COALESCE(v_os.status, 'em_aberto')) IN ('em_aberto', 'pago_parcial', 'em_andamento', 'aberta', 'aberto', 'pendente') THEN
        v_new_paid := LEAST(v_os.total_value, COALESCE(v_os.paid_value, 0) + v_link_amount);
        
        UPDATE public.patio_os
        SET 
            paid_value = v_new_paid,
            payment_method = COALESCE(payment_method, v_pos.payment_method, 'CARTAO'),
            credit_value = CASE WHEN v_pos.payment_method ILIKE '%credito%' THEN COALESCE(credit_value, 0) + v_link_amount ELSE credit_value END,
            debit_value = CASE WHEN v_pos.payment_method ILIKE '%debito%' THEN COALESCE(debit_value, 0) + v_link_amount ELSE debit_value END,
            status = CASE 
                WHEN v_new_paid >= (v_os.total_value - 0.05) THEN 'finalizada' 
                ELSE 'pago_parcial' 
            END,
            closed_at = CASE 
                WHEN v_new_paid >= (v_os.total_value - 0.05) THEN v_target_date 
                ELSE closed_at 
            END,
            last_payment_date = v_target_date,
            match_status = 'MATCHED',
            updated_at = NOW()
        WHERE id = v_os.id;
    ELSE
        UPDATE public.patio_os
        SET 
            match_status = 'MATCHED',
            updated_at = NOW()
        WHERE id = v_os.id;
    END IF;

    -- 4. Atualização da Transação POS
    UPDATE public.pos_transactions
    SET 
        matched_os_number = v_os.os_number,
        manual_category = 'Recebimento Cartão OS',
        store_id = COALESCE(v_pos.store_id, v_os.store_id, p_store_id)
    WHERE id = v_pos.id;

    -- 5. Registro em conciliation_matches
    INSERT INTO public.conciliation_matches (
        store_id,
        target_date,
        system_os_number,
        rede_transaction_id,
        status,
        divergence_amount
    ) VALUES (
        COALESCE(v_os.store_id, v_pos.store_id, p_store_id),
        v_target_date,
        v_os.os_number,
        v_pos.id,
        'matched_manual',
        0
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Transação Cartão de R$ %s vinculada com sucesso à OS #%s.', v_link_amount, v_os.os_number),
        'pos_id', v_pos.id,
        'os_id', v_os.id,
        'os_number', v_os.os_number,
        'store_id', COALESCE(v_os.store_id, v_pos.store_id, p_store_id)
    );
END;
$$;


-- 3. RPC: unlink_manual_os_match (Desvinculação Segura)
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
    v_os_number TEXT;
BEGIN
    IF p_transaction_id IS NULL THEN
        RAISE EXCEPTION 'ID da transação é obrigatório para desvinculação.';
    END IF;

    IF LOWER(p_transaction_type) = 'ofx' THEN
        SELECT matched_os_number INTO v_os_number 
        FROM public.ofx_transactions 
        WHERE id = p_transaction_id;

        UPDATE public.ofx_transactions
        SET 
            matched_os_number = NULL,
            manual_category = NULL,
            manual_justification = NULL
        WHERE id = p_transaction_id;

        IF p_os_number IS NOT NULL THEN
            UPDATE public.patio_os
            SET 
                matched_ofx_id = NULL,
                match_status = 'UNMATCHED',
                updated_at = NOW()
            WHERE os_number = p_os_number;
        ELSIF v_os_number IS NOT NULL THEN
            UPDATE public.patio_os
            SET 
                matched_ofx_id = NULL,
                match_status = 'UNMATCHED',
                updated_at = NOW()
            WHERE os_number = v_os_number;
        END IF;

        DELETE FROM public.conciliation_matches
        WHERE ofx_transaction_id = p_transaction_id;

    ELSIF LOWER(p_transaction_type) = 'rede' THEN
        SELECT matched_os_number INTO v_os_number 
        FROM public.pos_transactions 
        WHERE id = p_transaction_id;

        UPDATE public.pos_transactions
        SET 
            matched_os_number = NULL,
            manual_category = NULL,
            manual_justification = NULL
        WHERE id = p_transaction_id;

        IF p_os_number IS NOT NULL THEN
            UPDATE public.patio_os
            SET 
                match_status = 'UNMATCHED',
                updated_at = NOW()
            WHERE os_number = p_os_number;
        ELSIF v_os_number IS NOT NULL THEN
            UPDATE public.patio_os
            SET 
                match_status = 'UNMATCHED',
                updated_at = NOW()
            WHERE os_number = v_os_number;
        END IF;

        DELETE FROM public.conciliation_matches
        WHERE rede_transaction_id = p_transaction_id;
    ELSE
        RAISE EXCEPTION 'Tipo de transação inválido: %. Use "ofx" ou "rede".', p_transaction_type;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Desvinculação concluída com sucesso e saldos restaurados.'
    );
END;
$$;
