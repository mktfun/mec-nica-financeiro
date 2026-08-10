-- Migration: fix_conciliation_math_and_duplicates
-- Created: 20260810000003
-- Specs: 148-fix-conciliation-diff
-- Description: Remove duplicatas de pos_transactions, restaura o snapshot de na_loja_os para a RPC calculate_daily_conciliation e reverte a RPC auto_match_transactions para respeitar store_id de OFX.

-- 1. Remoção de Duplicatas de Maquininha (Transações antigas sem hash)
DELETE FROM pos_transactions WHERE dedup_hash IS NULL;

-- 2. Correção de calculate_daily_conciliation
CREATE OR REPLACE FUNCTION calculate_daily_conciliation(p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    store_record RECORD;
    v_faturamento_banco numeric;
    v_maquininha numeric;
    v_pix numeric;
    v_na_loja_os numeric;
    v_previsto_ofx numeric;
    v_diferenca numeric;
    v_status text;
    v_result jsonb := '[]'::jsonb;
    v_historical_na_loja numeric;
    v_has_historical boolean;
BEGIN
    FOR store_record IN SELECT id, name FROM stores LOOP
        -- Checar se existe snapshot histórico nesta data
        SELECT EXISTS(SELECT 1 FROM reconciliations WHERE store_id = store_record.id AND date = p_date) INTO v_has_historical;
        
        IF v_has_historical THEN
            SELECT COALESCE(bank_total, 0), COALESCE(na_loja_os, NULL) 
            INTO v_faturamento_banco, v_historical_na_loja
            FROM reconciliations 
            WHERE store_id = store_record.id AND date = p_date
            LIMIT 1;
        ELSE
            v_faturamento_banco := 0;
            v_historical_na_loja := NULL;
        END IF;

        -- Maquininha: sum of 'in' from rede ou maquininha
        SELECT COALESCE(SUM(gross_amount), COALESCE(SUM(amount), 0)) INTO v_maquininha 
        FROM transactions 
        WHERE store_id = store_record.id AND target_date = p_date AND type = 'in' AND source IN ('rede', 'maquininha');

        -- Previsto OFX (agora confiando no store_id do OFX)
        SELECT COALESCE(SUM(amount), 0) INTO v_previsto_ofx 
        FROM transactions 
        WHERE store_id = store_record.id AND target_date = p_date AND type = 'in' AND source = 'ofx';

        -- PIX: Apenas OS que transitaram no dia, sem coluna fantasma, com nome de coluna correto
        SELECT COALESCE(SUM(
            CASE 
                WHEN COALESCE(pix_transfer_value, 0) > 0 
                THEN COALESCE(pix_transfer_value, 0)
                WHEN payment_method ILIKE '%pix%' OR payment_method ILIKE '%transfer%'
                THEN COALESCE(paid_value, total_value, 0)
                ELSE 0
            END
        ), 0) INTO v_pix
        FROM patio_os
        WHERE store_id = store_record.id 
          AND (opened_at::date = p_date OR closed_at::date = p_date); 

        -- Na Loja OS
        IF v_historical_na_loja IS NOT NULL THEN
            -- Restaura o lastro histórico
            v_na_loja_os := v_historical_na_loja;
        ELSE
            -- Se for o dia de hoje, calcula em tempo real o que de fato resta a pagar nas OS
            SELECT COALESCE(SUM(COALESCE(total_value, 0) - COALESCE(paid_value, 0)), 0) INTO v_na_loja_os
            FROM patio_os
            WHERE store_id = store_record.id 
              AND (opened_at::date = p_date OR closed_at::date = p_date);
        END IF;

        v_diferenca := v_previsto_ofx - (v_maquininha + v_pix);
        v_status := CASE WHEN v_diferenca >= -1 THEN 'approved' ELSE 'divergence' END;

        -- Gravar Snapshot
        INSERT INTO conciliation_daily_logs (
            date, store_id, faturamento_banco, maquininha, pix, na_loja_os, previsto_ofx, diferenca, status
        ) VALUES (
            p_date, store_record.id, v_faturamento_banco, v_maquininha, v_pix, v_na_loja_os, v_previsto_ofx, v_diferenca, v_status
        )
        ON CONFLICT (date, store_id) DO UPDATE SET
            faturamento_banco = EXCLUDED.faturamento_banco,
            maquininha = EXCLUDED.maquininha,
            pix = EXCLUDED.pix,
            na_loja_os = EXCLUDED.na_loja_os,
            previsto_ofx = EXCLUDED.previsto_ofx,
            diferenca = EXCLUDED.diferenca,
            status = EXCLUDED.status,
            updated_at = now();
            
        -- Add to result
        v_result := v_result || jsonb_build_object(
            'store_id', store_record.id,
            'store_name', store_record.name,
            'faturamento_banco', v_faturamento_banco,
            'maquininha', v_maquininha,
            'pix', v_pix,
            'na_loja_os', v_na_loja_os,
            'previsto_ofx', v_previsto_ofx,
            'diferenca', v_diferenca,
            'status', v_status
        );
    END LOOP;
    
    RETURN v_result;
END;
$$;

-- 3. Correção de auto_match_transactions
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
    -- O OFX não é global, procuramos a OS NA MESMA LOJA
    -- =========================================================================
    FOR ofx_record IN 
        SELECT id, amount, store_id
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
          AND store_id = ofx_record.store_id
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
    -- =========================================================================
    FOR v_group_record IN
        SELECT store_id, SUM(net_amount) as total_net
        FROM pos_transactions
        WHERE occurred_at::date = p_date
          AND matched_os_number IS NULL
        GROUP BY store_id
    LOOP
        -- Procurar OFX de Rede que feche com o lote dessa loja, checando o store_id
        SELECT id
        INTO ofx_record
        FROM ofx_transactions
        WHERE occurred_at::date = p_date
          AND type = 'in'
          AND matched_os_number IS NULL
          AND store_id = v_group_record.store_id
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
