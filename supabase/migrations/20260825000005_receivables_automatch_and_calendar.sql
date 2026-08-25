-- Migration 20260825000005_receivables_automatch_and_calendar.sql
-- Adiciona suporte a match automático de Boletos e Transferências Bancárias com extrato OFX

-- 1. Índices de alta velocidade para Recebíveis
CREATE INDEX IF NOT EXISTS idx_receivables_os_inst ON public.receivables (store_id, os_number, installment);
CREATE INDEX IF NOT EXISTS idx_receivables_type_due ON public.receivables (store_id, type, due_date, status);
CREATE INDEX IF NOT EXISTS idx_receivables_matched_ofx ON public.receivables (matched_ofx_id);

-- 2. RPC de Auto-Match de Recebíveis com Transações OFX
CREATE OR REPLACE FUNCTION public.auto_match_receivables(
    p_store_id text DEFAULT NULL,
    p_date date DEFAULT NULL
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
    FOR r_ofx IN 
        SELECT id, store_id, target_date, amount, counterpart_name, fitid
        FROM public.ofx_transactions
        WHERE type = 'in'
          AND (p_store_id IS NULL OR store_id = p_store_id)
          AND (p_date IS NULL OR target_date = p_date)
          AND matched_os_number IS NULL
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
