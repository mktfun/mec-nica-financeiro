-- Migration: 20260922000002_fix_resolve_orphan_saida_ofx.sql
-- Spec 430: Atualização de resolve_orphan_saida_ofx para desvinculação atômica e criação de contas extras

CREATE OR REPLACE FUNCTION public.resolve_orphan_saida_ofx(
    p_ofx_id uuid,
    p_category text,
    p_justification text DEFAULT NULL,
    p_contabilizar_no_subtotal boolean DEFAULT false,
    p_store_id text DEFAULT NULL,
    p_amount numeric DEFAULT NULL,
    p_target_date date DEFAULT NULL,
    p_bill_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_bill_id uuid := p_bill_id;
    v_ofx ofx_transactions%ROWTYPE;
    v_prev_is_extra boolean := false;
BEGIN
    SELECT * INTO v_ofx FROM ofx_transactions WHERE id = p_ofx_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Transação OFX não encontrada.');
    END IF;

    -- Modalidade 1: Vínculo explícito a conta existente (p_bill_id passado)
    IF v_bill_id IS NOT NULL THEN
        IF v_ofx.matched_bill_id IS NOT NULL AND v_ofx.matched_bill_id != v_bill_id THEN
            UPDATE daily_manual_bills
            SET matched_ofx_id = NULL,
                match_status = 'unmatched',
                updated_at = now()
            WHERE id = v_ofx.matched_bill_id;
        END IF;

        UPDATE daily_manual_bills
        SET matched_ofx_id = p_ofx_id,
            match_status = 'matched',
            updated_at = now()
        WHERE id = v_bill_id;

        UPDATE ofx_transactions
        SET matched_bill_id = v_bill_id,
            manual_category = p_category,
            manual_justification = p_justification,
            contabilizar_no_subtotal = true,
            match_status = 'matched',
            updated_at = now()
        WHERE id = p_ofx_id;

        RETURN jsonb_build_object('success', true, 'mode', 'linked_existing', 'bill_id', v_bill_id);
    END IF;

    -- Modalidade 2: Adicionar ao Contas a Pagar (Despesa Extra / Manual)
    IF p_contabilizar_no_subtotal THEN
        IF v_ofx.matched_bill_id IS NOT NULL THEN
            SELECT COALESCE(is_extra, false) INTO v_prev_is_extra 
            FROM daily_manual_bills WHERE id = v_ofx.matched_bill_id;

            IF v_prev_is_extra = true THEN
                UPDATE daily_manual_bills
                SET title = COALESCE(NULLIF(p_justification, ''), p_category, title),
                    recipient_name = COALESCE(v_ofx.counterpart_name, recipient_name),
                    category = COALESCE(p_category, category),
                    amount = COALESCE(p_amount, ABS(v_ofx.amount)),
                    contabilizar_no_subtotal = true,
                    is_extra = true,
                    description = p_justification,
                    updated_at = now()
                WHERE id = v_ofx.matched_bill_id;
                v_bill_id := v_ofx.matched_bill_id;
            ELSE
                UPDATE daily_manual_bills
                SET matched_ofx_id = NULL,
                    match_status = 'unmatched',
                    updated_at = now()
                WHERE id = v_ofx.matched_bill_id;
                v_ofx.matched_bill_id := NULL;
            END IF;
        END IF;

        IF v_ofx.matched_bill_id IS NULL THEN
            INSERT INTO daily_manual_bills (
                date,
                store_id,
                title,
                recipient_name,
                amount,
                category,
                description,
                is_extra,
                contabilizar_no_subtotal,
                matched_ofx_id,
                match_status
            ) VALUES (
                COALESCE(p_target_date, v_ofx.target_date, CURRENT_DATE),
                COALESCE(p_store_id, v_ofx.store_id),
                COALESCE(NULLIF(p_justification, ''), p_category, v_ofx.counterpart_name, 'Despesa Extra OFX'),
                COALESCE(v_ofx.counterpart_name, 'Fornecedor Avulso'),
                COALESCE(p_amount, ABS(v_ofx.amount)),
                COALESCE(p_category, 'Outras Despesas'),
                p_justification,
                true,
                true,
                p_ofx_id,
                'matched'
            ) RETURNING id INTO v_bill_id;
        END IF;

        UPDATE ofx_transactions
        SET matched_bill_id = v_bill_id,
            manual_category = p_category,
            manual_justification = p_justification,
            contabilizar_no_subtotal = true,
            match_status = 'matched',
            updated_at = now()
        WHERE id = p_ofx_id;

        RETURN jsonb_build_object('success', true, 'mode', 'created_extra_bill', 'bill_id', v_bill_id);
    END IF;

    -- Modalidade 3: Apenas Justificar (Não-Despesa Operacional / Transferência / Sangria)
    IF v_ofx.matched_bill_id IS NOT NULL THEN
        SELECT COALESCE(is_extra, false) INTO v_prev_is_extra 
        FROM daily_manual_bills WHERE id = v_ofx.matched_bill_id;

        IF v_prev_is_extra = true THEN
            UPDATE daily_manual_bills
            SET contabilizar_no_subtotal = false,
                match_status = 'unmatched',
                matched_ofx_id = NULL,
                updated_at = now()
            WHERE id = v_ofx.matched_bill_id;
        ELSE
            UPDATE daily_manual_bills
            SET matched_ofx_id = NULL,
                match_status = 'unmatched',
                updated_at = now()
            WHERE id = v_ofx.matched_bill_id;
        END IF;
    END IF;

    UPDATE ofx_transactions
    SET manual_category = p_category,
        manual_justification = p_justification,
        contabilizar_no_subtotal = false,
        matched_bill_id = NULL,
        match_status = 'justified',
        updated_at = now()
    WHERE id = p_ofx_id;

    RETURN jsonb_build_object('success', true, 'mode', 'justified_only');
END;
$$;
