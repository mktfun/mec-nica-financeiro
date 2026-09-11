-- Migration: 20260911000042_add_store_balance_aliases_to_rpc.sql
-- Description: Adição dos aliases explícitos saldo_banco_ofx, saldo_banco_itau e dinheiro_loja na subquery v_stores_detail da RPC get_daily_reconciliation_summary.

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
    -- DETALHAMENTO POR LOJA (SPLIT DUAL COM CORREÇÃO CANÔNICA E ALIASES OFX)
    -- =========================================================================
    SELECT 
        COALESCE(jsonb_agg(store_row ORDER BY store_row->>'store_id'), '[]'::jsonb),
        COALESCE(bool_or((store_row->>'status') = 'divergent'), false)
    INTO v_stores_detail, v_has_divergent_stores
    FROM (
        SELECT jsonb_build_object(
            'store_id', s.id,
            'store_name', s.name,
            'saldo_total', COALESCE(bancos.saldo_bancos, 0),
            'saldo_bancos', COALESCE(bancos.saldo_bancos, 0),
            'saldo_banco', COALESCE(bancos.saldo_bancos, 0),
            'saldo_banco_ofx', COALESCE(bancos.saldo_bancos, 0),
            'saldo_banco_itau', COALESCE(bancos.saldo_bancos, 0),
            'saldo_banco_positivo', COALESCE(bancos.saldo_positivo, 0),
            'saldo_negativo_itau', COALESCE(bancos.saldo_negativo, 0),
            'dinheiro_lojas', COALESCE(cofre.saldo_cofre, 0),
            'dinheiro_loja', COALESCE(cofre.saldo_cofre, 0),
            'saldo_patio', COALESCE(patio.saldo_patio, 0),
            'patio_pendente', COALESCE(patio.saldo_patio, 0),
            'rede_total', COALESCE(rede.rede_liquido, 0),
            'nao_entrou_valor', 0,
            'ofx_entradas', COALESCE(ofx_in.total_in, 0),
            'entradas_ofx', COALESCE(ofx_in.total_in, 0),
            'credito_banco', COALESCE(ofx_in.total_in, 0),
            'credito_conciliado', COALESCE(conciliado.total_conciliado, 0),
            'entradas_conciliadas', COALESCE(conciliado.total_conciliado, 0),
            'entradas_dif', (COALESCE(ofx_in.total_in, 0) - COALESCE(conciliado.total_conciliado, 0)),
            'ofx_saidas', COALESCE(ofx_out.total_out, 0),
            'saidas_ofx', COALESCE(ofx_out.total_out, 0),
            'debito_banco', COALESCE(ofx_out.total_out, 0),
            'despesas_pagas', COALESCE(contas.total_contas, 0),
            'saidas_dif', (COALESCE(ofx_out.total_out, 0) - COALESCE(contas.total_contas, 0)),
            'total_entradas', COALESCE(ofx_in.total_in, 0),
            'total_saidas', COALESCE(ofx_out.total_out, 0),
            'divergencia', (COALESCE(ofx_in.total_in, 0) - COALESCE(conciliado.total_conciliado, 0)) + 
                           (COALESCE(ofx_out.total_out, 0) - COALESCE(contas.total_contas, 0)),
            'status', CASE 
                WHEN ABS((COALESCE(ofx_in.total_in, 0) - COALESCE(conciliado.total_conciliado, 0)) + 
                         (COALESCE(ofx_out.total_out, 0) - COALESCE(contas.total_contas, 0))) <= 10.00 THEN 'ok'
                ELSE 'divergent'
            END
        ) AS store_row
        FROM stores s
        LEFT JOIN (
            SELECT 
                store_id, 
                SUM(balance_amount) AS saldo_bancos,
                SUM(CASE WHEN balance_amount > 0 THEN balance_amount ELSE 0 END) AS saldo_positivo,
                SUM(CASE WHEN balance_amount < 0 THEN ABS(balance_amount) ELSE 0 END) AS saldo_negativo
            FROM store_bank_accounts
            WHERE is_active = true
            GROUP BY store_id
        ) bancos ON bancos.store_id = s.id
        LEFT JOIN (
            SELECT store_id, COALESCE(current_balance, 0) AS saldo_cofre
            FROM store_cash_vault
        ) cofre ON cofre.store_id = s.id
        LEFT JOIN (
            SELECT store_id, COALESCE(SUM(remaining_balance), 0) AS saldo_patio
            FROM os_patio_tracking
            WHERE is_completed = false
            GROUP BY store_id
        ) patio ON patio.store_id = s.id
        LEFT JOIN (
            SELECT 
                store_id, 
                COALESCE(SUM(net_amount), 0) AS rede_liquido
            FROM pos_transactions
            WHERE COALESCE(target_date, occurred_at::date) = v_target_date::date
            GROUP BY store_id
        ) rede ON rede.store_id = s.id
        LEFT JOIN (
            SELECT 
                store_id,
                COALESCE(SUM(amount), 0) AS total_in
            FROM ofx_transactions
            WHERE target_date = v_target_date::date AND type = 'in'
            GROUP BY store_id
        ) ofx_in ON ofx_in.store_id = s.id
        LEFT JOIN (
            SELECT 
                store_id,
                COALESCE(SUM(ABS(amount)), 0) AS total_out
            FROM ofx_transactions
            WHERE target_date = v_target_date::date AND type = 'out'
            GROUP BY store_id
        ) ofx_out ON ofx_out.store_id = s.id
        LEFT JOIN (
            SELECT 
                store_id,
                COALESCE(SUM(amount), 0) AS total_conciliado
            FROM ofx_transactions
            WHERE target_date = v_target_date::date 
              AND type = 'in'
              AND (
                  matched_os_number IS NOT NULL 
                  OR match_status IN ('matched', 'matched_batch', 'intercompany_paired')
                  OR (manual_category IS NOT NULL AND manual_category NOT LIKE '%[Apenas Conciliar]%')
              )
            GROUP BY store_id
        ) conciliado ON conciliado.store_id = s.id
        LEFT JOIN (
            SELECT 
                store_id,
                COALESCE(SUM(amount), 0) AS total_contas
            FROM daily_manual_bills
            WHERE date = v_target_date::date AND COALESCE(contabilizar_no_subtotal, true) = true
            GROUP BY store_id
        ) contas ON contas.store_id = s.id
        WHERE s.active = true
    ) sub;

    -- =========================================================================
    -- PILAR 1: SALDOS BANCÁRIOS & CAIXA
    -- =========================================================================
    SELECT 
        COALESCE(SUM(balance_amount), 0),
        COALESCE(SUM(CASE WHEN balance_amount > 0 THEN balance_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN balance_amount < 0 THEN ABS(balance_amount) ELSE 0 END), 0)
    INTO v_saldo_bancos, v_saldo_bancos_positivo, v_saldo_negativo_itau
    FROM store_bank_accounts
    WHERE is_active = true;

    SELECT COALESCE(SUM(current_balance), 0) INTO v_dinheiro_lojas
    FROM store_cash_vault;

    SELECT COALESCE(SUM(net_amount), 0) INTO v_cartoes_a_compensar
    FROM pos_transactions
    WHERE COALESCE(target_date, occurred_at::date) = v_target_date::date
      AND is_voucher = false;

    SELECT COALESCE(SUM(ABS(net_amount)), 0) INTO v_devolucoes_rede
    FROM pos_transactions
    WHERE COALESCE(target_date, occurred_at::date) = v_target_date::date
      AND is_voucher = true;

    v_total_saldo_banco_positivo := v_saldo_bancos_positivo;
    v_total_saldo_banco := v_saldo_bancos;

    -- =========================================================================
    -- PILAR 2 & 3: DINHEIRO MP E A RECEBER
    -- =========================================================================
    IF v_snapshot_found AND NOT p_force_dynamic THEN
        v_dinheiro_mp := COALESCE(v_snapshot.dinheiro_mp, 0);
        v_a_receber := COALESCE(v_snapshot.a_receber_manual, 0);
    ELSE
        SELECT COALESCE(SUM(remaining_balance), 0) INTO v_dinheiro_mp
        FROM os_patio_tracking
        WHERE is_completed = false AND payment_method ILIKE '%dinheiro%';

        v_a_receber := 0;
    END IF;

    -- =========================================================================
    -- PILAR 4: TOTAL PÁTIO (PRODUÇÃO WIP)
    -- =========================================================================
    SELECT COALESCE(SUM(remaining_balance), 0) INTO v_na_loja_os
    FROM os_patio_tracking
    WHERE is_completed = false;

    -- =========================================================================
    -- CAIXA ATUAL & FLUXO DE CAIXA
    -- =========================================================================
    v_caixa_atual := v_total_saldo_banco_positivo + v_dinheiro_mp + v_a_receber + v_na_loja_os;
    v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;

    -- Canal 1: Tesouraria Líquida Real
    v_caixa_tesouraria := v_total_saldo_banco_positivo + v_dinheiro_mp + v_a_receber;
    v_status_tesouraria := CASE 
        WHEN v_caixa_tesouraria >= 0 THEN 'equilibrado' 
        ELSE 'descoberto' 
    END;

    -- Canal 2: Balanço de Produção WIP
    v_patio_wip := v_na_loja_os;
    v_variacao_patio_delta_p4 := v_na_loja_os - v_na_loja_os_anterior;

    -- =========================================================================
    -- FATURAMENTO & DRE (ODÔMETRO + AJUSTES DE RECEITA)
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
    -- CONTAS A PAGAR (INCLUSÃO CANÔNICA DE DESPESAS EXTRAS)
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
        v_contas_manual := v_contas_base + v_contas_extras;
    ELSE
        IF v_contas_imported_bills > 0 THEN
            v_contas_base := v_contas_imported_bills;
        ELSE
            SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_contas_base
            FROM ofx_transactions
            WHERE target_date = v_target_date::date AND type = 'out';
        END IF;
        v_contas_manual := v_contas_base + v_contas_extras;
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
