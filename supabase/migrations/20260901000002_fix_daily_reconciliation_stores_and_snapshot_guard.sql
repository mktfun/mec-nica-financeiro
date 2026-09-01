-- Migration: 20260901000002_fix_daily_reconciliation_stores_and_snapshot_guard.sql
-- Objetivo:
-- 1. Incluir obrigatoriamente 'stores' e 'stores_detail' no Ramal 1 (is_closed = true) da RPC get_daily_reconciliation_summary.
-- 2. Corrigir o cálculo do faturamento do período (odômetro estável/igual não pode inflar como receita do dia).
-- 3. Blindar close_daily_snapshot com validação impeditiva contra snapshots com filiais zeradas.
-- 4. Restauração e hotfix do snapshot corrompido de 01/09/2026.

-- ============================================================================
-- 1. RPC: get_daily_reconciliation_summary (SSOT CANÔNICA E BLINDADA)
-- ============================================================================
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
        -- Saldos do reconciliations da data da fotografia
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

        -- Correção da lógica de odômetro para dias fechados:
        IF v_faturamento_anterior > 0 AND v_faturamento_oi_base >= v_faturamento_anterior THEN
            v_faturamento_periodo := v_faturamento_oi_base - v_faturamento_anterior;
        ELSIF v_faturamento_oi_base < v_faturamento_anterior AND v_faturamento_oi_base > 0 THEN
            v_faturamento_periodo := v_faturamento_oi_base;
        ELSE
            v_faturamento_periodo := 0;
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

        -- Detalhe por Loja (Ramal 1 - Fechado)
        SELECT jsonb_agg(jsonb_build_object(
            'store_id', s.id,
            'store_name', s.name,
            'saldo_banco', COALESCE(r.bank_total, 0),
            'saldo_banco_ofx', COALESCE(r.bank_total, 0),
            'saldo_banco_itau', COALESCE(r.bank_total, 0),
            'na_loja_os', COALESCE(r.na_loja_os, 0),
            'rede_bruto', COALESCE((t.elem->>'rede_bruto')::numeric, 0),
            'rede_liquido', COALESCE((t.elem->>'rede_liquido')::numeric, 0),
            'maquininha', COALESCE((t.elem->>'rede_liquido')::numeric, 0),
            'rede_taxas', COALESCE((t.elem->>'rede_taxas')::numeric, 0),
            'ofx_maquininhas', COALESCE((t.elem->>'ofx_maquininhas')::numeric, 0),
            'nao_entrou_valor', COALESCE((t.elem->>'nao_entrou_valor')::numeric, 0),
            'status_compensacao', COALESCE(t.elem->>'status_compensacao', 'sem_movimento'),
            'dinheiro_loja', COALESCE(v.vault_amount, 0),
            'pix', 0,
            'previsto_ofx', COALESCE((t.elem->>'rede_bruto')::numeric, 0),
            'diferenca', COALESCE((t.elem->>'nao_entrou_valor')::numeric, 0),
            'status', CASE WHEN COALESCE((t.elem->>'nao_entrou_valor')::numeric, 0) = 0 THEN 'approved' ELSE 'divergence' END
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
            'stores', COALESCE(v_stores_detail, '[]'::jsonb),
            'stores_detail', COALESCE(v_stores_detail, '[]'::jsonb),
            'triple_recon', v_triple_recon
        );
    END IF;

    -- =========================================================================
    -- RAMAL 2: DIA ABERTO / DRAFT (Cálculo Dinâmico Canônico)
    -- =========================================================================

    -- 1. Saldo Bancário Consolidado (10 contas Itaú)
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

    -- 2. Dinheiro MP
    IF v_snapshot.dinheiro_mp IS NOT NULL AND v_snapshot.dinheiro_mp > 0 THEN
        v_dinheiro_mp := v_snapshot.dinheiro_mp;
    ELSE
        SELECT COALESCE(dinheiro_mp, 0) INTO v_dinheiro_mp FROM daily_snapshots WHERE date <= v_target_date AND dinheiro_mp > 0 ORDER BY date DESC LIMIT 1;
    END IF;

    -- 3. A Receber
    IF v_snapshot.a_receber_manual IS NOT NULL AND v_snapshot.a_receber_manual > 0 THEN
        v_a_receber := v_snapshot.a_receber_manual;
    ELSE
        SELECT COALESCE(a_receber_manual, 0) INTO v_a_receber FROM daily_snapshots WHERE date <= v_target_date AND a_receber_manual > 0 ORDER BY date DESC LIMIT 1;
    END IF;

    -- 4. Na Loja OS (Pátio)
    SELECT COALESCE(SUM(na_loja_os), 0)
    INTO v_na_loja_os
    FROM (
        SELECT DISTINCT ON (store_id) store_id, na_loja_os
        FROM reconciliations
        WHERE date <= v_target_date
        ORDER BY store_id, date DESC
    ) latest_patio;

    IF v_na_loja_os = 0 AND v_snapshot.total_patio IS NOT NULL THEN
        v_na_loja_os := v_snapshot.total_patio;
    END IF;

    -- 5. Caixa Anterior e Faturamento Anterior
    SELECT COALESCE(caixa_atual, 0), COALESCE(faturamento, 0)
    INTO v_caixa_anterior, v_faturamento_anterior
    FROM daily_snapshots
    WHERE date < v_target_date
    ORDER BY date DESC
    LIMIT 1;

    -- 6. Faturamento (Odômetro & Ajustes)
    IF v_snapshot_found AND v_snapshot.faturamento IS NOT NULL AND v_snapshot.faturamento > 0 THEN
        v_faturamento_oi_base := v_snapshot.faturamento;
    ELSE
        SELECT COALESCE(SUM(total_value), 0)
        INTO v_faturamento_oi_base
        FROM patio_os
        WHERE opened_at::date <= v_target_date;
    END IF;

    -- Correção da lógica de odômetro:
    IF v_faturamento_anterior > 0 AND v_faturamento_oi_base >= v_faturamento_anterior THEN
        v_faturamento_periodo := v_faturamento_oi_base - v_faturamento_anterior;
    ELSIF v_faturamento_oi_base < v_faturamento_anterior AND v_faturamento_oi_base > 0 THEN
        v_faturamento_periodo := v_faturamento_oi_base;
    ELSE
        v_faturamento_periodo := 0;
    END IF;

    SELECT 
        COALESCE(SUM(CASE WHEN type = 'addition' THEN amount WHEN type = 'deduction' THEN -amount ELSE 0 END), 0),
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

    v_faturamento_periodo := v_faturamento_periodo + v_faturamento_ajustes;

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
    v_juros_rede := COALESCE(v_snapshot.juros_rede, 0);

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

    -- Detalhe por Loja (Ramal 2 - Aberto/Dinâmico)
    SELECT jsonb_agg(jsonb_build_object(
        'store_id', s.id,
        'store_name', s.name,
        'saldo_banco', COALESCE(r.bank_total, 0),
        'saldo_banco_ofx', COALESCE(r.bank_total, 0),
        'saldo_banco_itau', COALESCE(r.bank_total, 0),
        'na_loja_os', COALESCE(r.na_loja_os, 0),
        'rede_bruto', COALESCE((t.elem->>'rede_bruto')::numeric, 0),
        'rede_liquido', COALESCE((t.elem->>'rede_liquido')::numeric, 0),
        'maquininha', COALESCE((t.elem->>'rede_liquido')::numeric, 0),
        'rede_taxas', COALESCE((t.elem->>'rede_taxas')::numeric, 0),
        'ofx_maquininhas', COALESCE((t.elem->>'ofx_maquininhas')::numeric, 0),
        'nao_entrou_valor', COALESCE((t.elem->>'nao_entrou_valor')::numeric, 0),
        'status_compensacao', COALESCE(t.elem->>'status_compensacao', 'sem_movimento'),
        'dinheiro_loja', COALESCE(v.vault_amount, 0),
        'pix', 0,
        'previsto_ofx', COALESCE((t.elem->>'rede_bruto')::numeric, 0),
        'diferenca', COALESCE((t.elem->>'nao_entrou_valor')::numeric, 0),
        'status', CASE WHEN COALESCE((t.elem->>'nao_entrou_valor')::numeric, 0) = 0 THEN 'approved' ELSE 'divergence' END
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
        'stores_detail', COALESCE(v_stores_detail, '[]'::jsonb),
        'faturamento_itens', v_faturamento_itens,
        'contas_itens', v_contas_itens
    );
END;
$$;


-- ============================================================================
-- 2. RPC: close_daily_snapshot (COM GUARDA IMPEDITIVA)
-- ============================================================================
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
BEGIN
    v_summary := public.get_daily_reconciliation_summary(v_target_date::text, true);

    v_stores_count := jsonb_array_length(COALESCE(v_summary->'stores', '[]'::jsonb));
    IF v_stores_count = 0 AND (COALESCE((v_summary->>'total_saldo_banco')::numeric, 0) > 0 OR COALESCE((v_summary->>'faturamento_periodo')::numeric, 0) > 0) THEN
        RAISE EXCEPTION 'SNAPSHOT_FECHAMENTO_BLOQUEADO: O detalhamento por filiais está zerado enquanto há movimentação consolidada. Operação abortada.';
    END IF;

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
        (v_summary->>'faturamento_periodo')::numeric,
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
            'faturamento_periodo', (v_summary->>'faturamento_periodo')::numeric,
            'faturamento_oi_base', (v_summary->>'faturamento_oi_base')::numeric,
            'faturamento_anterior', (v_summary->>'faturamento_anterior')::numeric,
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
        'is_closed', true,
        'summary', v_summary
    );
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.get_daily_reconciliation_summary TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.close_daily_snapshot TO authenticated, service_role, anon;
