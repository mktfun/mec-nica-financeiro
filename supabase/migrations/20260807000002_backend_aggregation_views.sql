-- Migration: backend_aggregation_views
-- Created: 20260807000002
-- Description: RPCs analiticas para delegar calculos de reducao do Frontend (Spec 110/095)

-- 1. Resumo de Recebiveis
CREATE OR REPLACE FUNCTION get_receivables_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb := '[]'::jsonb;
    store_record RECORD;
    v_total_pendente numeric;
    v_total_vencido numeric;
    v_count_pendente integer;
    v_count_vencido integer;
BEGIN
    FOR store_record IN SELECT id, name FROM stores LOOP
        SELECT 
            COALESCE(SUM(CASE WHEN due_date >= CURRENT_DATE THEN value ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN due_date < CURRENT_DATE THEN value ELSE 0 END), 0),
            COUNT(CASE WHEN due_date >= CURRENT_DATE THEN 1 END),
            COUNT(CASE WHEN due_date < CURRENT_DATE THEN 1 END)
        INTO 
            v_total_pendente, v_total_vencido, v_count_pendente, v_count_vencido
        FROM receivables
        WHERE store_id = store_record.id AND status = 'pendente';
        
        v_result := v_result || jsonb_build_object(
            'store_id', store_record.id,
            'store_name', store_record.name,
            'total_pendente', v_total_pendente,
            'total_vencido', v_total_vencido,
            'count_pendente', v_count_pendente,
            'count_vencido', v_count_vencido
        );
    END LOOP;
    
    RETURN v_result;
END;
$$;

-- 2. Resumo de Pátio
CREATE OR REPLACE FUNCTION get_patio_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb := '[]'::jsonb;
    store_record RECORD;
    v_total_aberto numeric;
    v_veiculos_count integer;
BEGIN
    FOR store_record IN SELECT id, name FROM stores LOOP
        SELECT 
            COALESCE(SUM(COALESCE(total_value, 0) - COALESCE(paid_value, 0)), 0),
            COUNT(*)
        INTO 
            v_total_aberto, v_veiculos_count
        FROM patio_os
        WHERE store_id = store_record.id AND status IN ('em_aberto', 'pago_parcial');
        
        v_result := v_result || jsonb_build_object(
            'store_id', store_record.id,
            'store_name', store_record.name,
            'total_aberto', v_total_aberto,
            'veiculos_count', v_veiculos_count
        );
    END LOOP;
    
    RETURN v_result;
END;
$$;

-- 3. Estatísticas Financeiras da Loja
CREATE OR REPLACE FUNCTION get_store_financial_stats(p_store_id uuid, p_start_date date, p_end_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_entradas numeric;
    v_total_saidas numeric;
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO v_total_entradas
    FROM transactions
    WHERE store_id = p_store_id AND target_date >= p_start_date AND target_date <= p_end_date AND type = 'in';

    SELECT ABS(COALESCE(SUM(amount), 0)) INTO v_total_saidas
    FROM transactions
    WHERE store_id = p_store_id AND target_date >= p_start_date AND target_date <= p_end_date AND type = 'out';

    RETURN jsonb_build_object(
        'store_id', p_store_id,
        'start_date', p_start_date,
        'end_date', p_end_date,
        'total_entradas', v_total_entradas,
        'total_saidas', v_total_saidas
    );
END;
$$;
