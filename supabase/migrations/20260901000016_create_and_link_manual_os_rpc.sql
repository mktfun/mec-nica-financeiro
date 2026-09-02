-- ============================================================================
-- Migration: 20260901000016_create_and_link_manual_os_rpc.sql
-- Description: RPC para criação de nova OS (ou atualização de existente) com 
--              baixa granular de pagamento e vínculo manual a PIX ou REDE.
-- ============================================================================

DROP FUNCTION IF EXISTS public.create_and_link_manual_os(text, uuid, text, text, text, text, numeric, text, numeric);

CREATE OR REPLACE FUNCTION public.create_and_link_manual_os(
    p_transaction_type TEXT,      -- 'ofx' | 'pix' | 'rede'
    p_transaction_id UUID,
    p_store_id TEXT,
    p_os_number TEXT,
    p_client_name TEXT DEFAULT NULL,
    p_plate TEXT DEFAULT NULL,
    p_total_value NUMERIC DEFAULT NULL,
    p_payment_method TEXT DEFAULT NULL,
    p_link_amount NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ofx RECORD;
    v_pos RECORD;
    v_os RECORD;
    v_store_name TEXT;
    v_link_amount NUMERIC;
    v_new_paid NUMERIC;
    v_total_val NUMERIC;
    v_target_date DATE;
    v_clean_os_number TEXT;
    v_method TEXT;
BEGIN
    IF p_transaction_id IS NULL OR p_os_number IS NULL OR p_store_id IS NULL THEN
        RAISE EXCEPTION 'ID de transação, número da OS e filial são obrigatórios.';
    END IF;

    v_clean_os_number := TRIM(p_os_number);

    -- 1. Identificar a filial
    SELECT name INTO v_store_name FROM public.stores WHERE id = p_store_id LIMIT 1;
    IF v_store_name IS NULL THEN
        v_store_name := p_store_id;
    END IF;

    -- 2. Carregar e travar a transação de acordo com o tipo
    IF LOWER(p_transaction_type) IN ('ofx', 'pix') THEN
        SELECT * INTO v_ofx FROM public.ofx_transactions WHERE id = p_transaction_id FOR UPDATE;
        IF v_ofx.id IS NULL THEN
            RAISE EXCEPTION 'Transação OFX/PIX não encontrada (ID: %).', p_transaction_id;
        END IF;
        v_link_amount := COALESCE(p_link_amount, ABS(v_ofx.amount));
        v_target_date := COALESCE(v_ofx.target_date, v_ofx.occurred_at::date, CURRENT_DATE);
        v_method := COALESCE(p_payment_method, 'PIX');
    ELSIF LOWER(p_transaction_type) = 'rede' THEN
        SELECT * INTO v_pos FROM public.pos_transactions WHERE id = p_transaction_id FOR UPDATE;
        IF v_pos.id IS NULL THEN
            RAISE EXCEPTION 'Transação POS/REDE não encontrada (ID: %).', p_transaction_id;
        END IF;
        v_link_amount := COALESCE(p_link_amount, v_pos.net_amount, v_pos.gross_amount);
        v_target_date := COALESCE(v_pos.target_date, v_pos.occurred_at::date, CURRENT_DATE);
        v_method := COALESCE(p_payment_method, v_pos.payment_method, 'CARTAO');
    ELSE
        RAISE EXCEPTION 'Tipo de transação inválido: %. Use "ofx", "pix" ou "rede".', p_transaction_type;
    END IF;

    -- 3. Buscar se a OS já existe para esta filial
    SELECT * INTO v_os 
    FROM public.patio_os 
    WHERE store_id = p_store_id 
      AND TRIM(os_number) = v_clean_os_number
    LIMIT 1
    FOR UPDATE;

    -- 4. Se a OS não existe, cria nova OS
    IF v_os.id IS NULL THEN
        v_total_val := COALESCE(p_total_value, v_link_amount);
        IF v_total_val < v_link_amount THEN
            v_total_val := v_link_amount;
        END IF;

        INSERT INTO public.patio_os (
            store_id,
            store_name,
            os_number,
            client_name,
            plate,
            total_value,
            paid_value,
            pix_transfer_value,
            credit_value,
            debit_value,
            cash_value,
            payment_method,
            status,
            opened_at,
            last_payment_date,
            match_status,
            matched_ofx_id
        ) VALUES (
            p_store_id,
            v_store_name,
            v_clean_os_number,
            COALESCE(TRIM(p_client_name), 'Cliente Avulso'),
            COALESCE(UPPER(TRIM(p_plate)), 'N/I'),
            v_total_val,
            0,
            0, 0, 0, 0,
            v_method,
            'em_aberto',
            (v_target_date::text || ' 12:00:00')::timestamptz,
            v_target_date,
            'PENDENTE',
            CASE WHEN LOWER(p_transaction_type) IN ('ofx', 'pix') THEN v_ofx.id ELSE NULL END
        )
        RETURNING * INTO v_os;
    ELSE
        -- Se a OS já existe, atualiza dados cadastrais se fornecidos
        IF p_client_name IS NOT NULL AND TRIM(p_client_name) <> '' THEN
            UPDATE public.patio_os SET client_name = TRIM(p_client_name) WHERE id = v_os.id;
        END IF;
        IF p_plate IS NOT NULL AND TRIM(p_plate) <> '' THEN
            UPDATE public.patio_os SET plate = UPPER(TRIM(p_plate)) WHERE id = v_os.id;
        END IF;
        IF p_total_value IS NOT NULL AND p_total_value > v_os.total_value THEN
            UPDATE public.patio_os SET total_value = p_total_value WHERE id = v_os.id;
            v_os.total_value := p_total_value;
        END IF;
    END IF;

    -- 5. Aplica o pagamento e atualiza a forma correspondente na OS
    v_new_paid := LEAST(v_os.total_value, COALESCE(v_os.paid_value, 0) + v_link_amount);

    IF LOWER(p_transaction_type) IN ('ofx', 'pix') THEN
        UPDATE public.patio_os
        SET 
            paid_value = v_new_paid,
            payment_method = COALESCE(payment_method, v_method),
            pix_transfer_value = COALESCE(pix_transfer_value, 0) + v_link_amount,
            status = CASE 
                WHEN v_new_paid >= (total_value - 0.05) THEN 'finalizada' 
                ELSE 'pago_parcial' 
            END,
            closed_at = CASE 
                WHEN v_new_paid >= (total_value - 0.05) THEN v_target_date 
                ELSE closed_at 
            END,
            last_payment_date = v_target_date,
            matched_ofx_id = v_ofx.id,
            match_status = 'MATCHED',
            updated_at = NOW()
        WHERE id = v_os.id
        RETURNING * INTO v_os;

        -- Atualiza a transação bancária
        UPDATE public.ofx_transactions
        SET 
            matched_os_number = v_os.os_number,
            manual_category = 'Recebimento OS',
            store_id = p_store_id,
            updated_at = NOW()
        WHERE id = v_ofx.id;

        -- Registra em conciliation_matches
        INSERT INTO public.conciliation_matches (
            store_id,
            target_date,
            system_os_number,
            ofx_transaction_id,
            status,
            divergence_amount
        ) VALUES (
            p_store_id,
            v_target_date,
            v_os.os_number,
            v_ofx.id,
            'matched_manual',
            0
        )
        ON CONFLICT (id) DO NOTHING;

    ELSIF LOWER(p_transaction_type) = 'rede' THEN
        UPDATE public.patio_os
        SET 
            paid_value = v_new_paid,
            payment_method = COALESCE(payment_method, v_method),
            credit_value = CASE 
                WHEN v_method ILIKE '%DEB%' THEN COALESCE(credit_value, 0)
                ELSE COALESCE(credit_value, 0) + v_link_amount
            END,
            debit_value = CASE 
                WHEN v_method ILIKE '%DEB%' THEN COALESCE(debit_value, 0) + v_link_amount
                ELSE COALESCE(debit_value, 0)
            END,
            status = CASE 
                WHEN v_new_paid >= (total_value - 0.05) THEN 'finalizada' 
                ELSE 'pago_parcial' 
            END,
            closed_at = CASE 
                WHEN v_new_paid >= (total_value - 0.05) THEN v_target_date 
                ELSE closed_at 
            END,
            last_payment_date = v_target_date,
            match_status = 'MATCHED',
            updated_at = NOW()
        WHERE id = v_os.id
        RETURNING * INTO v_os;

        -- Atualiza a transação POS/REDE
        UPDATE public.pos_transactions
        SET 
            matched_os_number = v_os.os_number,
            settlement_status = 'entrou',
            store_id = p_store_id,
            manual_category = 'Recebimento Cartão OS',
            updated_at = NOW()
        WHERE id = v_pos.id;

        -- Registra em conciliation_matches
        INSERT INTO public.conciliation_matches (
            store_id,
            target_date,
            system_os_number,
            rede_transaction_id,
            status,
            divergence_amount
        ) VALUES (
            p_store_id,
            v_target_date,
            v_os.os_number,
            v_pos.id,
            'matched_manual',
            0
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('OS #%s processada com sucesso e pagamento de R$ %s vinculado!', v_os.os_number, v_link_amount),
        'os_id', v_os.id,
        'os_number', v_os.os_number,
        'store_id', p_store_id,
        'total_value', v_os.total_value,
        'paid_value', v_os.paid_value,
        'status', v_os.status
    );
END;
$$;

NOTIFY pgrst, 'reload schema';
