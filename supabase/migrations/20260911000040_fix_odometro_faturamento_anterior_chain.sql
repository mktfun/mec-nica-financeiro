-- Migration: 20260911000040_fix_odometro_faturamento_anterior_chain.sql
-- Description: Correção definitiva do encadeamento do odômetro e faturamento anterior nas RPCs get_daily_reconciliation_summary e close_daily_snapshot + saneamento dos snapshots de setembro/2026.

-- 1. ATUALIZAÇÃO DA RPC CANÔNICA get_daily_reconciliation_summary
CREATE OR REPLACE FUNCTION public.get_daily_reconciliation_summary(
    p_date text,
    p_force_dynamic boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_date text := p_date;
    v_snapshot record;
    v_prev_snapshot record;
    v_snapshot_found boolean := false;
    
    -- Pilares
    v_saldo_bancos numeric := 0;
    v_saldo_bancos_positivo numeric := 0;
    v_saldo_negativo_itau numeric := 0;
    v_dinheiro_lojas numeric := 0;
    v_cartoes_a_compensar numeric := 0;
    v_devolucoes_rede numeric := 0;
    v_total_saldo_banco_positivo numeric := 0;
    v_total_saldo_banco numeric := 0;
    v_dinheiro_mp numeric := 0;
    v_a_receber numeric := 0;
    v_na_loja_os numeric := 0;
    v_na_loja_os_anterior numeric := 0;
    v_caixa_atual numeric := 0;
    v_caixa_anterior numeric := 0;
    v_fluxo_caixa numeric := 0;
    
    -- Canal 1: Tesouraria Líquida Real
    v_caixa_tesouraria numeric := 0;
    v_status_tesouraria text := 'equilibrado';
    
    -- Canal 2: Balanço de Produção WIP & Neutralização Temporal
    v_patio_wip numeric := 0;
    v_variacao_patio_delta_p4 numeric := 0;
    
    -- DRE & Odômetro
    v_odometro_atual numeric := 0;
    v_faturamento_oi_base numeric := 0;
    v_faturamento_anterior numeric := 0;
    v_faturamento_ajustes numeric := 0;
    v_faturamento_periodo numeric := 0;
    v_faturamento_itens jsonb := '[]'::jsonb;
    v_valor_disp_contas numeric := 0;
    
    -- Contas
    v_contas_base numeric := 0;
    v_contas_extras numeric := 0;
    v_contas_manual numeric := 0;
    v_contas_imported_bills numeric := 0;
    v_subtotal_contas numeric := 0;
    v_juros_rede numeric := 0;
    v_total_bills numeric := 0;
    v_contas_itens jsonb := '[]'::jsonb;
    
    -- Diferença e Lojas
    v_diferenca_final numeric := 0;
    v_status_geral text := 'divergent';
    v_stores_detail jsonb := '[]'::jsonb;
    v_has_divergent_stores boolean := false;
    v_fast_path_eligible boolean := false;
BEGIN
    -- 1. Busca snapshot do dia
    SELECT * INTO v_snapshot FROM daily_snapshots WHERE date = v_target_date::date LIMIT 1;
    IF FOUND THEN
        v_snapshot_found := true;
    END IF;

    -- 2. Busca snapshot anterior com precedência canônica do odômetro
    SELECT * INTO v_prev_snapshot 
    FROM daily_snapshots 
    WHERE date < v_target_date::date 
    ORDER BY date DESC 
    LIMIT 1;
    
    IF FOUND THEN
        v_caixa_anterior := COALESCE(v_prev_snapshot.caixa_atual, 0);
        v_faturamento_anterior := COALESCE(
            (v_prev_snapshot.metadata->>'odometro_hoje')::numeric,
            (v_prev_snapshot.metadata->>'faturamento_anterior')::numeric,
            v_prev_snapshot.faturamento,
            0
        );
        v_na_loja_os_anterior := COALESCE(v_prev_snapshot.total_patio, 0);
    ELSE
        v_caixa_anterior := 0;
        v_faturamento_anterior := 0;
        v_na_loja_os_anterior := 0;
    END IF;

    -- =========================================================================
    -- DETALHAMENTO POR LOJA (SPLIT DUAL COM CORREÇÃO CANÔNICA)
    -- =========================================================================
    WITH stores_list AS (
        SELECT id, name FROM stores WHERE COALESCE(active, true) = true
    ),
    rede_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(gross_amount), 0) as rede_bruto,
            COALESCE(SUM(net_amount), 0) as rede_liquido,
            COALESCE(SUM(fee_amount), 0) as rede_taxas,
            COALESCE(SUM(CASE WHEN transaction_type = 'devolucao' THEN gross_amount ELSE 0 END), 0) as rede_devolucoes
        FROM pos_transactions
        WHERE COALESCE(target_date, occurred_at::date) = v_target_date::date
        GROUP BY TRIM(store_id::text)
    ),
    ofx_entradas_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(amount), 0) as ofx_entradas_total,
            COALESCE(SUM(CASE 
                WHEN manual_category ILIKE '%REDE%' 
                  OR counterpart_name ILIKE '%REDE%' 
                  OR counterpart_name ILIKE '%CARD%' 
                  OR bank_name ILIKE '%REDE%' 
                  OR bank_name ILIKE '%CARD%' 
                THEN amount ELSE 0 
            END), 0) as ofx_maquininhas,
            COALESCE(SUM(CASE 
                WHEN (matched_os_number IS NOT NULL OR manual_category = 'PIX / Recebimento OS')
                 AND NOT (
                     counterpart_name ILIKE '%REDE%' 
                     OR counterpart_name ILIKE '%CARD%' 
                     OR counterpart_name ILIKE '%CIELO%' 
                     OR counterpart_name ILIKE '%STONE%' 
                     OR counterpart_name ILIKE '%PAGSEGURO%'
                     OR bank_name ILIKE '%REDE%' 
                     OR bank_name ILIKE '%CARD%'
                 )
                THEN amount ELSE 0 
            END), 0) as pix_total,
            COALESCE(SUM(CASE 
                WHEN manual_category IS NOT NULL 
                 AND manual_category NOT IN ('PIX / Recebimento OS', 'REDE')
                 AND NOT (
                     counterpart_name ILIKE '%REDE%' 
                     OR counterpart_name ILIKE '%CARD%' 
                     OR counterpart_name ILIKE '%CIELO%' 
                     OR counterpart_name ILIKE '%STONE%' 
                     OR counterpart_name ILIKE '%PAGSEGURO%'
                     OR bank_name ILIKE '%REDE%' 
                     OR bank_name ILIKE '%CARD%'
                 )
                THEN amount ELSE 0 
            END), 0) as entradas_justificadas,
            COALESCE(SUM(CASE 
                WHEN matched_os_number IS NULL 
                 AND manual_category IS NULL 
                 AND NOT (
                     counterpart_name ILIKE '%REDE%' 
                     OR counterpart_name ILIKE '%CARD%' 
                     OR counterpart_name ILIKE '%CIELO%' 
                     OR counterpart_name ILIKE '%STONE%' 
                     OR counterpart_name ILIKE '%PAGSEGURO%'
                     OR bank_name ILIKE '%REDE%' 
                     OR bank_name ILIKE '%CARD%'
                 )
                THEN amount ELSE 0 
            END), 0) as entradas_orfas
        FROM ofx_transactions
        WHERE target_date = v_target_date::date AND type = 'in'
        GROUP BY TRIM(store_id::text)
    ),
    ofx_saidas_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(ABS(amount)), 0) as ofx_saidas_total,
            COALESCE(SUM(CASE 
                WHEN matched_bill_id IS NOT NULL 
                  OR manual_category IS NOT NULL 
                  OR match_status IN ('matched', 'matched_batch', 'intercompany_paired', 'auto_cancelled') 
                THEN ABS(amount) ELSE 0 
            END), 0) as saidas_conciliadas,
            COALESCE(SUM(CASE 
                WHEN matched_bill_id IS NULL 
                 AND manual_category IS NULL 
                 AND (match_status IS NULL OR match_status = 'unmatched') 
                THEN ABS(amount) ELSE 0 
            END), 0) as saidas_orfas
        FROM ofx_transactions
        WHERE target_date = v_target_date::date AND type = 'out'
        GROUP BY TRIM(store_id::text)
    ),
    bills_store_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(amount), 0) as contas_loja_total
        FROM daily_manual_bills
        WHERE date = v_target_date::date AND COALESCE(contabilizar_no_subtotal, true) = true
        GROUP BY TRIM(store_id::text)
    ),
    recon_today AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            bank_total,
            na_loja_os
        FROM reconciliations
        WHERE date = v_target_date::date
    ),
    recon_latest AS (
        SELECT DISTINCT ON (TRIM(store_id::text))
            TRIM(store_id::text) as store_id,
            bank_total,
            na_loja_os
        FROM reconciliations
        WHERE date <= v_target_date::date
        ORDER BY TRIM(store_id::text), date DESC
    ),
    patio_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(total_value - paid_value), 0) as patio_total
        FROM patio_os
        WHERE (status ILIKE '%aberto%' OR status ILIKE '%parcial%' OR status ILIKE '%pendente%' OR status = 'ABERTA' OR status = 'PENDENTE')
          AND opened_at::date <= v_target_date::date
        GROUP BY TRIM(store_id::text)
    ),
    vault_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(amount), 0) as vault_total
        FROM store_cash_vault
        WHERE entry_date = v_target_date::date
        GROUP BY TRIM(store_id::text)
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'store_id', s.id,
        'store_name', s.name,
        'saldo_banco', COALESCE(rt.bank_total, rl.bank_total, 0),
        'saldo_banco_itau', COALESCE(rt.bank_total, rl.bank_total, 0),
        'saldo_bancos_positivo', CASE WHEN COALESCE(rt.bank_total, rl.bank_total, 0) > 0 THEN COALESCE(rt.bank_total, rl.bank_total, 0) ELSE 0 END,
        'saldo_negativo_itau', CASE WHEN COALESCE(rt.bank_total, rl.bank_total, 0) < 0 THEN ABS(COALESCE(rt.bank_total, rl.bank_total, 0)) ELSE 0 END,
        'maquininha', COALESCE(rd.rede_liquido, 0),
        'rede_bruto', COALESCE(rd.rede_bruto, 0),
        'rede_liquido', COALESCE(rd.rede_liquido, 0),
        'devolucoes_rede', COALESCE(rd.rede_devolucoes, 0),
        'dinheiro_loja', COALESCE(v.vault_total, 0),
        'pix', COALESCE(oe.pix_total, 0),
        'pix_total', COALESCE(oe.pix_total, 0),
        'ofx_entradas_total', COALESCE(oe.ofx_entradas_total, 0),
        'ofx_maquininhas', COALESCE(oe.ofx_maquininhas, 0),
        'entradas_justificadas', COALESCE(oe.entradas_justificadas, 0),
        'entradas_orfas', COALESCE(oe.entradas_orfas, 0),
        'entradas_conciliadas', (COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0) + COALESCE(oe.entradas_justificadas, 0)),
        'dif_entradas', (COALESCE(oe.ofx_entradas_total, 0) - (COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0) + COALESCE(oe.entradas_justificadas, 0))),
        'ofx_saidas_total', COALESCE(sofx.ofx_saidas_total, 0),
        'saidas_justificadas', COALESCE(sofx.saidas_conciliadas, 0),
        'saidas_orfas', COALESCE(sofx.saidas_orfas, 0),
        'contas_loja_total', COALESCE(bst.contas_loja_total, 0),
        'contas_conciliadas', COALESCE(sofx.saidas_conciliadas, 0),
        'dif_saidas', COALESCE(sofx.saidas_orfas, 0),
        'diferenca_saidas', COALESCE(sofx.saidas_orfas, 0),
        'na_loja_os', COALESCE(rt.na_loja_os, p.patio_total, rl.na_loja_os, 0),
        'patio_os', COALESCE(rt.na_loja_os, p.patio_total, rl.na_loja_os, 0),
        'diferenca_total', (COALESCE(oe.ofx_entradas_total, 0) - (COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0) + COALESCE(oe.entradas_justificadas, 0))) - COALESCE(sofx.saidas_orfas, 0),
        'diferenca', (COALESCE(oe.ofx_entradas_total, 0) - (COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0) + COALESCE(oe.entradas_justificadas, 0))) - COALESCE(sofx.saidas_orfas, 0),
        'status', CASE 
            WHEN ABS(COALESCE(oe.ofx_entradas_total, 0) - (COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0) + COALESCE(oe.entradas_justificadas, 0))) <= 0.05 
             AND ABS(COALESCE(sofx.saidas_orfas, 0)) <= 0.05 THEN 'approved' 
            ELSE 'divergence' 
        END
    )), '[]'::jsonb) INTO v_stores_detail
    FROM stores_list s
    LEFT JOIN rede_agg rd ON rd.store_id = s.id
    LEFT JOIN ofx_entradas_agg oe ON oe.store_id = s.id
    LEFT JOIN ofx_saidas_agg sofx ON sofx.store_id = s.id
    LEFT JOIN bills_store_agg bst ON bst.store_id = s.id
    LEFT JOIN recon_today rt ON rt.store_id = s.id
    LEFT JOIN recon_latest rl ON rl.store_id = s.id
    LEFT JOIN patio_agg p ON p.store_id = s.id
    LEFT JOIN vault_agg v ON v.store_id = s.id;

    -- Avalia se há lojas divergentes
    SELECT EXISTS(
        SELECT 1 FROM jsonb_array_elements(v_stores_detail) elem 
        WHERE elem->>'status' = 'divergence'
    ) INTO v_has_divergent_stores;

    -- =========================================================================
    -- APURAÇÃO DOS 5 PILARES E ARQUITETURA BICANAL
    -- =========================================================================
    -- 1. Saldos Bancários
    SELECT 
        COALESCE(SUM(bank_total), 0),
        COALESCE(SUM(CASE WHEN bank_total > 0 THEN bank_total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN bank_total < 0 THEN ABS(bank_total) ELSE 0 END), 0)
    INTO v_saldo_bancos, v_saldo_bancos_positivo, v_saldo_negativo_itau
    FROM reconciliations
    WHERE date = v_target_date::date;

    IF v_saldo_bancos = 0 AND v_snapshot_found THEN
        v_saldo_bancos := COALESCE(v_snapshot.saldo_bancario, 0);
        v_saldo_bancos_positivo := COALESCE(v_snapshot.saldo_bancario, 0);
        v_saldo_negativo_itau := COALESCE(v_snapshot.saldo_negativo_itau, 0);
    END IF;

    -- 2. Dinheiro em Lojas e Maquininhas
    SELECT COALESCE(SUM(amount), 0) INTO v_dinheiro_lojas
    FROM store_cash_vault
    WHERE entry_date = v_target_date::date;

    SELECT 
        COALESCE(SUM(net_amount), 0),
        COALESCE(SUM(CASE WHEN transaction_type = 'devolucao' THEN gross_amount ELSE 0 END), 0)
    INTO v_cartoes_a_compensar, v_devolucoes_rede
    FROM pos_transactions
    WHERE COALESCE(target_date, occurred_at::date) = v_target_date::date;

    v_total_saldo_banco_positivo := v_saldo_bancos_positivo + v_dinheiro_lojas + v_cartoes_a_compensar - v_devolucoes_rede;
    v_total_saldo_banco := v_saldo_bancos;

    -- 3. Ativos Operacionais
    IF v_snapshot_found THEN
        v_dinheiro_mp := COALESCE(v_snapshot.dinheiro_mp, 0);
        v_a_receber := COALESCE(v_snapshot.a_receber_manual, 0);
    ELSE
        v_dinheiro_mp := 0;
        v_a_receber := 0;
    END IF;

    -- Pátio Ativo (WIP)
    SELECT COALESCE(SUM(total_value - paid_value), 0) INTO v_na_loja_os
    FROM patio_os
    WHERE (status ILIKE '%aberto%' OR status ILIKE '%parcial%' OR status ILIKE '%pendente%' OR status = 'ABERTA' OR status = 'PENDENTE')
      AND opened_at::date <= v_target_date::date;

    IF (v_na_loja_os = 0 OR v_na_loja_os IS NULL) AND v_snapshot_found THEN
        v_na_loja_os := COALESCE(v_snapshot.total_patio, 0);
    END IF;

    -- CANAL 1: TESOURARIA LÍQUIDA REAL (Sem WIP Pátio)
    v_caixa_tesouraria := (v_saldo_bancos_positivo + v_dinheiro_lojas + v_dinheiro_mp) - v_saldo_negativo_itau;
    v_status_tesouraria := CASE WHEN v_caixa_tesouraria >= 0 THEN 'equilibrado' ELSE 'descoberto' END;

    -- CANAL 2: PRODUÇÃO WIP & NEUTRALIZAÇÃO TEMPORAL (ΔP4)
    v_patio_wip := v_na_loja_os;
    v_variacao_patio_delta_p4 := v_na_loja_os - v_na_loja_os_anterior;

    -- Caixa Atual Consolidado (5 Pilares Canônicos)
    IF v_snapshot_found AND v_snapshot.is_closed AND NOT p_force_dynamic THEN
        v_caixa_atual := v_snapshot.caixa_atual;
    ELSE
        v_caixa_atual := (v_total_saldo_banco_positivo + v_dinheiro_mp + v_a_receber + v_na_loja_os) - v_saldo_negativo_itau;
    END IF;

    v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;

    -- =========================================================================
    -- FATURAMENTO DRE COM RECEITAS EXTRAS & PRECEDÊNCIA CANÔNICA DO ODÔMETRO
    -- =========================================================================
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', id,
            'title', title,
            'description', description,
            'amount', amount,
            'store_id', store_id
        )), '[]'::jsonb)
    INTO v_faturamento_ajustes, v_faturamento_itens
    FROM daily_revenue_adjustments
    WHERE date = v_target_date::date;

    IF v_snapshot_found THEN
        v_odometro_atual := COALESCE(
            (v_snapshot.metadata->>'odometro_hoje')::numeric,
            v_snapshot.faturamento,
            0
        );
        IF v_odometro_atual > 0 AND v_faturamento_anterior > 0 AND v_odometro_atual >= v_faturamento_anterior THEN
            v_faturamento_oi_base := v_odometro_atual - v_faturamento_anterior;
        ELSIF (v_snapshot.metadata->>'faturamento_oi_base')::numeric > 0 THEN
            v_faturamento_oi_base := (v_snapshot.metadata->>'faturamento_oi_base')::numeric;
        ELSE
            v_faturamento_oi_base := v_odometro_atual;
        END IF;
    ELSE
        SELECT COALESCE(SUM(gross_amount), 0) INTO v_faturamento_oi_base
        FROM pos_transactions
        WHERE COALESCE(target_date, occurred_at::date) = v_target_date::date;
        
        v_odometro_atual := CASE 
            WHEN v_faturamento_anterior > 0 AND v_faturamento_oi_base > 0 THEN v_faturamento_anterior + v_faturamento_oi_base 
            ELSE v_faturamento_oi_base 
        END;
    END IF;

    v_faturamento_periodo := v_faturamento_oi_base + v_faturamento_ajustes;
    v_valor_disp_contas := v_faturamento_periodo - v_fluxo_caixa;

    -- =========================================================================
    -- CONTAS A PAGAR
    -- =========================================================================
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN category IN ('Pró-Labore', 'Distribuição Lucros', 'Extra') OR title ILIKE '%Pró-Labore%' OR title ILIKE '%Extra%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN category NOT IN ('Pró-Labore', 'Distribuição Lucros', 'Extra') AND title NOT ILIKE '%Pró-Labore%' AND title NOT ILIKE '%Extra%' THEN amount ELSE 0 END), 0),
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', id,
            'title', title,
            'description', description,
            'amount', amount,
            'store_id', store_id,
            'category', category,
            'is_paid', (payment_date IS NOT NULL OR match_status = 'matched' OR matched_ofx_id IS NOT NULL),
            'external_code', external_code,
            'contabilizar_no_subtotal', COALESCE(contabilizar_no_subtotal, true)
        )), '[]'::jsonb)
    INTO v_total_bills, v_contas_extras, v_contas_imported_bills, v_contas_itens
    FROM daily_manual_bills
    WHERE date = v_target_date::date AND COALESCE(contabilizar_no_subtotal, true) = true;

    SELECT COALESCE(SUM(fee_amount), 0) INTO v_juros_rede
    FROM pos_transactions
    WHERE COALESCE(target_date, occurred_at::date) = v_target_date::date;

    IF v_snapshot_found AND v_snapshot.contas_a_pagar > 0 AND NOT p_force_dynamic THEN
        v_contas_base := v_snapshot.contas_a_pagar;
        v_contas_manual := v_snapshot.contas_a_pagar;
    ELSE
        IF v_contas_imported_bills > 0 THEN
            v_contas_base := v_contas_imported_bills;
        ELSE
            SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_contas_base
            FROM ofx_transactions
            WHERE target_date = v_target_date::date AND type = 'out';
        END IF;
        v_contas_manual := v_contas_base;
    END IF;

    v_subtotal_contas := v_contas_manual + v_juros_rede;
    v_diferenca_final := v_valor_disp_contas - v_subtotal_contas;

    IF v_snapshot_found AND v_snapshot.is_closed THEN
        v_status_geral := COALESCE(v_snapshot.metadata->>'status_geral', 'approved');
        IF v_status_geral = 'approved' AND v_has_divergent_stores THEN
            v_status_geral := 'divergent';
        END IF;
    ELSE
        v_status_geral := CASE 
            WHEN ABS(v_diferenca_final) <= 50.00 AND NOT v_has_divergent_stores THEN 'approved' 
            ELSE 'divergent' 
        END;
    END IF;

    v_fast_path_eligible := (ABS(v_diferenca_final) <= 50.00 AND NOT v_has_divergent_stores);

    RETURN jsonb_build_object(
        'date', v_target_date,
        'is_closed', COALESCE(v_snapshot.is_closed, false),
        'saldo_bancos_ofx', v_saldo_bancos,
        'saldo_bancos_positivo', v_saldo_bancos_positivo,
        'saldo_negativo_itau', v_saldo_negativo_itau,
        'dinheiro_lojas', v_dinheiro_lojas,
        'cartoes_a_compensar', v_cartoes_a_compensar,
        'devolucoes_rede', v_devolucoes_rede,
        'total_saldo_banco_positivo', v_total_saldo_banco_positivo,
        'total_saldo_banco', v_total_saldo_banco,
        'dinheiro_mp', v_dinheiro_mp,
        'a_receber', v_a_receber,
        'a_receber_manual', v_a_receber,
        'na_loja_os', v_na_loja_os,
        'total_patio', v_na_loja_os,
        'caixa_atual', v_caixa_atual,
        'caixa_anterior', v_caixa_anterior,
        'fluxo_caixa', v_fluxo_caixa,
        'odometro_hoje', v_odometro_atual,
        'faturamento_oi_base', v_faturamento_oi_base,
        'faturamento_anterior', v_faturamento_anterior,
        'faturamento_ajustes', v_faturamento_ajustes,
        'faturamento_periodo', v_faturamento_periodo,
        'faturamento', v_faturamento_periodo,
        'valor_disp_contas', v_valor_disp_contas,
        'contas_base', v_contas_base,
        'contas_extras', v_contas_extras,
        'contas_manual', v_contas_manual,
        'contas_a_pagar', v_subtotal_contas,
        'juros_rede', v_juros_rede,
        'subtotal_contas', v_subtotal_contas,
        'v_subtotal_contas', v_subtotal_contas,
        'diferenca_final', v_diferenca_final,
        'status_geral', v_status_geral,
        'faturamento_itens', v_faturamento_itens,
        'contas_itens', v_contas_itens,
        'stores_detail', v_stores_detail,
        'stores', v_stores_detail,
        -- Extensões Bicanais (Spec 359)
        'caixa_tesouraria', v_caixa_tesouraria,
        'status_tesouraria', v_status_tesouraria,
        'patio_wip', v_patio_wip,
        'variacao_patio_delta_p4', v_variacao_patio_delta_p4,
        'fast_path_eligible', v_fast_path_eligible
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_daily_reconciliation_summary(text, boolean) TO authenticated, service_role, anon;

-- 2. ATUALIZAÇÃO DA RPC CANÔNICA close_daily_snapshot
CREATE OR REPLACE FUNCTION public.close_daily_snapshot(
    p_date text,
    p_notes text DEFAULT 'Fechamento homologado via Central de Conciliação',
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_date date := COALESCE(p_date::date, CURRENT_DATE);
    v_summary jsonb;
    v_stores_count int;
    v_odometro_hoje numeric;
    v_faturamento_anterior numeric;
    v_faturamento_oi_base numeric;
    v_faturamento_periodo numeric;
    v_faturamento_final numeric;
BEGIN
    v_summary := public.get_daily_reconciliation_summary(v_target_date::text, true);

    v_stores_count := jsonb_array_length(COALESCE(v_summary->'stores', '[]'::jsonb));
    IF v_stores_count = 0 AND (COALESCE((v_summary->>'total_saldo_banco')::numeric, 0) > 0 OR COALESCE((v_summary->>'faturamento_periodo')::numeric, 0) > 0) THEN
        RAISE EXCEPTION 'SNAPSHOT_FECHAMENTO_BLOQUEADO: O detalhamento por filiais está zerado enquanto há movimentação consolidada. Operação abortada.';
    END IF;

    -- Extrai métricas canônicas
    v_faturamento_anterior := COALESCE((v_summary->>'faturamento_anterior')::numeric, 0);
    v_faturamento_oi_base := COALESCE((v_summary->>'faturamento_oi_base')::numeric, 0);
    v_faturamento_periodo := COALESCE((v_summary->>'faturamento_periodo')::numeric, 0);

    v_odometro_hoje := COALESCE(
        (p_metadata->>'odometro_hoje')::numeric,
        (v_summary->>'odometro_hoje')::numeric,
        (CASE WHEN v_faturamento_anterior > 0 AND v_faturamento_oi_base > 0 THEN v_faturamento_anterior + v_faturamento_oi_base ELSE NULL END),
        v_faturamento_periodo,
        0
    );

    -- Na coluna física faturamento, grava o odômetro acumulado oficial do mês (ou o faturamento_periodo se não houver odômetro)
    v_faturamento_final := CASE 
        WHEN v_odometro_hoje > 0 THEN v_odometro_hoje 
        ELSE v_faturamento_periodo 
    END;

    INSERT INTO public.daily_snapshots (
        date,
        caixa_atual,
        faturamento,
        dinheiro_mp,
        total_recebiveis,
        total_patio,
        saldo_bancario,
        a_receber_manual,
        contas_a_pagar,
        saldo_negativo_itau,
        juros_rede,
        is_closed,
        closed_at,
        notes,
        metadata,
        updated_at
    ) VALUES (
        v_target_date,
        (v_summary->>'caixa_atual')::numeric,
        v_faturamento_final,
        (v_summary->>'dinheiro_mp')::numeric,
        COALESCE((v_summary->>'dinheiro_mp')::numeric, 0) + COALESCE((v_summary->>'a_receber')::numeric, 0),
        (v_summary->>'na_loja_os')::numeric,
        (v_summary->>'saldo_bancos_ofx')::numeric,
        (v_summary->>'a_receber')::numeric,
        (v_summary->>'contas_manual')::numeric,
        (v_summary->>'saldo_negativo_itau')::numeric,
        (v_summary->>'juros_rede')::numeric,
        true,
        NOW(),
        p_notes,
        jsonb_build_object(
            'saldo_bancos_ofx', (v_summary->>'saldo_bancos_ofx')::numeric,
            'saldo_bancos_positivo', (v_summary->>'saldo_bancos_positivo')::numeric,
            'saldo_negativo_itau', (v_summary->>'saldo_negativo_itau')::numeric,
            'dinheiro_em_lojas', (v_summary->>'dinheiro_lojas')::numeric,
            'cartoes_a_compensar', (v_summary->>'cartoes_a_compensar')::numeric,
            'devolucoes_rede', (v_summary->>'devolucoes_rede')::numeric,
            'dinheiro_mp', (v_summary->>'dinheiro_mp')::numeric,
            'a_receber', (v_summary->>'a_receber')::numeric,
            'total_patio', (v_summary->>'na_loja_os')::numeric,
            'caixa_atual', (v_summary->>'caixa_atual')::numeric,
            'caixa_anterior', (v_summary->>'caixa_anterior')::numeric,
            'fluxo_caixa', (v_summary->>'fluxo_caixa')::numeric,
            'faturamento_periodo', v_faturamento_periodo,
            'faturamento_oi_base', v_faturamento_oi_base,
            'faturamento_anterior', v_faturamento_anterior,
            'odometro_hoje', v_odometro_hoje,
            'valor_disp_contas', (v_summary->>'valor_disp_contas')::numeric,
            'contas_base', (v_summary->>'contas_base')::numeric,
            'contas_manual', (v_summary->>'contas_manual')::numeric,
            'subtotal_contas', (v_summary->>'subtotal_contas')::numeric,
            'diferenca_final', (v_summary->>'diferenca_final')::numeric,
            'status_geral', (v_summary->>'status_geral'),
            'stores', v_summary->'stores',
            'triple_recon', v_summary->'triple_recon',
            'is_closed', true
        ) || p_metadata,
        NOW()
    )
    ON CONFLICT (date) DO UPDATE SET
        caixa_atual = EXCLUDED.caixa_atual,
        faturamento = EXCLUDED.faturamento,
        dinheiro_mp = EXCLUDED.dinheiro_mp,
        total_recebiveis = EXCLUDED.total_recebiveis,
        total_patio = EXCLUDED.total_patio,
        saldo_bancario = EXCLUDED.saldo_bancario,
        a_receber_manual = EXCLUDED.a_receber_manual,
        contas_a_pagar = EXCLUDED.contas_a_pagar,
        saldo_negativo_itau = EXCLUDED.saldo_negativo_itau,
        juros_rede = EXCLUDED.juros_rede,
        is_closed = true,
        closed_at = NOW(),
        notes = EXCLUDED.notes,
        metadata = EXCLUDED.metadata,
        updated_at = NOW();

    RETURN jsonb_build_object(
        'success', true,
        'date', v_target_date,
        'faturamento_final', v_faturamento_final,
        'odometro_hoje', v_odometro_hoje,
        'faturamento_anterior', v_faturamento_anterior,
        'faturamento_oi_base', v_faturamento_oi_base
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_daily_snapshot(text, text, jsonb) TO authenticated, service_role, anon;

-- 3. SANEAMENTO DOS REGISTROS HISTÓRICOS DE SETEMBRO/2026
-- Em 09/09: Odômetro oficial acumulado R$ 235.023,20
UPDATE daily_snapshots
SET 
    faturamento = 235023.20,
    metadata = jsonb_set(
        jsonb_set(metadata, '{odometro_hoje}', '235023.20'::jsonb),
        '{faturamento_anterior}', '170092.47'::jsonb
    )
WHERE date = '2026-09-09';

-- Em 10/09: Odômetro oficial acumulado R$ 281.317,68 com anterior R$ 235.023,20
UPDATE daily_snapshots
SET 
    faturamento = 281317.68,
    metadata = jsonb_set(
        jsonb_set(metadata, '{odometro_hoje}', '281317.68'::jsonb),
        '{faturamento_anterior}', '235023.20'::jsonb
    )
WHERE date = '2026-09-10';
