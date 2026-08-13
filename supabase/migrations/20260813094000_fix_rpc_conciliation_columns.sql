-- Migration: fix_rpc_conciliation_columns
-- Created: 20260813094000
-- Spec: 180-fix-parsers-and-conciliation-rpc
-- Description: Corrige o erro 42703 (column "description" does not exist) na RPC calculate_daily_conciliation substituindo por counterpart_name e fitid.

-- =========================================================================================
-- 1. calculate_daily_conciliation
-- =========================================================================================
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
    v_has_historical boolean;
    v_historical_na_loja numeric;
    
    v_patio_os_sum numeric;
    v_estoque_os_sum numeric;
BEGIN
    FOR store_record IN SELECT id, name FROM stores LOOP
        -- FIX CARRY-OVER: Buscar do snapshot de conciliação mais recente até a data, não apenas no dia exato.
        SELECT EXISTS(SELECT 1 FROM reconciliations WHERE store_id = store_record.id AND date <= p_date) INTO v_has_historical;
        
        IF v_has_historical THEN
            SELECT COALESCE(bank_total, 0), COALESCE(na_loja_os, NULL) 
            INTO v_faturamento_banco, v_historical_na_loja
            FROM reconciliations 
            WHERE store_id = store_record.id AND date <= p_date
            ORDER BY date DESC
            LIMIT 1;
        ELSE
            v_faturamento_banco := 0;
            v_historical_na_loja := NULL;
        END IF;

        -- Calcula "Maquininha"
        SELECT COALESCE(SUM(amount), 0) INTO v_maquininha
        FROM ofx_transactions 
        WHERE store_id = store_record.id AND target_date = p_date AND type = 'in' AND (counterpart_name ILIKE '%REDE%' OR counterpart_name ILIKE '%MAQUINA%' OR fitid ILIKE '%REDE%' OR fitid ILIKE '%MAQUINA%');
        
        -- Calcula "PIX"
        SELECT COALESCE(SUM(amount), 0) INTO v_pix
        FROM ofx_transactions 
        WHERE store_id = store_record.id AND target_date = p_date AND type = 'in' AND (counterpart_name ILIKE '%PIX%' OR fitid ILIKE '%PIX%');
        
        -- Calcula "Previsto OFX" (Todas as Entradas)
        SELECT COALESCE(SUM(amount), 0) INTO v_previsto_ofx
        FROM ofx_transactions 
        WHERE store_id = store_record.id AND target_date = p_date AND type = 'in';

        -- Calcula "Na Loja OS" (Pátio + Estoque Marco Zero)
        IF v_historical_na_loja IS NOT NULL THEN
            v_na_loja_os := v_historical_na_loja;
        ELSE
            -- Patio OS
            SELECT COALESCE(SUM(COALESCE(total_value, 0) - COALESCE(paid_value, 0)), 0) INTO v_patio_os_sum
            FROM patio_os
            WHERE store_id = store_record.id 
              AND opened_at::date <= p_date
              AND (
                  (COALESCE(total_value, 0) - COALESCE(paid_value, 0)) > 0
                  OR closed_at::date = p_date
                  OR opened_at::date = p_date
              );
              
            -- Estoque OS Pendente (Marco Zero)
            SELECT COALESCE(SUM(valor_os), 0) INTO v_estoque_os_sum
            FROM estoque_os_pendente
            WHERE store_id = store_record.id
              AND status = 'PENDENTE'
              AND data_os <= p_date;
              
            v_na_loja_os := v_patio_os_sum + v_estoque_os_sum;
        END IF;

        v_diferenca := v_previsto_ofx - (v_maquininha + v_pix);
        v_status := CASE WHEN v_diferenca >= -1 THEN 'approved' ELSE 'divergence' END;

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
