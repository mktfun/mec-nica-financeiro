-- ============================================================================
-- Migration: 20260909000041_cockpit_pos_triple_reconciliation_brand.sql
-- Spec: 384 - Cockpit de Diagnóstico 360° Pós-Motor (Loja x Valor Líquido x Bandeira)
-- Description:
-- 1. Adiciona colunas brand, expected_credit_date, nsu, authorization_code em pos_transactions
-- 2. Executa backfill inteligente de marcas (Visa, Mastercard, Elo, Hipercard, PIX)
-- 3. Atualiza RPC public.get_store_pos_triple_reconciliation com CTEs por Loja e por Bandeira
--    retornando KPIs estruturados, stores com sub-array de brands e transações sinalizadas.
-- ============================================================================

-- 1. Adicionar colunas na tabela pos_transactions
ALTER TABLE public.pos_transactions 
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS expected_credit_date DATE,
  ADD COLUMN IF NOT EXISTS nsu TEXT,
  ADD COLUMN IF NOT EXISTS authorization_code TEXT;

CREATE INDEX IF NOT EXISTS idx_pos_transactions_brand ON public.pos_transactions (brand);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_target_date ON public.pos_transactions (target_date);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_expected_credit_date ON public.pos_transactions (expected_credit_date);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_settlement_status ON public.pos_transactions (settlement_status);

-- 2. Backfill de marcas e data prevista de crédito
UPDATE public.pos_transactions
SET brand = CASE 
    WHEN LOWER(COALESCE(machine_name, '') || ' ' || COALESCE(payment_method, '')) LIKE '%visa%' THEN 'Visa'
    WHEN LOWER(COALESCE(machine_name, '') || ' ' || COALESCE(payment_method, '')) LIKE '%mast%' THEN 'Mastercard'
    WHEN LOWER(COALESCE(machine_name, '') || ' ' || COALESCE(payment_method, '')) LIKE '%elo%' THEN 'Elo'
    WHEN LOWER(COALESCE(machine_name, '') || ' ' || COALESCE(payment_method, '')) LIKE '%hiper%' THEN 'Hipercard'
    WHEN LOWER(COALESCE(machine_name, '') || ' ' || COALESCE(payment_method, '')) LIKE '%pix%' THEN 'PIX'
    ELSE 'Outras'
END
WHERE brand IS NULL;

UPDATE public.pos_transactions
SET expected_credit_date = CASE
    WHEN LOWER(COALESCE(payment_method, '')) LIKE '%debito%' OR LOWER(COALESCE(payment_method, '')) LIKE '%débito%' THEN
        CASE 
            WHEN EXTRACT(DOW FROM COALESCE(target_date, occurred_at::date)) = 5 THEN (COALESCE(target_date, occurred_at::date) + INTERVAL '3 days')::date
            WHEN EXTRACT(DOW FROM COALESCE(target_date, occurred_at::date)) = 6 THEN (COALESCE(target_date, occurred_at::date) + INTERVAL '2 days')::date
            ELSE (COALESCE(target_date, occurred_at::date) + INTERVAL '1 day')::date
        END
    WHEN LOWER(COALESCE(payment_method, '')) LIKE '%credito%' OR LOWER(COALESCE(payment_method, '')) LIKE '%crédito%' THEN
        (COALESCE(target_date, occurred_at::date) + INTERVAL '30 days')::date
    ELSE
        (COALESCE(target_date, occurred_at::date) + INTERVAL '1 day')::date
END
WHERE expected_credit_date IS NULL;

-- 3. DROP old overloads
DROP FUNCTION IF EXISTS public.get_store_pos_triple_reconciliation(text, text);
DROP FUNCTION IF EXISTS public.get_store_pos_triple_reconciliation(text);
DROP FUNCTION IF EXISTS public.get_store_pos_triple_reconciliation(date);

-- 4. CREATE get_store_pos_triple_reconciliation (Canônica e Consensual)
CREATE OR REPLACE FUNCTION public.get_store_pos_triple_reconciliation(
    p_target_date text DEFAULT NULL,
    p_date text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS 
DECLARE
    v_target_date date;
    v_total_rede_bruto numeric := 0;
    v_total_rede_liquido numeric := 0;
    v_total_rede_taxas numeric := 0;
    v_total_rede_devolucoes numeric := 0;
    v_total_ofx_maquininhas numeric := 0;
    v_total_entrou numeric := 0;
    v_total_nao_entrou numeric := 0;
    v_total_a_compensar numeric := 0;
    v_total_divergente numeric := 0;
    v_taxa_efetiva_global numeric := 0;
    v_status_geral text := 'conforme';
    v_stores_array jsonb := '[]'::jsonb;
    v_by_brand_array jsonb := '[]'::jsonb;
    v_flagged_array jsonb := '[]'::jsonb;
    v_kpis_obj jsonb := '{}'::jsonb;
BEGIN
    v_target_date := COALESCE(p_target_date::date, p_date::date, CURRENT_DATE);

    -- Base de transações normalizada para a data-alvo
    WITH pos_base AS (
        SELECT 
            p.id,
            p.store_id,
            COALESCE(
                p.brand,
                CASE 
                    WHEN LOWER(COALESCE(p.machine_name, '') || ' ' || COALESCE(p.payment_method, '')) LIKE '%visa%' THEN 'Visa'
                    WHEN LOWER(COALESCE(p.machine_name, '') || ' ' || COALESCE(p.payment_method, '')) LIKE '%mast%' THEN 'Mastercard'
                    WHEN LOWER(COALESCE(p.machine_name, '') || ' ' || COALESCE(p.payment_method, '')) LIKE '%elo%' THEN 'Elo'
                    WHEN LOWER(COALESCE(p.machine_name, '') || ' ' || COALESCE(p.payment_method, '')) LIKE '%hiper%' THEN 'Hipercard'
                    WHEN LOWER(COALESCE(p.machine_name, '') || ' ' || COALESCE(p.payment_method, '')) LIKE '%pix%' THEN 'PIX'
                    ELSE 'Outras'
                END
            ) as brand,
            COALESCE(p.payment_method, 'Cartão') as payment_method,
            COALESCE(p.gross_amount, 0) as gross_amount,
            COALESCE(p.net_amount, 0) as net_amount,
            COALESCE(p.fee_amount, 0) as fee_amount,
            COALESCE(p.settlement_status, 'a_compensar') as settlement_status,
            p.matched_os_number,
            p.occurred_at,
            COALESCE(p.transaction_type, 'venda') as transaction_type,
            COALESCE(p.expected_credit_date, v_target_date + INTERVAL '1 day') as expected_credit_date
        FROM public.pos_transactions p
        WHERE COALESCE(p.target_date, p.occurred_at::date) = v_target_date
    ),
    -- Agrupamento por Loja e por Bandeira
    rede_by_store_brand AS (
        SELECT 
            pb.store_id,
            pb.brand,
            COALESCE(SUM(CASE WHEN pb.transaction_type != 'devolucao' THEN pb.gross_amount ELSE 0 END), 0) as bruto,
            COALESCE(SUM(CASE WHEN pb.transaction_type != 'devolucao' THEN pb.net_amount ELSE 0 END), 0) as liquido,
            COALESCE(SUM(CASE WHEN pb.transaction_type != 'devolucao' THEN pb.fee_amount ELSE 0 END), 0) as taxas,
            COALESCE(SUM(CASE WHEN pb.settlement_status = 'entrou' THEN pb.net_amount ELSE 0 END), 0) as entrou,
            COALESCE(SUM(CASE WHEN pb.settlement_status IN ('nao_entrou', 'divergente') THEN pb.net_amount ELSE 0 END), 0) as nao_entrou,
            COALESCE(SUM(CASE WHEN pb.settlement_status = 'a_compensar' THEN pb.net_amount ELSE 0 END), 0) as a_compensar,
            COUNT(*)::int as tx_count,
            CASE 
                WHEN COALESCE(SUM(pb.net_amount), 0) = 0 THEN 'sem_movimento'
                WHEN COALESCE(SUM(CASE WHEN pb.settlement_status = 'entrou' THEN pb.net_amount ELSE 0 END), 0) = COALESCE(SUM(pb.net_amount), 0) THEN 'entrou'
                WHEN COALESCE(SUM(CASE WHEN pb.settlement_status = 'a_compensar' THEN pb.net_amount ELSE 0 END), 0) = COALESCE(SUM(pb.net_amount), 0) THEN 'a_compensar'
                WHEN COALESCE(SUM(CASE WHEN pb.settlement_status = 'entrou' THEN pb.net_amount ELSE 0 END), 0) > 0 THEN 'parcial'
                ELSE 'nao_entrou'
            END as status
        FROM pos_base pb
        GROUP BY pb.store_id, pb.brand
    ),
    -- Agrupamento Consolidado de Bandeiras por Loja
    store_brands_agg AS (
        SELECT 
            store_id,
            jsonb_agg(jsonb_build_object(
                'brand', brand,
                'bruto', bruto,
                'liquido', liquido,
                'taxas', taxas,
                'taxa_efetiva_pct', CASE WHEN bruto > 0 THEN ROUND((taxas / bruto) * 100, 2) ELSE 0 END,
                'entrou', entrou,
                'nao_entrou', nao_entrou,
                'a_compensar', a_compensar,
                'tx_count', tx_count,
                'status', status
            ) ORDER BY liquido DESC) as brands
        FROM rede_by_store_brand
        GROUP BY store_id
    ),
    -- Totais de Vendas Rede por Loja
    rede_store_totals AS (
        SELECT 
            pb.store_id,
            COALESCE(SUM(CASE WHEN pb.transaction_type != 'devolucao' THEN pb.gross_amount ELSE 0 END), 0) as rede_bruto,
            COALESCE(SUM(CASE WHEN pb.transaction_type != 'devolucao' THEN pb.net_amount ELSE 0 END), 0) as rede_liquido,
            COALESCE(SUM(CASE WHEN pb.transaction_type != 'devolucao' THEN pb.fee_amount ELSE 0 END), 0) as rede_taxas,
            COALESCE(SUM(CASE WHEN pb.transaction_type = 'devolucao' THEN ABS(pb.net_amount) ELSE 0 END), 0) as rede_devolucoes,
            COALESCE(SUM(CASE WHEN pb.settlement_status = 'entrou' THEN pb.net_amount ELSE 0 END), 0) as entrou_valor,
            COALESCE(SUM(CASE WHEN pb.settlement_status IN ('nao_entrou', 'divergente') THEN pb.net_amount ELSE 0 END), 0) as nao_entrou_valor,
            COALESCE(SUM(CASE WHEN pb.settlement_status = 'a_compensar' THEN pb.net_amount ELSE 0 END), 0) as a_compensar_valor,
            COUNT(*)::int as total_transacoes,
            COUNT(pb.matched_os_number)::int as transacoes_com_os,
            (COUNT(*) - COUNT(pb.matched_os_number))::int as transacoes_sem_os
        FROM pos_base pb
        GROUP BY pb.store_id
    ),
    -- Créditos de Adquirente no OFX por Loja
    ofx_agg AS (
        SELECT 
            store_id,
            COALESCE(SUM(amount), 0) as ofx_maquininhas,
            jsonb_agg(jsonb_build_object(
                'id', id,
                'amount', amount,
                'fitid', COALESCE(fitid, ''),
                'counterpart', COALESCE(counterpart_name, title, '')
            )) as ofx_transacoes
        FROM public.ofx_transactions
        WHERE target_date = v_target_date 
          AND type = 'in'
          AND (
              counterpart_name ILIKE '%REDE%' 
              OR counterpart_name ILIKE '%REDECARD%'
              OR fitid ILIKE '%REDE%'
              OR fitid ILIKE '%CIELO%'
              OR fitid ILIKE '%STONE%'
              OR fitid ILIKE '%PAGSEGURO%'
              OR title ILIKE '%REDE%'
              OR title ILIKE '%CIELO%'
              OR title ILIKE '%STONE%'
          )
        GROUP BY store_id
    ),
    -- Consolidação de Todas as 10 Lojas Ativas
    store_calc AS (
        SELECT 
            s.id as store_id,
            s.name as store_name,
            COALESCE(r.rede_bruto, 0) as rede_bruto,
            COALESCE(r.rede_liquido, 0) as rede_liquido,
            COALESCE(r.rede_taxas, 0) as rede_taxas,
            COALESCE(r.rede_devolucoes, 0) as rede_devolucoes,
            COALESCE(o.ofx_maquininhas, 0) as ofx_maquininhas,
            COALESCE(r.entrou_valor, 0) as entrou_valor,
            COALESCE(r.nao_entrou_valor, 0) as nao_entrou_valor,
            COALESCE(r.a_compensar_valor, CASE WHEN COALESCE(o.ofx_maquininhas, 0) = 0 THEN COALESCE(r.rede_liquido, 0) ELSE 0 END) as a_compensar_valor,
            ABS(COALESCE(r.rede_liquido, 0) - (COALESCE(o.ofx_maquininhas, 0) + COALESCE(r.a_compensar_valor, 0))) as divergencia_valor,
            COALESCE(r.total_transacoes, 0) as total_transacoes,
            COALESCE(r.transacoes_com_os, 0) as transacoes_com_os,
            COALESCE(r.transacoes_sem_os, 0) as transacoes_sem_os,
            CASE 
                WHEN COALESCE(r.rede_liquido, 0) = 0 AND COALESCE(o.ofx_maquininhas, 0) = 0 THEN 'sem_movimento'
                WHEN ABS(COALESCE(r.rede_liquido, 0) - COALESCE(o.ofx_maquininhas, 0)) < 0.10 THEN 'entrou'
                WHEN COALESCE(o.ofx_maquininhas, 0) > 0 AND COALESCE(o.ofx_maquininhas, 0) < COALESCE(r.rede_liquido, 0) THEN 'parcial'
                WHEN COALESCE(o.ofx_maquininhas, 0) = 0 AND COALESCE(r.rede_liquido, 0) > 0 THEN 'a_compensar'
                ELSE 'divergente'
            END as status_compensacao,
            COALESCE(sb.brands, '[]'::jsonb) as brands,
            COALESCE(o.ofx_transacoes, '[]'::jsonb) as ofx_transacoes
        FROM public.stores s
        LEFT JOIN rede_store_totals r ON r.store_id = s.id
        LEFT JOIN store_brands_agg sb ON sb.store_id = s.id
        LEFT JOIN ofx_agg o ON o.store_id = s.id
        WHERE s.active = true
        ORDER BY s.name
    ),
    -- Visão Consolidada Global por Bandeira
    by_brand_global AS (
        SELECT 
            pb.brand,
            COALESCE(SUM(CASE WHEN pb.transaction_type != 'devolucao' THEN pb.gross_amount ELSE 0 END), 0) as bruto,
            COALESCE(SUM(CASE WHEN pb.transaction_type != 'devolucao' THEN pb.net_amount ELSE 0 END), 0) as liquido,
            COALESCE(SUM(CASE WHEN pb.transaction_type != 'devolucao' THEN pb.fee_amount ELSE 0 END), 0) as taxas,
            COALESCE(SUM(CASE WHEN pb.settlement_status = 'entrou' THEN pb.net_amount ELSE 0 END), 0) as entrou,
            COALESCE(SUM(CASE WHEN pb.settlement_status IN ('nao_entrou', 'divergente') THEN pb.net_amount ELSE 0 END), 0) as nao_entrou,
            COALESCE(SUM(CASE WHEN pb.settlement_status = 'a_compensar' THEN pb.net_amount ELSE 0 END), 0) as a_compensar,
            COUNT(*)::int as tx_count,
            CASE 
                WHEN COALESCE(SUM(pb.net_amount), 0) = 0 THEN 'sem_movimento'
                WHEN COALESCE(SUM(CASE WHEN pb.settlement_status = 'entrou' THEN pb.net_amount ELSE 0 END), 0) = COALESCE(SUM(pb.net_amount), 0) THEN 'entrou'
                WHEN COALESCE(SUM(CASE WHEN pb.settlement_status = 'a_compensar' THEN pb.net_amount ELSE 0 END), 0) = COALESCE(SUM(pb.net_amount), 0) THEN 'a_compensar'
                WHEN COALESCE(SUM(CASE WHEN pb.settlement_status = 'entrou' THEN pb.net_amount ELSE 0 END), 0) > 0 THEN 'parcial'
                ELSE 'nao_entrou'
            END as status
        FROM pos_base pb
        GROUP BY pb.brand
        ORDER BY liquido DESC
    ),
    -- Transações Sinalizadas para Ação Rápida
    flagged_txs AS (
        SELECT 
            pb.id,
            pb.store_id,
            s.name as store_name,
            pb.brand,
            pb.payment_method,
            pb.gross_amount,
            pb.net_amount,
            pb.fee_amount,
            pb.settlement_status,
            pb.matched_os_number,
            pb.occurred_at::text as occurred_at
        FROM pos_base pb
        JOIN public.stores s ON s.id = pb.store_id
        WHERE pb.settlement_status IN ('nao_entrou', 'divergente')
           OR pb.matched_os_number IS NULL
        ORDER BY pb.occurred_at DESC
        LIMIT 50
    )
    SELECT 
        COALESCE(SUM(rede_bruto), 0),
        COALESCE(SUM(rede_liquido), 0),
        COALESCE(SUM(rede_taxas), 0),
        COALESCE(SUM(rede_devolucoes), 0),
        COALESCE(SUM(ofx_maquininhas), 0),
        COALESCE(SUM(entrou_valor), 0),
        COALESCE(SUM(nao_entrou_valor), 0),
        COALESCE(SUM(a_compensar_valor), 0),
        COALESCE(SUM(divergencia_valor), 0),
        jsonb_agg(jsonb_build_object(
            'store_id', store_id,
            'store_name', store_name,
            'rede_bruto', rede_bruto,
            'rede_liquido', rede_liquido,
            'rede_taxas', rede_taxas,
            'rede_devolucoes', rede_devolucoes,
            'total_vendas_rede', rede_liquido,
            'ofx_maquininhas', ofx_maquininhas,
            'entrou_valor', entrou_valor,
            'nao_entrou_valor', nao_entrou_valor,
            'a_compensar_valor', a_compensar_valor,
            'divergencia_valor', divergencia_valor,
            'total_transacoes', total_transacoes,
            'transacoes_com_os', transacoes_com_os,
            'transacoes_sem_os', transacoes_sem_os,
            'status_compensacao', status_compensacao,
            'brands', brands,
            'ofx_transacoes', ofx_transacoes
        ))
    INTO 
        v_total_rede_bruto,
        v_total_rede_liquido,
        v_total_rede_taxas,
        v_total_rede_devolucoes,
        v_total_ofx_maquininhas,
        v_total_entrou,
        v_total_nao_entrou,
        v_total_a_compensar,
        v_total_divergente,
        v_stores_array
    FROM store_calc;

    -- Montagem do by_brand_array
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'brand', brand,
        'bruto', bruto,
        'liquido', liquido,
        'taxas', taxas,
        'taxa_efetiva_pct', CASE WHEN bruto > 0 THEN ROUND((taxas / bruto) * 100, 2) ELSE 0 END,
        'entrou', entrou,
        'nao_entrou', nao_entrou,
        'a_compensar', a_compensar,
        'tx_count', tx_count,
        'status', status
    )), '[]'::jsonb)
    INTO v_by_brand_array
    FROM by_brand_global;

    -- Montagem do flagged_array
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', id,
        'store_id', store_id,
        'store_name', store_name,
        'brand', brand,
        'payment_method', payment_method,
        'gross_amount', gross_amount,
        'net_amount', net_amount,
        'fee_amount', fee_amount,
        'settlement_status', settlement_status,
        'matched_os_number', matched_os_number,
        'occurred_at', occurred_at
    )), '[]'::jsonb)
    INTO v_flagged_array
    FROM flagged_txs;

    -- Cálculo da taxa efetiva global e status
    IF v_total_rede_bruto > 0 THEN
        v_taxa_efetiva_global := ROUND((v_total_rede_taxas / v_total_rede_bruto) * 100, 2);
    ELSE
        v_taxa_efetiva_global := 0;
    END IF;

    IF v_total_divergente > 1.00 THEN
        v_status_geral := 'critico';
    ELSIF v_total_nao_entrou > 0 THEN
        v_status_geral := 'atencao';
    ELSE
        v_status_geral := 'conforme';
    END IF;

    v_kpis_obj := jsonb_build_object(
        'total_rede_bruto', v_total_rede_bruto,
        'total_rede_liquido', v_total_rede_liquido,
        'total_rede_taxas', v_total_rede_taxas,
        'total_rede_devolucoes', v_total_rede_devolucoes,
        'total_ofx_maquininhas', v_total_ofx_maquininhas,
        'total_entrou', v_total_entrou,
        'total_nao_entrou', v_total_nao_entrou,
        'total_a_compensar', v_total_a_compensar,
        'total_divergente', v_total_divergente,
        'taxa_efetiva_global_pct', v_taxa_efetiva_global,
        'status_geral', v_status_geral
    );

    RETURN jsonb_build_object(
        'target_date', v_target_date,
        'kpis', v_kpis_obj,
        'by_brand', v_by_brand_array,
        'stores', COALESCE(v_stores_array, '[]'::jsonb),
        'flagged_transactions', v_flagged_array,
        -- Retrocompatibilidade estrita com código existente:
        'total_rede_bruto', v_total_rede_bruto,
        'total_rede_liquido', v_total_rede_liquido,
        'total_rede_taxas', v_total_rede_taxas,
        'total_rede_devolucoes', v_total_rede_devolucoes,
        'total_devolucoes', v_total_rede_devolucoes,
        'total_ofx_maquininhas', v_total_ofx_maquininhas,
        'total_nao_entrou', v_total_a_compensar
    );
END;
;

-- Overload com DATE para retrocompatibilidade
CREATE OR REPLACE FUNCTION public.get_store_pos_triple_reconciliation(p_target_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS 
BEGIN
    RETURN public.get_store_pos_triple_reconciliation(p_target_date::text, NULL);
END;
;
