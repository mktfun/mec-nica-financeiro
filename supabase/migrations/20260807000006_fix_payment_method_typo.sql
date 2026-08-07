-- Migration: fix_payment_method_typo
-- Created: 20260807000006
-- Specs: 114
-- Description: Correção do erro 42703 (payment_methods does not exist) na RPC calculate_daily_conciliation

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
        -- Faturamento Banco
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

        -- Previsto OFX
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
            v_na_loja_os := v_historical_na_loja;
        ELSE
            SELECT COALESCE(SUM(COALESCE(total_value, 0) - COALESCE(paid_value, 0)), 0) INTO v_na_loja_os
            FROM patio_os
            WHERE store_id = store_record.id AND (status = 'em_aberto' OR status = 'pago_parcial');
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
