-- Migration: 20260916000001_enhance_store_cash_vault_and_rpc.sql
-- Description: Extensão de store_cash_vault para suportar saídas e despesas,
-- vínculo com contas a pagar sem OFX, índices de performance e atualização canônica
-- da RPC get_daily_reconciliation_summary com isolamento estrito de snapshots.

-- 1. Extensões de Schema para store_cash_vault
ALTER TABLE public.store_cash_vault
  ADD COLUMN IF NOT EXISTS entry_type text DEFAULT 'entrada',
  ADD COLUMN IF NOT EXISTS expense_category text,
  ADD COLUMN IF NOT EXISTS paid_to text,
  ADD COLUMN IF NOT EXISTS bill_id uuid REFERENCES public.daily_manual_bills(id) ON DELETE SET NULL;

-- 2. Extensão para daily_manual_bills
ALTER TABLE public.daily_manual_bills
  ADD COLUMN IF NOT EXISTS matched_cash_vault_id uuid REFERENCES public.store_cash_vault(id) ON DELETE SET NULL;

-- 3. Índices de performance
CREATE INDEX IF NOT EXISTS idx_store_cash_vault_lookup 
  ON public.store_cash_vault (entry_date, store_id, status);

CREATE INDEX IF NOT EXISTS idx_daily_manual_bills_match_lookup 
  ON public.daily_manual_bills (date, match_status);

-- 4. Atualização canônica da RPC get_daily_reconciliation_summary
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
    
    -- DRE
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

    -- 2. Busca snapshot anterior
    SELECT * INTO v_prev_snapshot 
    FROM daily_snapshots 
    WHERE date < v_target_date::date 
    ORDER BY date DESC 
    LIMIT 1;

    -- Se snapshot fechado e não forçado, retorna foto congelada
    IF v_snapshot_found AND v_snapshot.is_closed = true AND NOT p_force_dynamic THEN
        RETURN jsonb_build_object(
            'date', v_target_date,
            'is_closed', true,
            'is_marco_zero', COALESCE((v_snapshot.metadata->>'is_marco_zero')::boolean, false),
            'saldo_bancos_ofx', COALESCE(v_snapshot.saldo_bancario, 0),
            'saldo_bancos_positivo', COALESCE((v_snapshot.metadata->>'saldo_bancos_positivo')::numeric, v_snapshot.saldo_bancario, 0),
            'saldo_negativo_itau', COALESCE(v_snapshot.saldo_negativo_itau, 0),
            'total_saldo_banco_positivo', COALESCE((v_snapshot.metadata->>'total_saldo_banco_positivo')::numeric, (v_snapshot.metadata->>'total_saldo_banco')::numeric, v_snapshot.saldo_bancario, 0),
            'total_saldo_banco', COALESCE(v_snapshot.saldo_bancario, 0),
            'dinheiro_lojas', COALESCE((v_snapshot.metadata->>'dinheiro_lojas')::numeric, (v_snapshot.metadata->>'dinheiro_em_lojas')::numeric, 0),
            'dinheiro_em_lojas', COALESCE((v_snapshot.metadata->>'dinheiro_em_lojas')::numeric, (v_snapshot.metadata->>'dinheiro_lojas')::numeric, 0),
            'cartoes_a_compensar', COALESCE((v_snapshot.metadata->>'cartoes_a_compensar')::numeric, 0),
            'dinheiro_mp', COALESCE(v_snapshot.dinheiro_mp, 0),
            'a_receber', COALESCE(v_snapshot.a_receber_manual, 0),
            'na_loja_os', COALESCE(v_snapshot.total_patio, 0),
            'total_patio', COALESCE(v_snapshot.total_patio, 0),
            'caixa_atual', COALESCE(v_snapshot.caixa_atual, 0),
            'caixa_anterior', COALESCE((v_snapshot.metadata->>'caixa_anterior')::numeric, 0),
            'fluxo_caixa', COALESCE((v_snapshot.metadata->>'fluxo_caixa')::numeric, 0),
            'faturamento_periodo', COALESCE(v_snapshot.faturamento, 0),
            'faturamento_oi_base', COALESCE((v_snapshot.metadata->>'faturamento_oi_base')::numeric, v_snapshot.faturamento, 0),
            'contas_base', COALESCE((v_snapshot.metadata->>'contas_base')::numeric, v_snapshot.contas_a_pagar, 0),
            'subtotal_contas', COALESCE((v_snapshot.metadata->>'subtotal_contas')::numeric, v_snapshot.contas_a_pagar, 0),
            'valor_disp_contas', COALESCE((v_snapshot.metadata->>'valor_disp_contas')::numeric, 0),
            'diferenca_final', COALESCE((v_snapshot.metadata->>'diferenca_final')::numeric, 0),
            'status_geral', COALESCE(v_snapshot.metadata->>'status_geral', 'approved'),
            'cash_vault_snapshot', v_snapshot.metadata->'cash_vault_snapshot'
        );
    END IF;

    -- 3. Cálculo Dinâmico Canônico
    SELECT 
        COALESCE(SUM(bank_total), 0),
        COALESCE(SUM(CASE WHEN bank_total > 0 THEN bank_total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN bank_total < 0 THEN ABS(bank_total) ELSE 0 END), 0)
    INTO v_saldo_bancos, v_saldo_bancos_positivo, v_saldo_negativo_itau
    FROM reconciliations
    WHERE date = v_target_date::date;

    IF v_saldo_bancos = 0 AND v_snapshot_found THEN
        v_saldo_bancos := COALESCE(v_snapshot.saldo_bancario, 0);
        v_saldo_bancos_positivo := COALESCE((v_snapshot.metadata->>'saldo_bancos_positivo')::numeric, v_snapshot.saldo_bancario, 0);
        v_saldo_negativo_itau := COALESCE(v_snapshot.saldo_negativo_itau, 0);
    END IF;

    -- Dinheiro em cofre: apenas em trânsito (não depositado / não liquidado)
    SELECT COALESCE(SUM(amount), 0) INTO v_dinheiro_lojas
    FROM store_cash_vault
    WHERE entry_date = v_target_date::date
      AND status IN ('em_transito', 'pending');

    -- Maquininhas que NÃO entraram no banco (a compensar)
    SELECT 
        COALESCE(SUM(CASE WHEN settlement_status IN ('nao_entrou', 'a_compensar') THEN net_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN transaction_type = 'devolucao' THEN gross_amount ELSE 0 END), 0)
    INTO v_cartoes_a_compensar, v_devolucoes_rede
    FROM pos_transactions
    WHERE COALESCE(target_date, occurred_at::date) = v_target_date::date;

    v_total_saldo_banco_positivo := v_saldo_bancos_positivo + v_dinheiro_lojas + v_cartoes_a_compensar - v_devolucoes_rede;
    v_total_saldo_banco := v_saldo_bancos;

    -- Ativos Operacionais
    IF v_snapshot_found AND COALESCE(v_snapshot.dinheiro_mp, 0) > 0 THEN
        v_dinheiro_mp := v_snapshot.dinheiro_mp;
    ELSIF v_prev_snapshot.dinheiro_mp IS NOT NULL AND v_prev_snapshot.dinheiro_mp > 0 THEN
        v_dinheiro_mp := v_prev_snapshot.dinheiro_mp;
    ELSE
        v_dinheiro_mp := 0;
    END IF;

    IF v_snapshot_found AND COALESCE(v_snapshot.a_receber_manual, 0) > 0 THEN
        v_a_receber := v_snapshot.a_receber_manual;
    ELSIF v_prev_snapshot.a_receber_manual IS NOT NULL AND v_prev_snapshot.a_receber_manual > 0 THEN
        v_a_receber := v_prev_snapshot.a_receber_manual;
    ELSE
        v_a_receber := 0;
    END IF;

    -- Pátio Ativo (WIP)
    SELECT COALESCE(SUM(total_value - paid_value), 0) INTO v_na_loja_os
    FROM patio_os
    WHERE (status ILIKE '%aberto%' OR status ILIKE '%parcial%' OR status ILIKE '%pendente%' OR status = 'ABERTA' OR status = 'PENDENTE')
      AND opened_at::date <= v_target_date::date;

    IF (v_na_loja_os = 0 OR v_na_loja_os IS NULL) AND v_snapshot_found AND COALESCE(v_snapshot.total_patio, 0) > 0 THEN
        v_na_loja_os := v_snapshot.total_patio;
    ELSIF (v_na_loja_os = 0 OR v_na_loja_os IS NULL) AND v_prev_snapshot.total_patio IS NOT NULL AND v_prev_snapshot.total_patio > 0 THEN
        v_na_loja_os := v_prev_snapshot.total_patio;
    END IF;

    -- Caixa Atual: Ativos Consolidados - Cheque Especial
    v_caixa_atual := (v_total_saldo_banco_positivo + v_dinheiro_mp + v_a_receber + v_na_loja_os) - v_saldo_negativo_itau;

    IF v_prev_snapshot.caixa_atual IS NOT NULL THEN
        v_caixa_anterior := v_prev_snapshot.caixa_atual;
    ELSE
        v_caixa_anterior := 0;
    END IF;

    v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;

    -- Faturamento
    SELECT COALESCE(SUM(amount), 0) INTO v_faturamento_oi_base
    FROM transactions
    WHERE target_date = v_target_date::date
      AND type = 'in'
      AND source = 'ofx';

    SELECT COALESCE(SUM(amount), 0) INTO v_faturamento_ajustes
    FROM daily_revenue_adjustments
    WHERE date = v_target_date::date;

    v_faturamento_periodo := v_faturamento_oi_base + v_faturamento_ajustes;

    -- Contas a Pagar
    SELECT COALESCE(SUM(amount), 0) INTO v_contas_imported_bills
    FROM daily_manual_bills
    WHERE date = v_target_date::date;

    SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_contas_base
    FROM transactions
    WHERE target_date = v_target_date::date
      AND type = 'out'
      AND source = 'ofx';

    IF v_contas_imported_bills > 0 THEN
        v_contas_base := v_contas_imported_bills;
    END IF;

    SELECT COALESCE(SUM(taxa_valor), 0) INTO v_juros_rede
    FROM pos_transactions
    WHERE COALESCE(target_date, occurred_at::date) = v_target_date::date;

    v_subtotal_contas := v_contas_base + v_juros_rede;
    v_valor_disp_contas := v_faturamento_periodo - v_fluxo_caixa;
    v_diferenca_final := v_valor_disp_contas - v_subtotal_contas;

    IF ABS(v_diferenca_final) <= 50 THEN
        v_status_geral := 'approved';
    ELSE
        v_status_geral := 'divergent';
    END IF;

    RETURN jsonb_build_object(
        'date', v_target_date,
        'saldo_bancos_ofx', v_saldo_bancos,
        'saldo_bancos_positivo', v_saldo_bancos_positivo,
        'saldo_negativo_itau', v_saldo_negativo_itau,
        'total_saldo_banco_positivo', v_total_saldo_banco_positivo,
        'total_saldo_banco', v_total_saldo_banco,
        'dinheiro_lojas', v_dinheiro_lojas,
        'dinheiro_em_lojas', v_dinheiro_lojas,
        'cartoes_a_compensar', v_cartoes_a_compensar,
        'dinheiro_mp', v_dinheiro_mp,
        'a_receber', v_a_receber,
        'na_loja_os', v_na_loja_os,
        'total_patio', v_na_loja_os,
        'caixa_atual', v_caixa_atual,
        'caixa_anterior', v_caixa_anterior,
        'fluxo_caixa', v_fluxo_caixa,
        'faturamento_periodo', v_faturamento_periodo,
        'faturamento_oi_base', v_faturamento_oi_base,
        'faturamento_ajustes', v_faturamento_ajustes,
        'contas_base', v_contas_base,
        'juros_rede', v_juros_rede,
        'subtotal_contas', v_subtotal_contas,
        'valor_disp_contas', v_valor_disp_contas,
        'diferenca_final', v_diferenca_final,
        'status_geral', v_status_geral,
        'is_closed', COALESCE(v_snapshot.is_closed, false)
    );
END;
$$;
