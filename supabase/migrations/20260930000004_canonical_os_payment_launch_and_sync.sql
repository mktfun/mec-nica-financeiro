-- Migration: 20260930000004_canonical_os_payment_launch_and_sync.sql
-- Description: RPC canônica para lançamento e edição de pagamentos e total de OS (Spec 456)
--              Atualiza patio_os, os_import_observations, store_cash_vault e recalcula pátio.

CREATE OR REPLACE FUNCTION public.register_or_update_os_payments(
    p_os_id UUID,
    p_total_value NUMERIC,
    p_credit_value NUMERIC DEFAULT 0,
    p_debit_value NUMERIC DEFAULT 0,
    p_pix_transfer_value NUMERIC DEFAULT 0,
    p_cash_value NUMERIC DEFAULT 0,
    p_other_value NUMERIC DEFAULT 0,
    p_payment_method_text TEXT DEFAULT NULL,
    p_target_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_os RECORD;
    v_paid_value NUMERIC;
    v_status TEXT;
    v_payment_method TEXT;
    v_target_date DATE;
    v_cash_diff NUMERIC;
    v_history JSONB;
    v_new_history_entry JSONB;
    v_obs RECORD;
    v_delta_credit NUMERIC;
    v_delta_debit NUMERIC;
    v_delta_pix NUMERIC;
    v_delta_paid NUMERIC;
BEGIN
    -- 1. Buscar a OS existente
    SELECT * INTO v_os FROM public.patio_os WHERE id = p_os_id;
    IF v_os.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Ordem de Serviço não encontrada com o ID informado.'
        );
    END IF;

    -- 2. Normalização e Cálculos
    v_paid_value := COALESCE(p_credit_value, 0) + 
                    COALESCE(p_debit_value, 0) + 
                    COALESCE(p_pix_transfer_value, 0) + 
                    COALESCE(p_cash_value, 0) + 
                    COALESCE(p_other_value, 0);

    IF v_paid_value >= p_total_value - 0.05 AND p_total_value > 0 THEN
        v_status := 'finalizado';
    ELSIF v_paid_value > 0 THEN
        v_status := 'pago_parcial';
    ELSE
        v_status := 'em_aberto';
    END IF;

    v_target_date := COALESCE(p_target_date, CURRENT_DATE);

    -- String canônica de forma de pagamento
    IF p_payment_method_text IS NOT NULL AND btrim(p_payment_method_text) <> '' THEN
        v_payment_method := btrim(p_payment_method_text);
    ELSE
        v_payment_method := CASE 
            WHEN v_paid_value = 0 THEN 'EM_ABERTO'
            WHEN p_credit_value > 0 AND p_pix_transfer_value > 0 THEN format('Credito: %s; PIX: %s', p_credit_value, p_pix_transfer_value)
            WHEN p_credit_value > 0 AND p_debit_value > 0 THEN format('Credito: %s; Debito: %s', p_credit_value, p_debit_value)
            WHEN p_credit_value > 0 THEN format('Credito: %s', p_credit_value)
            WHEN p_debit_value > 0 THEN format('Debito: %s', p_debit_value)
            WHEN p_pix_transfer_value > 0 THEN format('PIX: %s', p_pix_transfer_value)
            WHEN p_cash_value > 0 THEN format('Dinheiro: %s', p_cash_value)
            ELSE 'Outros'
        END;
    END IF;

    -- Montar histórico de alteração
    v_history := COALESCE(v_os.history_log, '[]'::jsonb);
    IF jsonb_typeof(v_history) <> 'array' THEN
        v_history := '[]'::jsonb;
    END IF;

    v_new_history_entry := jsonb_build_object(
        'date', NOW()::text,
        'action', 'manual_payment_launch',
        'changes', jsonb_build_object(
            'old_total', v_os.total_value,
            'new_total', p_total_value,
            'old_paid', v_os.paid_value,
            'new_paid', v_paid_value,
            'old_status', v_os.status,
            'new_status', v_status,
            'credit_value', p_credit_value,
            'debit_value', p_debit_value,
            'pix_transfer_value', p_pix_transfer_value,
            'cash_value', p_cash_value
        )
    );
    v_history := v_history || jsonb_build_array(v_new_history_entry);

    -- 3. Atualizar patio_os
    UPDATE public.patio_os
    SET total_value = p_total_value,
        paid_value = v_paid_value,
        credit_value = p_credit_value,
        debit_value = p_debit_value,
        pix_transfer_value = p_pix_transfer_value,
        cash_value = p_cash_value,
        payment_method = v_payment_method,
        status = v_status,
        last_payment_date = v_target_date,
        history_log = v_history,
        updated_at = NOW()
    WHERE id = p_os_id;

    -- 4. Upsert em os_import_observations para habilitar o Matcher da conciliação imediatamente
    IF v_os.store_id IS NOT NULL AND v_os.os_number IS NOT NULL THEN
        SELECT * INTO v_obs 
        FROM public.os_import_observations 
        WHERE store_id = v_os.store_id 
          AND target_date = v_target_date 
          AND os_number = v_os.os_number;

        v_delta_credit := p_credit_value;
        v_delta_debit := p_debit_value;
        v_delta_pix := p_pix_transfer_value;
        v_delta_paid := v_paid_value;

        INSERT INTO public.os_import_observations (
            store_id,
            os_number,
            target_date,
            credit_before,
            credit_after,
            delta_credit,
            debit_before,
            debit_after,
            delta_debit,
            pix_before,
            pix_after,
            delta_pix,
            paid_before,
            paid_after,
            delta_paid,
            total_value,
            status,
            client_name,
            plate
        ) VALUES (
            v_os.store_id,
            v_os.os_number,
            v_target_date,
            COALESCE(v_obs.credit_before, 0),
            p_credit_value,
            v_delta_credit,
            COALESCE(v_obs.debit_before, 0),
            p_debit_value,
            v_delta_debit,
            COALESCE(v_obs.pix_before, 0),
            p_pix_transfer_value,
            v_delta_pix,
            COALESCE(v_obs.paid_before, 0),
            v_paid_value,
            v_delta_paid,
            p_total_value,
            v_status,
            v_os.client_name,
            v_os.plate
        )
        ON CONFLICT (store_id, target_date, os_number) DO UPDATE
        SET credit_after = EXCLUDED.credit_after,
            delta_credit = EXCLUDED.delta_credit,
            debit_after = EXCLUDED.debit_after,
            delta_debit = EXCLUDED.delta_debit,
            pix_after = EXCLUDED.pix_after,
            delta_pix = EXCLUDED.delta_pix,
            paid_after = EXCLUDED.paid_after,
            delta_paid = EXCLUDED.delta_paid,
            total_value = EXCLUDED.total_value,
            status = EXCLUDED.status,
            updated_at = NOW();
    END IF;

    -- 5. Se houver Dinheiro (cash_value > 0), sincroniza cofre (store_cash_vault) se necessário
    v_cash_diff := COALESCE(p_cash_value, 0) - COALESCE(v_os.cash_value, 0);
    IF v_cash_diff > 0.05 AND v_os.store_id IS NOT NULL THEN
        INSERT INTO public.store_cash_vault (
            store_id,
            amount,
            description,
            entry_date,
            status,
            os_number_ref,
            patio_os_id
        ) VALUES (
            v_os.store_id,
            v_cash_diff,
            format('Lançamento Dinheiro OS #%s', v_os.os_number),
            v_target_date,
            'em_transito',
            v_os.os_number,
            v_os.id
        );
    END IF;

    -- 6. Recalcular pátio para sincronizar reconciliations e daily_snapshots
    IF v_os.store_id IS NOT NULL THEN
        BEGIN
            PERFORM public.recompute_patio_for_date_and_store(v_target_date, v_os.store_id);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'os_id', v_os.id,
        'os_number', v_os.os_number,
        'store_id', v_os.store_id,
        'total_value', p_total_value,
        'paid_value', v_paid_value,
        'open_balance', GREATEST(0, p_total_value - v_paid_value),
        'status', v_status,
        'credit_value', p_credit_value,
        'debit_value', p_debit_value,
        'pix_transfer_value', p_pix_transfer_value,
        'cash_value', p_cash_value,
        'payment_method', v_payment_method
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_or_update_os_payments TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_or_update_os_payments TO anon;
