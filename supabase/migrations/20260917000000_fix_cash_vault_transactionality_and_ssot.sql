-- ============================================================================
-- Migration: 20260917000000_fix_cash_vault_transactionality_and_ssot.sql
-- Spec: Fix SSOT Conciliação e Cofre
-- ============================================================================

-- 1. RESTRUTURAÇÃO DA RPC dar_baixa_dinheiro COM LOCK TRANSACTIONS (FOR UPDATE)

DROP FUNCTION IF EXISTS public.dar_baixa_dinheiro(uuid, text, text, numeric, date, uuid, text);
DROP FUNCTION IF EXISTS public.dar_baixa_dinheiro(uuid, text, text, date, uuid, text);

CREATE OR REPLACE FUNCTION public.dar_baixa_dinheiro(
    p_vault_id UUID DEFAULT NULL,
    p_os_number TEXT DEFAULT NULL,
    p_store_id TEXT DEFAULT NULL,
    p_amount_to_deposit NUMERIC DEFAULT NULL,
    p_deposit_date DATE DEFAULT CURRENT_DATE,
    p_ofx_id UUID DEFAULT NULL,
    p_user_email TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated_count INT := 0;
    v_target_vault store_cash_vault%ROWTYPE;
    v_remaining NUMERIC;
    v_amount_deposited NUMERIC := 0;
    v_target_store TEXT;
    v_dep_date DATE := COALESCE(p_deposit_date, CURRENT_DATE);
BEGIN
    IF p_vault_id IS NOT NULL THEN
        -- Pessimistic lock
        SELECT * INTO v_target_vault 
        FROM store_cash_vault 
        WHERE id = p_vault_id 
        FOR UPDATE NOWAIT;
        
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Registro de cofre não encontrado ou já processado.');
        END IF;

        IF v_target_vault.status != 'em_transito' AND v_target_vault.status != 'pending' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Item já foi baixado ou possui status inválido.');
        END IF;

        v_target_store := v_target_vault.store_id;

        -- Se for baixa parcial
        IF p_amount_to_deposit IS NOT NULL AND p_amount_to_deposit > 0 AND p_amount_to_deposit < v_target_vault.amount THEN
            v_remaining := v_target_vault.amount - p_amount_to_deposit;
            v_amount_deposited := p_amount_to_deposit;
            
            UPDATE store_cash_vault 
            SET amount = v_remaining
            WHERE id = v_target_vault.id;

            INSERT INTO store_cash_vault (
                store_id, amount, description, entry_date, status, deposited_at, deposited_by, os_number_ref, patio_os_id, matched_ofx_id
            ) VALUES (
                v_target_vault.store_id, p_amount_to_deposit, 
                COALESCE(v_target_vault.description, 'Depósito Caixa Loja') || ' (Baixa Parcial)',
                v_target_vault.entry_date, 'depositado', 
                COALESCE(v_dep_date::timestamptz, now()), p_user_email,
                v_target_vault.os_number_ref, v_target_vault.patio_os_id, p_ofx_id
            );
            v_updated_count := 1;
        ELSE
            -- Baixa total
            v_amount_deposited := COALESCE(p_amount_to_deposit, v_target_vault.amount);
            
            IF p_amount_to_deposit IS NOT NULL AND p_amount_to_deposit > v_target_vault.amount THEN
                 RETURN jsonb_build_object('success', false, 'error', 'Valor de baixa excede o saldo do item no cofre.');
            END IF;

            UPDATE store_cash_vault
            SET status = 'depositado',
                deposited_at = COALESCE(v_dep_date::timestamptz, now()),
                deposited_by = p_user_email,
                matched_ofx_id = COALESCE(p_ofx_id, matched_ofx_id)
            WHERE id = p_vault_id
            RETURNING * INTO v_target_vault;
            v_updated_count := 1;
        END IF;

    ELSIF p_store_id IS NOT NULL AND p_os_number IS NOT NULL THEN
        v_target_store := p_store_id;
        v_amount_deposited := COALESCE(p_amount_to_deposit, 0);

        -- Pessimistic lock
        SELECT * INTO v_target_vault 
        FROM store_cash_vault 
        WHERE store_id = p_store_id AND os_number_ref = p_os_number AND (status = 'em_transito' OR status = 'pending')
        ORDER BY created_at DESC LIMIT 1
        FOR UPDATE NOWAIT;

        IF NOT FOUND THEN
            INSERT INTO store_cash_vault (
                store_id, amount, description, entry_date, status, deposited_at, deposited_by, os_number_ref, matched_ofx_id
            ) VALUES (
                p_store_id, v_amount_deposited,
                'Depósito Dinheiro OS #' || p_os_number,
                v_dep_date,
                'depositado', COALESCE(v_dep_date::timestamptz, now()),
                p_user_email, p_os_number, p_ofx_id
            ) RETURNING * INTO v_target_vault;
            v_updated_count := 1;
        ELSE
            UPDATE store_cash_vault
            SET status = 'depositado',
                deposited_at = COALESCE(v_dep_date::timestamptz, now()),
                deposited_by = p_user_email,
                matched_ofx_id = COALESCE(p_ofx_id, matched_ofx_id)
            WHERE id = v_target_vault.id
            RETURNING * INTO v_target_vault;
            v_updated_count := 1;
        END IF;
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Parâmetros insuficientes para realizar a baixa.');
    END IF;

    IF v_updated_count = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nenhum registro foi atualizado.');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Baixa de dinheiro realizada com sucesso',
        'vault_id', COALESCE(p_vault_id, v_target_vault.id),
        'amount_deposited', v_amount_deposited,
        'new_status', 'depositado'
    );
EXCEPTION
    WHEN lock_not_available THEN
        RETURN jsonb_build_object('success', false, 'error', 'O registro já está sendo processado por outra transação.');
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.dar_baixa_dinheiro TO authenticated, service_role, anon;
