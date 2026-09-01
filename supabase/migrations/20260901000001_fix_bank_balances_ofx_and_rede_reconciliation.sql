-- Migration: 20260901000001_fix_bank_balances_ofx_and_rede_reconciliation.sql
-- Objetivo:
-- 1. Eliminar triggers legadas destrutivas que sobrescreviam o bank_total das filiais.
-- 2. Corrigir cálculo de nao_entrou_valor (Rede a compensar) na conciliação tripla sem hardcodes e sem dupla contagem.
-- 3. Atualizar get_daily_reconciliation_summary e get_dashboard_metrics para garantir SSOT contábil absoluto.

-- ============================================================================
-- 1. DROPAR TRIGGERS E FUNÇÕES LEGADAS DESTRUTIVAS
-- ============================================================================
DROP TRIGGER IF EXISTS update_reconciliation_bank_total ON public.transactions;
DROP FUNCTION IF EXISTS public.update_bank_total_from_transactions();

-- ============================================================================
-- 2. RPC: get_store_pos_triple_reconciliation (CANÔNICA E DINÂMICA)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_store_pos_triple_reconciliation(
    p_target_date text DEFAULT CURRENT_DATE::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_date date;
    v_total_rede_bruto numeric := 0;
    v_total_rede_liquido numeric := 0;
    v_total_rede_taxas numeric := 0;
    v_total_rede_devolucoes numeric := 0;
    v_total_ofx_maquininhas numeric := 0;
    v_total_nao_entrou numeric := 0;
    v_stores_array jsonb := '[]'::jsonb;
BEGIN
    v_target_date := COALESCE(p_target_date::date, CURRENT_DATE);

    WITH rede_agg AS (
        SELECT 
            store_id,
            COALESCE(SUM(CASE WHEN transaction_type != 'devolucao' THEN gross_amount ELSE 0 END), 0) as rede_bruto,
            COALESCE(SUM(CASE WHEN transaction_type != 'devolucao' THEN net_amount ELSE 0 END), 0) as rede_liquido,
            COALESCE(SUM(CASE WHEN transaction_type != 'devolucao' THEN fee_amount ELSE 0 END), 0) as rede_taxas,
            COALESCE(SUM(CASE WHEN transaction_type = 'devolucao' THEN ABS(net_amount) ELSE 0 END), 0) as rede_devolucoes
        FROM pos_transactions
        WHERE target_date = v_target_date
        GROUP BY store_id
    ),
    ofx_agg AS (
        SELECT 
            store_id,
            COALESCE(SUM(amount), 0) as ofx_maquininhas
        FROM ofx_transactions
        WHERE target_date = v_target_date 
          AND type = 'in'
          AND (
              counterpart_name ILIKE '%REDE%' 
              OR counterpart_name ILIKE '%REDECARD%'
              OR counterpart_name ILIKE '%CIELO%'
              OR counterpart_name ILIKE '%STONE%'
              OR counterpart_name ILIKE '%PAGSEGURO%'
              OR counterpart_name ILIKE '%GETNET%'
              OR fitid ILIKE '%REDE%'
              OR fitid ILIKE '%CIELO%'
              OR fitid ILIKE '%STONE%'
              OR fitid ILIKE '%PAGSEGURO%'
          )
        GROUP BY store_id
    ),
    store_calc AS (
        SELECT 
            s.id as store_id,
            s.name as store_name,
            COALESCE(r.rede_bruto, 0) as rede_bruto,
            COALESCE(r.rede_liquido, 0) as rede_liquido,
            COALESCE(r.rede_taxas, 0) as rede_taxas,
            COALESCE(r.rede_devolucoes, 0) as rede_devolucoes,
            COALESCE(o.ofx_maquininhas, 0) as ofx_maquininhas,
            -- Cálculo 100% dinâmico sem hardcodes: o que ainda não entrou no banco
            GREATEST(0, COALESCE(r.rede_liquido, 0) - COALESCE(o.ofx_maquininhas, 0)) as nao_entrou_valor,
            CASE 
                WHEN COALESCE(r.rede_liquido, 0) = 0 AND COALESCE(o.ofx_maquininhas, 0) = 0 THEN 'sem_movimento'
                WHEN GREATEST(0, COALESCE(r.rede_liquido, 0) - COALESCE(o.ofx_maquininhas, 0)) = 0 THEN 'entrou'
                ELSE 'a_compensar'
            END as status_compensacao
        FROM stores s
        LEFT JOIN rede_agg r ON r.store_id = s.id
        LEFT JOIN ofx_agg o ON o.store_id = s.id
        WHERE s.active = true
        ORDER BY s.name
    )
    SELECT 
        COALESCE(SUM(rede_bruto), 0),
        COALESCE(SUM(rede_liquido), 0),
        COALESCE(SUM(rede_taxas), 0),
        COALESCE(SUM(rede_devolucoes), 0),
        COALESCE(SUM(ofx_maquininhas), 0),
        COALESCE(SUM(nao_entrou_valor), 0),
        jsonb_agg(jsonb_build_object(
            'store_id', store_id,
            'store_name', store_name,
            'rede_bruto', rede_bruto,
            'rede_liquido', rede_liquido,
            'rede_taxas', rede_taxas,
            'rede_devolucoes', rede_devolucoes,
            'ofx_maquininhas', ofx_maquininhas,
            'nao_entrou_valor', nao_entrou_valor,
            'status_compensacao', status_compensacao
        ))
    INTO 
        v_total_rede_bruto,
        v_total_rede_liquido,
        v_total_rede_taxas,
        v_total_rede_devolucoes,
        v_total_ofx_maquininhas,
        v_total_nao_entrou,
        v_stores_array
    FROM store_calc;

    RETURN jsonb_build_object(
        'target_date', v_target_date,
        'total_rede_bruto', v_total_rede_bruto,
        'total_rede_liquido', v_total_rede_liquido,
        'total_rede_taxas', v_total_rede_taxas,
        'total_rede_devolucoes', v_total_rede_devolucoes,
        'total_ofx_maquininhas', v_total_ofx_maquininhas,
        'total_nao_entrou', v_total_nao_entrou,
        'stores', COALESCE(v_stores_array, '[]'::jsonb)
    );
END;
$$;

-- ============================================================================
-- 3. RPC: get_daily_reconciliation_summary (CANÔNICA 5 PILARES)
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(text, boolean);
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(date, boolean);
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(text);
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(date);
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary();

CREATE OR REPLACE FUNCTION public.get_daily_reconciliation_summary(
    p_date text DEFAULT CURRENT_DATE::text,
    p_force_dynamic boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_date date := COALESCE(p_date::date, CURRENT_DATE);
    v_snapshot daily_snapshots%ROWTYPE;
    v_snapshot_found boolean := false;
    
    -- Métricas de Bancos & Caixa
    v_saldo_bancos numeric := 0;
    v_saldo_bancos_positivo numeric := 0;
    v_saldo_negativo_itau numeric := 0;
    v_dinheiro_lojas numeric := 0;
    v_cartoes_a_compensar numeric := 0;
    v_devolucoes_rede numeric := 0;
    v_total_saldo_banco numeric := 0;
    v_total_saldo_banco_positivo numeric := 0;
    v_dinheiro_mp numeric := 0;
    v_a_receber numeric := 0;
    v_na_loja_os numeric := 0;
    v_caixa_atual numeric := 0;
    v_caixa_anterior numeric := 0;
    v_fluxo_caixa numeric := 0;
    
    -- Métricas de DRE / Faturamento
    v_faturamento_oi_base numeric := 0;
    v_faturamento_ajustes numeric := 0;
    v_faturamento_periodo numeric := 0;
    v_faturamento_anterior numeric := 0;
    v_faturamento_itens jsonb := '[]'::jsonb;
    
    -- Métricas de Contas a Pagar
    v_valor_disp_contas numeric := 0;
    v_contas_base numeric := 0;
    v_contas_extras numeric := 0;
    v_contas_manual numeric := 0;
    v_total_bills numeric := 0;
    v_contas_imported_bills numeric := 0;
    v_juros_rede numeric := 0;
    v_subtotal_contas numeric := 0;
    v_diferenca_final numeric := 0;
    v_status_geral text := 'divergent';
    v_contas_itens jsonb := '[]'::jsonb;
    
    -- Extrato OFX
    v_total_entradas_ofx numeric := 0;
    v_total_saidas_ofx numeric := 0;
    
    -- Conciliação Tripla & Lojas
    v_triple_recon jsonb;
    v_stores_detail jsonb := '[]'::jsonb;
BEGIN
    -- 0. Tenta carregar snapshot existente do dia
    SELECT * INTO v_snapshot FROM daily_snapshots WHERE date = v_target_date;
    IF FOUND THEN
        v_snapshot_found := true;
    END IF;

    -- =========================================================================
    -- RAMAL 1: DIA FECHADO (Snapshot Consolidado e Blindado com is_closed = true)
    -- =========================================================================
    IF NOT p_force_dynamic AND v_snapshot_found AND v_snapshot.is_closed = true THEN
        -- Recalcula saldos do reconciliations da data da fotografia
        SELECT 
            COALESCE(SUM(bank_total), 0),
            COALESCE(SUM(CASE WHEN bank_total > 0 THEN bank_total ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN bank_total < 0 THEN ABS(bank_total) ELSE 0 END), 0)
        INTO v_saldo_bancos, v_saldo_bancos_positivo, v_saldo_negativo_itau
        FROM (
            SELECT DISTINCT ON (store_id) store_id, bank_total
            FROM reconciliations
            WHERE date <= v_target_date
            ORDER BY store_id, date DESC
        ) latest_recons;

        IF v_saldo_bancos = 0 AND v_snapshot.saldo_bancario IS NOT NULL THEN
            v_saldo_bancos := v_snapshot.saldo_bancario;
            v_saldo_bancos_positivo := v_saldo_bancos;
        END IF;

        IF v_snapshot.saldo_negativo_itau IS NOT NULL AND v_snapshot.saldo_negativo_itau > 0 THEN
            v_saldo_negativo_itau := v_snapshot.saldo_negativo_itau;
        END IF;

        v_dinheiro_lojas := COALESCE((v_snapshot.metadata->>'dinheiro_em_lojas')::numeric, 0);
        v_cartoes_a_compensar := COALESCE((v_snapshot.metadata->>'cartoes_a_compensar')::numeric, 0);
        v_devolucoes_rede := COALESCE((v_snapshot.metadata->>'devolucoes_rede')::numeric, 0);
        
        v_total_saldo_banco_positivo := v_saldo_bancos_positivo + v_dinheiro_lojas + v_cartoes_a_compensar - v_devolucoes_rede;
        v_total_saldo_banco := v_saldo_bancos + v_dinheiro_lojas + v_cartoes_a_compensar - v_devolucoes_rede;
        
        v_dinheiro_mp := COALESCE(v_snapshot.dinheiro_mp, 0);
        v_a_receber := COALESCE(v_snapshot.a_receber_manual, 0);
        v_na_loja_os := COALESCE(v_snapshot.total_patio, 0);
        v_caixa_atual := COALESCE(v_snapshot.caixa_atual, 0);
        v_faturamento_oi_base := COALESCE(v_snapshot.faturamento, 0);
        v_juros_rede := COALESCE(v_snapshot.juros_rede, 0);
        
        SELECT COALESCE(caixa_atual, 0), COALESCE(faturamento, 0)
        INTO v_caixa_anterior, v_faturamento_anterior
        FROM daily_snapshots
        WHERE date < v_target_date
        ORDER BY date DESC
        LIMIT 1;

        IF v_faturamento_anterior > 0 AND v_faturamento_oi_base > v_faturamento_anterior THEN
            v_faturamento_periodo := v_faturamento_oi_base - v_faturamento_anterior;
        ELSE
            v_faturamento_periodo := v_faturamento_oi_base;
        END IF;

        v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;
        v_valor_disp_contas := v_faturamento_periodo - v_fluxo_caixa;
        v_contas_base := COALESCE(v_snapshot.contas_a_pagar, 0);
        v_contas_manual := v_contas_base;
        v_subtotal_contas := v_contas_manual + v_juros_rede + v_devolucoes_rede;
        v_diferenca_final := v_valor_disp_contas - v_subtotal_contas;
        
        IF ABS(v_diferenca_final) <= 50.00 THEN
            v_status_geral := 'balanced';
        ELSE
            v_status_geral := 'divergent';
        END IF;

        v_triple_recon := get_store_pos_triple_reconciliation(v_target_date::text);

        RETURN jsonb_build_object(
            'date', v_target_date,
            'is_closed', true,
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
            'na_loja_os', v_na_loja_os,
            'caixa_atual', v_caixa_atual,
            'caixa_anterior', v_caixa_anterior,
            'fluxo_caixa', v_fluxo_caixa,
            'faturamento_oi_base', v_faturamento_oi_base,
            'faturamento_anterior', v_faturamento_anterior,
            'faturamento_ajustes', 0,
            'faturamento_periodo', v_faturamento_periodo,
            'valor_disp_contas', v_valor_disp_contas,
            'contas_base', v_contas_base,
            'contas_extras', 0,
            'contas_manual', v_contas_manual,
            'juros_rede', v_juros_rede,
            'subtotal_contas', v_subtotal_contas,
            'diferenca_final', v_diferenca_final,
            'status_geral', v_status_geral,
            'triple_recon', v_triple_recon
        );
    END IF;

    -- =========================================================================
    -- RAMAL 2: DIA ABERTO / DRAFT (Cálculo Dinâmico Canônico)
    -- =========================================================================

    -- 1. Saldo Bancário Consolidado (10 contas Itaú) - Segrega Positivos e Negativos
    SELECT 
        COALESCE(SUM(bank_total), 0),
        COALESCE(SUM(CASE WHEN bank_total > 0 THEN bank_total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN bank_total < 0 THEN ABS(bank_total) ELSE 0 END), 0)
    INTO v_saldo_bancos, v_saldo_bancos_positivo, v_saldo_negativo_itau
    FROM (
        SELECT DISTINCT ON (store_id) store_id, bank_total
        FROM reconciliations
        WHERE date <= v_target_date
        ORDER BY store_id, date DESC
    ) latest_recons;

    IF v_saldo_bancos = 0 AND v_snapshot.saldo_bancario IS NOT NULL THEN
        v_saldo_bancos := v_snapshot.saldo_bancario;
        v_saldo_bancos_positivo := v_saldo_bancos;
    END IF;

    -- 2. Entradas e Saídas do OFX do dia
    SELECT 
        COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END), 0)
    INTO v_total_entradas_ofx, v_total_saidas_ofx
    FROM ofx_transactions
    WHERE target_date = v_target_date;

    -- 3. Pátio de OSs em aberto
    SELECT COALESCE(SUM(GREATEST(0, COALESCE(total_value, 0) - COALESCE(paid_value, 0))), 0)
    INTO v_na_loja_os
    FROM patio_os
    WHERE opened_at <= (v_target_date || ' 23:59:59')::timestamp
      AND (closed_at IS NULL OR closed_at > (v_target_date || ' 23:59:59')::timestamp)
      AND LOWER(COALESCE(status, 'em_aberto')) NOT IN ('finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado');

    IF v_na_loja_os = 0 AND v_snapshot.total_patio IS NOT NULL THEN
        v_na_loja_os := v_snapshot.total_patio;
    END IF;

    -- 4. Caixa Anterior
    SELECT 
        COALESCE(caixa_atual, 0),
        COALESCE(faturamento, 0)
    INTO v_caixa_anterior, v_faturamento_anterior
    FROM daily_snapshots
    WHERE date < v_target_date
    ORDER BY date DESC
    LIMIT 1;

    IF v_caixa_anterior = 0 AND v_snapshot.metadata->>'caixa_anterior' IS NOT NULL THEN
        v_caixa_anterior := (v_snapshot.metadata->>'caixa_anterior')::numeric;
    END IF;

    -- 5. Faturamento base
    IF v_snapshot.faturamento IS NOT NULL THEN
        IF v_faturamento_anterior > 0 AND v_snapshot.faturamento > v_faturamento_anterior THEN
            v_faturamento_oi_base := v_snapshot.faturamento - v_faturamento_anterior;
        ELSE
            v_faturamento_oi_base := v_snapshot.faturamento;
        END IF;
    ELSE
        v_faturamento_oi_base := 0;
    END IF;

    v_dinheiro_mp := COALESCE(v_snapshot.dinheiro_mp, 0);
    v_a_receber := COALESCE(v_snapshot.a_receber_manual, 0);
    v_juros_rede := COALESCE(v_snapshot.juros_rede, 0);

    -- 6. Ajustes Manuais de Faturamento
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', id,
            'title', title,
            'amount', amount,
            'type', type,
            'description', description
        )), '[]'::jsonb)
    INTO v_faturamento_ajustes, v_faturamento_itens
    FROM daily_revenue_adjustments
    WHERE date = v_target_date;

    v_faturamento_periodo := v_faturamento_oi_base + v_faturamento_ajustes;

    -- 7. Contas a Pagar
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN external_code IS NULL THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN external_code IS NOT NULL THEN amount ELSE 0 END), 0),
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', id,
            'title', title,
            'amount', amount,
            'category', category,
            'is_paid', (payment_date IS NOT NULL),
            'external_code', external_code
        )), '[]'::jsonb)
    INTO v_total_bills, v_contas_extras, v_contas_imported_bills, v_contas_itens
    FROM daily_manual_bills
    WHERE date = v_target_date;

    IF v_contas_imported_bills > 0 THEN
        v_contas_base := v_contas_imported_bills;
    ELSIF v_snapshot.contas_a_pagar IS NOT NULL AND v_snapshot.contas_a_pagar > 0 THEN
        v_contas_base := v_snapshot.contas_a_pagar;
    ELSE
        v_contas_base := 0;
    END IF;

    v_contas_manual := v_contas_base + v_contas_extras;

    -- 8. Conciliação Tripla e Lojas
    v_triple_recon := get_store_pos_triple_reconciliation(v_target_date::text);
    v_cartoes_a_compensar := COALESCE((v_triple_recon->>'total_nao_entrou')::numeric, 0);
    v_devolucoes_rede := COALESCE((v_triple_recon->>'total_rede_devolucoes')::numeric, 0);

    -- 9. Dinheiro em Lojas (Cofre em Trânsito)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_dinheiro_lojas
    FROM store_cash_vault
    WHERE entry_date <= v_target_date
      AND (deposited_at IS NULL OR deposited_at::date > v_target_date)
      AND status IN ('em_transito', 'pending');

    IF v_dinheiro_lojas = 0 AND v_snapshot.metadata->>'dinheiro_em_lojas' IS NOT NULL THEN
        v_dinheiro_lojas := (v_snapshot.metadata->>'dinheiro_em_lojas')::numeric;
    END IF;

    -- 10. Totais Canônicos
    v_total_saldo_banco_positivo := v_saldo_bancos_positivo + v_dinheiro_lojas + v_cartoes_a_compensar - v_devolucoes_rede;
    v_total_saldo_banco := v_saldo_bancos + v_dinheiro_lojas + v_cartoes_a_compensar - v_devolucoes_rede;

    -- Caixa Atual: Ativos Totais - Cheque Especial
    v_caixa_atual := (v_total_saldo_banco_positivo + v_dinheiro_mp + v_a_receber + v_na_loja_os) - v_saldo_negativo_itau;

    v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;
    v_valor_disp_contas := v_faturamento_periodo - v_fluxo_caixa;
    v_subtotal_contas := v_contas_manual + v_juros_rede + v_devolucoes_rede;
    v_diferenca_final := v_valor_disp_contas - v_subtotal_contas;

    IF ABS(v_diferenca_final) <= 50.00 THEN
        v_status_geral := 'balanced';
    ELSE
        v_status_geral := 'divergent';
    END IF;

    -- Detalhe por Loja
    SELECT jsonb_agg(jsonb_build_object(
        'store_id', s.id,
        'store_name', s.name,
        'saldo_banco', COALESCE(r.bank_total, 0),
        'na_loja_os', COALESCE(r.na_loja_os, 0),
        'rede_bruto', COALESCE((t.elem->>'rede_bruto')::numeric, 0),
        'rede_liquido', COALESCE((t.elem->>'rede_liquido')::numeric, 0),
        'rede_taxas', COALESCE((t.elem->>'rede_taxas')::numeric, 0),
        'ofx_maquininhas', COALESCE((t.elem->>'ofx_maquininhas')::numeric, 0),
        'nao_entrou_valor', COALESCE((t.elem->>'nao_entrou_valor')::numeric, 0),
        'status_compensacao', COALESCE(t.elem->>'status_compensacao', 'sem_movimento'),
        'dinheiro_loja', COALESCE(v.vault_amount, 0)
    ))
    INTO v_stores_detail
    FROM stores s
    LEFT JOIN (
        SELECT DISTINCT ON (store_id) store_id, bank_total, na_loja_os
        FROM reconciliations
        WHERE date <= v_target_date
        ORDER BY store_id, date DESC
    ) r ON r.store_id = s.id
    LEFT JOIN (
        SELECT jsonb_array_elements(v_triple_recon->'stores') as elem
    ) t ON (t.elem->>'store_id') = s.id
    LEFT JOIN (
        SELECT store_id, SUM(amount) as vault_amount
        FROM store_cash_vault
        WHERE entry_date <= v_target_date
          AND (deposited_at IS NULL OR deposited_at::date > v_target_date)
          AND status IN ('em_transito', 'pending')
        GROUP BY store_id
    ) v ON v.store_id = s.id
    WHERE s.active = true;

    RETURN jsonb_build_object(
        'date', v_target_date,
        'is_closed', false,
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
        'na_loja_os', v_na_loja_os,
        'caixa_atual', v_caixa_atual,
        'caixa_anterior', v_caixa_anterior,
        'fluxo_caixa', v_fluxo_caixa,
        'faturamento_oi_base', v_faturamento_oi_base,
        'faturamento_anterior', v_faturamento_anterior,
        'faturamento_ajustes', v_faturamento_ajustes,
        'faturamento_periodo', v_faturamento_periodo,
        'valor_disp_contas', v_valor_disp_contas,
        'contas_base', v_contas_base,
        'contas_extras', v_contas_extras,
        'contas_manual', v_contas_manual,
        'juros_rede', v_juros_rede,
        'subtotal_contas', v_subtotal_contas,
        'diferenca_final', v_diferenca_final,
        'status_geral', v_status_geral,
        'total_entradas_ofx', v_total_entradas_ofx,
        'total_saidas_ofx', v_total_saidas_ofx,
        'triple_recon', v_triple_recon,
        'stores', COALESCE(v_stores_detail, '[]'::jsonb),
        'faturamento_itens', COALESCE(v_faturamento_itens, '[]'::jsonb),
        'contas_itens', COALESCE(v_contas_itens, '[]'::jsonb)
    );
END;
$$;

-- ============================================================================
-- 4. RPC: get_dashboard_metrics (ALINHADA 1:1 COM get_daily_reconciliation_summary)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_summary JSONB;
    v_snap_prev RECORD;
    v_snap_prev2 RECORD;
    v_historico JSONB;
BEGIN
    -- Chama a RPC canônica que consolida todos os 5 Pilares
    v_summary := public.get_daily_reconciliation_summary(p_date::text, false);

    -- Histórico Macro dos últimos 7 dias
    SELECT jsonb_agg(row_to_json(sub)) INTO v_historico
    FROM (
        SELECT 
            d.date,
            d.faturamento as total_faturamento,
            d.caixa_atual as total_caixa,
            d.contas_a_pagar as total_contas
        FROM public.daily_snapshots d
        WHERE d.date <= p_date
        ORDER BY d.date DESC
        LIMIT 7
    ) sub;

    RETURN jsonb_build_object(
        'target_date', p_date,
        'total_saldo', (v_summary->>'total_saldo_banco_positivo')::numeric,
        'saldo_bancos_positivo', (v_summary->>'saldo_bancos_positivo')::numeric,
        'saldo_negativo_itau', (v_summary->>'saldo_negativo_itau')::numeric,
        'total_dinheiro', (v_summary->>'dinheiro_mp')::numeric,
        'total_areceber', (v_summary->>'a_receber')::numeric,
        'total_naloja', (v_summary->>'na_loja_os')::numeric,
        'total_cxatual', (v_summary->>'caixa_atual')::numeric,
        'total_cxanterior', (v_summary->>'caixa_anterior')::numeric,
        'total_fluxo', (v_summary->>'fluxo_caixa')::numeric,
        'faturamento_atual', (v_summary->>'faturamento_periodo')::numeric,
        'total_contas', (v_summary->>'subtotal_contas')::numeric,
        'juros_rede', (v_summary->>'juros_rede')::numeric,
        'diferenca', (v_summary->>'diferenca_final')::numeric,
        'status_geral', (v_summary->>'status_geral'),
        'stores', v_summary->'stores',
        'triple_recon', v_summary->'triple_recon',
        'historicoMacro', COALESCE(v_historico, '[]'::jsonb),
        'summary_raw', v_summary
    );
END;
$$;
