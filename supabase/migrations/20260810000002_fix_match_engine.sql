-- Migration: fix_match_engine
-- Created: 20260810000002
-- Specs: match-audit-and-fix
-- Description: Recria a RPC auto_match_transactions com 3 pipelines de pareamento corretos, isolando escopos locais (loja) de escopos globais (ofx/banco)

CREATE OR REPLACE FUNCTION auto_match_transactions(p_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    ofx_record RECORD;
    pos_record RECORD;
    os_record RECORD;
    v_group_record RECORD;
BEGIN
    -- =========================================================================
    -- Pipeline 1: OFX PIX x OS PIX
    -- O OFX é global (store_id pode ser null), procuramos em todas as lojas
    -- =========================================================================
    FOR ofx_record IN 
        SELECT id, amount
        FROM ofx_transactions 
        WHERE occurred_at::date = p_date 
          AND type = 'in'
          AND matched_os_number IS NULL
          AND (bank_name ILIKE '%pix%' OR counterpart_name ILIKE '%pix%')
    LOOP
        SELECT id, os_number
        INTO os_record
        FROM patio_os
        WHERE DATE(closed_at) = p_date
          AND matched_ofx_id IS NULL
          -- Procura o valor no pix_transfer_value, ou fallback pro valor pago se for pix
          AND ABS(COALESCE(pix_transfer_value, CASE WHEN payment_method ILIKE '%pix%' OR payment_method ILIKE '%transfer%' THEN paid_value ELSE 0 END, 0) - ofx_record.amount) < 0.1
        LIMIT 1;

        IF FOUND THEN
            UPDATE patio_os SET matched_ofx_id = ofx_record.id, match_status = 'MATCHED' WHERE id = os_record.id;
            UPDATE ofx_transactions SET matched_os_number = os_record.os_number WHERE id = ofx_record.id;
        END IF;
    END LOOP;

    -- =========================================================================
    -- Pipeline 2: POS Líquido x OFX Rede
    -- O OFX traz o valor líquido depositado de uma vez, mas agrupado pela maquininha de UMA loja
    -- =========================================================================
    FOR v_group_record IN
        SELECT store_id, SUM(net_amount) as total_net
        FROM pos_transactions
        WHERE occurred_at::date = p_date
          AND matched_os_number IS NULL
        GROUP BY store_id
    LOOP
        -- Procurar OFX de Rede que feche com o lote dessa loja, sem checar store_id do OFX (pois OFX é global)
        SELECT id
        INTO ofx_record
        FROM ofx_transactions
        WHERE occurred_at::date = p_date
          AND type = 'in'
          AND matched_os_number IS NULL
          AND ABS(amount - v_group_record.total_net) < 0.1
        LIMIT 1;

        IF FOUND THEN
            -- Amarra as POS da loja ao OFX encontrado
            UPDATE pos_transactions 
            SET matched_os_number = ofx_record.id::text 
            WHERE occurred_at::date = p_date 
              AND matched_os_number IS NULL 
              AND store_id = v_group_record.store_id;

            -- Marca o OFX
            UPDATE ofx_transactions SET matched_os_number = 'BATCH_' || v_group_record.store_id WHERE id = ofx_record.id;
        END IF;
    END LOOP;

    -- =========================================================================
    -- Pipeline 3: POS Bruto x OS Cartão
    -- Maquininha (venda isolada) da loja X contra OS da loja X
    -- =========================================================================
    FOR pos_record IN
        SELECT id, gross_amount, store_id
        FROM pos_transactions
        WHERE occurred_at::date = p_date
          -- Mesmo pareada com OFX no Pipeline 2 (lote), a POS pode e DEVE parear com a OS!
          -- Aqui usaremos uma anotação na OS para referenciar a POS, ou assumir match pelo status
    LOOP
        -- Vamos achar uma OS que não tenha OFX direto, que seja da mesma loja
        SELECT id, os_number
        INTO os_record
        FROM patio_os
        WHERE DATE(closed_at) = p_date
          AND store_id = pos_record.store_id
          AND matched_ofx_id IS NULL
          -- A OS foi paga no cartão, então o valor bruto da POS deve casar com o que foi pago na OS
          AND (payment_method ILIKE '%cart%' OR payment_method ILIKE '%cred%' OR payment_method ILIKE '%deb%')
          AND ABS(COALESCE(paid_value, total_value, 0) - pos_record.gross_amount) < 0.1
        LIMIT 1;

        IF FOUND THEN
            -- Se for match de POS (Rede/Maquininha), gravamos no matched_ofx_id do patio_os o ID da transação POS
            UPDATE patio_os SET matched_ofx_id = pos_record.id, match_status = 'MATCHED_POS' WHERE id = os_record.id;
        END IF;
    END LOOP;

END;
$$;
