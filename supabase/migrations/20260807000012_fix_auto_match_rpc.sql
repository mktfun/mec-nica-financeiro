-- =========================================================================
-- O MOTOR DE PAREAMENTO (auto_match_transactions) - V3 (Correção de Colunas)
-- =========================================================================
CREATE OR REPLACE FUNCTION auto_match_transactions(p_date date)
RETURNS void
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
BEGIN
    -- Loop em cada transação OFX de entrada (type = 'in') órfã (matched_os_number IS NULL) do dia
    FOR ofx_record IN 
        SELECT id, amount, store_id, matched_os_number
        FROM ofx_transactions 
        WHERE occurred_at::date = p_date 
          AND type = 'in' 
          AND matched_os_number IS NULL
    LOOP
        v_target_amount := ofx_record.amount;
        v_accumulated := 0;
        v_rede_ids := '{}'::uuid[];

        -- Tentativa 1: Parear com PIX/Transferência nas Ordens de Serviço (Pátio) órfãs
        SELECT id, os_number, COALESCE(pix_transfer_value, paid_value, total_value, 0)
        INTO os_record
        FROM patio_os
        WHERE store_id = ofx_record.store_id 
          AND matched_ofx_id IS NULL
          AND DATE(closed_at) = p_date
          AND ABS(COALESCE(pix_transfer_value, paid_value, total_value, 0) - v_target_amount) < 0.1
        LIMIT 1;

        IF FOUND THEN
            -- Match direto 1:1 com OS (PIX)
            UPDATE patio_os SET matched_ofx_id = ofx_record.id, match_status = 'MATCHED' WHERE id = os_record.id;
            UPDATE ofx_transactions SET matched_os_number = os_record.os_number WHERE id = ofx_record.id;
            CONTINUE; -- Próximo OFX
        END IF;

        -- Tentativa 2: Parear com a Maquininha (Rede) usando cursor para agrupar os recebimentos órfãos
        FOR rede_record IN
            SELECT id, net_amount, matched_os_number 
            FROM pos_transactions 
            WHERE occurred_at::date = p_date 
              AND matched_os_number IS NULL 
              AND store_id = ofx_record.store_id
            ORDER BY net_amount DESC
        LOOP
            v_accumulated := v_accumulated + rede_record.net_amount;
            v_rede_ids := array_append(v_rede_ids, rede_record.id);

            IF ABS(v_accumulated - v_target_amount) < 0.1 THEN
                -- Match encontrado (Grupo Cartão -> 1 OFX)
                UPDATE pos_transactions SET matched_os_number = ofx_record.id::text WHERE id = ANY(v_rede_ids);
                UPDATE ofx_transactions SET matched_os_number = ofx_record.id::text WHERE id = ofx_record.id;
                EXIT; -- Sai do loop da rede e vai para o próximo OFX
            END IF;

            IF v_accumulated > v_target_amount THEN
                -- Passou do valor
                v_accumulated := v_accumulated - rede_record.net_amount;
                v_rede_ids := array_remove(v_rede_ids, rede_record.id);
            END IF;
        END LOOP;

    END LOOP;
END;
$$;
