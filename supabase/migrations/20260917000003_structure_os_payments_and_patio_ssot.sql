-- Migration: 20260917000003_structure_os_payments_and_patio_ssot.sql
-- Etapa 7: Estruturação de OS & Blindagem do Pátio (R$ 74.433,57)

-- 1. Adiciona colunas para formas de pagamento estruturadas em patio_os
ALTER TABLE public.patio_os
  ADD COLUMN IF NOT EXISTS payment_dinheiro numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_debito numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_credito numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_pix numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_boleto numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_transferencia numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_em_aberto numeric DEFAULT 0;

-- 2. Atualização canônica de get_daily_reconciliation_summary blindando o Pátio
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
    
    -- 5 Macro Pilares
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
    v_saldo_cofre numeric := 0;
    
    -- 4 Componentes do Fluxo Contábil
    v_caixa_atual numeric := 0;
    v_caixa_anterior numeric := 0;
    v_fluxo_caixa numeric := 0;
    v_faturamento_periodo numeric := 0;
    v_valor_disp_contas numeric := 0;
    v_contas_manual numeric := 0;
    v_juros_rede numeric := 0;
    v_subtotal_contas numeric := 0;
    v_diferenca_final numeric := 0;
    v_status text := 'approved';
    
    v_stores jsonb := '[]'::jsonb;
    v_tolerancia numeric := 50.00;
BEGIN
    -- Busca snapshot consolidado da data
    SELECT * INTO v_snapshot 
    FROM public.daily_snapshots 
    WHERE date = v_target_date;
    
    IF FOUND THEN
        v_snapshot_found := true;
    END IF;

    -- Busca snapshot consolidado anterior para cálculo contínuo de caixa anterior
    SELECT * INTO v_prev_snapshot 
    FROM public.daily_snapshots 
    WHERE date < v_target_date AND is_closed = true
    ORDER BY date DESC 
    LIMIT 1;

    -- =========================================================================
    -- RAMO 1: DIA FECHADO / CONGELADO (SSOT Snapshot Imutável)
    -- =========================================================================
    IF v_snapshot_found AND v_snapshot.is_closed AND NOT p_force_dynamic THEN
        -- Retorna exatamente os números congelados na consolidação do dia
        RETURN jsonb_build_object(
            'date', v_snapshot.date,
            'is_closed', true,
            'status', COALESCE(v_snapshot.status, CASE WHEN ABS(COALESCE(v_snapshot.diferenca_final, 0)) <= v_tolerancia THEN 'approved' ELSE 'divergence' END),
            'tolerancia_aplicada', v_tolerancia,
            'diferenca_final', COALESCE(v_snapshot.diferenca_final, 0),
            
            'saldo_bancos', COALESCE(v_snapshot.saldo_bancos, 0),
            'saldo_bancos_ofx', COALESCE(v_snapshot.saldo_bancos, 0),
            'saldo_bancos_positivo', COALESCE((v_snapshot.metadata->>'saldo_bancos_positivo')::numeric, (v_snapshot.metadata->>'total_saldo_banco_positivo')::numeric, v_snapshot.saldo_bancos, 0),
            'saldo_negativo_itau', COALESCE(v_snapshot.saldo_negativo_itau, 0),
            'total_saldo_banco', COALESCE(v_snapshot.saldo_bancario, 0),
            'total_saldo_banco_positivo', COALESCE((v_snapshot.metadata->>'total_saldo_banco_positivo')::numeric, (v_snapshot.metadata->>'saldo_bancos_positivo')::numeric, v_snapshot.saldo_bancario, 0),
            'dinheiro_lojas', COALESCE((v_snapshot.metadata->>'dinheiro_lojas')::numeric, (v_snapshot.metadata->>'dinheiro_em_lojas')::numeric, 0),
            'cartoes_a_compensar', COALESCE((v_snapshot.metadata->>'cartoes_a_compensar')::numeric, 0),
            'devolucoes_rede', COALESCE((v_snapshot.metadata->>'devolucoes_rede')::numeric, 0),
            'dinheiro_mp', COALESCE(v_snapshot.dinheiro_mp, 0),
            'a_receber', COALESCE(v_snapshot.a_receber_manual, 0),
            'na_loja_os', COALESCE(v_snapshot.total_patio, 0),
            'total_patio', COALESCE(v_snapshot.total_patio, 0),
            'caixa_atual', COALESCE(v_snapshot.caixa_atual, 0),
            'caixa_anterior', COALESCE((v_snapshot.metadata->>'caixa_anterior')::numeric, 0),
            'fluxo_caixa', COALESCE((v_snapshot.metadata->>'fluxo_caixa')::numeric, 0),
            'faturamento_periodo', COALESCE(v_snapshot.faturamento, 0),
            'faturamento_oi_base', COALESCE((v_snapshot.metadata->>'faturamento_oi_base')::numeric, v_snapshot.faturamento, 0),
            'faturamento_ajustes', COALESCE((v_snapshot.metadata->>'faturamento_ajustes')::numeric, 0),
            'odometro_anterior', COALESCE((v_snapshot.metadata->>'odometro_anterior')::numeric, 0),
            'odometro_hoje', COALESCE((v_snapshot.metadata->>'odometro_hoje')::numeric, 0),
            'contas_base', COALESCE(v_snapshot.contas_a_pagar, 0),
            'juros_rede', COALESCE(v_snapshot.juros_rede, 0),
            'subtotal_contas', COALESCE((v_snapshot.metadata->>'subtotal_contas')::numeric, (COALESCE(v_snapshot.contas_a_pagar, 0) + COALESCE(v_snapshot.juros_rede, 0))),
            'valor_disp_contas', COALESCE((v_snapshot.metadata->>'valor_disp_contas')::numeric, 0),
            'stores', COALESCE(v_snapshot.metadata->'stores', '[]'::jsonb)
        );
    END IF;

    -- =========================================================================
    -- RAMO 2: DIA ABERTO OU RECÁLCULO DINÂMICO SOLICITADO
    -- =========================================================================

    -- 1. Saldos Bancários e Pátio
    SELECT COALESCE(SUM(gross_amount), 0) INTO v_faturamento_periodo
    FROM pos_transactions
    WHERE target_date = v_target_date;

    IF v_faturamento_periodo = 0 AND v_snapshot_found THEN
        v_faturamento_periodo := v_snapshot.faturamento;
    END IF;

    -- 2. Pátio Ativo (WIP) Rigorosamente Blindado
    SELECT COALESCE(SUM(total_value - paid_value), 0) INTO v_na_loja_os
    FROM patio_os
    WHERE (status IN ('em_aberto', 'pago_parcial') OR (status NOT ILIKE '%finalizad%' AND status NOT ILIKE '%cancelad%' AND status NOT ILIKE '%pag%'))
      AND opened_at::date <= v_target_date::date;

    IF (v_na_loja_os = 0 OR v_snapshot_found) AND COALESCE(v_snapshot.total_patio, 0) > 0 THEN
        v_na_loja_os := v_snapshot.total_patio;
    ELSIF v_na_loja_os = 0 AND v_prev_snapshot.total_patio IS NOT NULL AND v_prev_snapshot.total_patio > 0 THEN
        v_na_loja_os := v_prev_snapshot.total_patio;
    END IF;

    -- 3. Saldo Bancário das Contas
    SELECT COALESCE(SUM(amount), 0) INTO v_saldo_bancos_positivo
    FROM ofx_transactions
    WHERE target_date = v_target_date AND amount > 0;

    IF v_snapshot_found THEN
        v_saldo_bancos := COALESCE(v_snapshot.saldo_bancos, 0);
        v_dinheiro_mp := COALESCE(v_snapshot.dinheiro_mp, 0);
        v_a_receber := COALESCE(v_snapshot.a_receber_manual, 0);
        v_saldo_negativo_itau := COALESCE(v_snapshot.saldo_negativo_itau, 0);
        v_total_saldo_banco_positivo := COALESCE((v_snapshot.metadata->>'total_saldo_banco_positivo')::numeric, v_snapshot.saldo_bancario, 0);
    END IF;

    -- 4. Caixa Atual & Fluxo
    v_caixa_atual := (v_total_saldo_banco_positivo + v_dinheiro_mp + v_a_receber + v_na_loja_os) - v_saldo_negativo_itau;

    IF v_prev_snapshot.caixa_atual IS NOT NULL THEN
        v_caixa_anterior := v_prev_snapshot.caixa_atual;
    ELSE
        v_caixa_anterior := 0;
    END IF;

    v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;
    v_valor_disp_contas := v_faturamento_periodo - v_fluxo_caixa;

    -- 5. Contas Manuais
    SELECT COALESCE(SUM(amount), 0) INTO v_contas_manual
    FROM daily_manual_bills
    WHERE date = v_target_date AND status != 'ignored';

    IF v_contas_manual = 0 AND v_snapshot_found THEN
        v_contas_manual := COALESCE(v_snapshot.contas_a_pagar, 0);
    END IF;

    v_subtotal_contas := v_contas_manual + v_juros_rede;
    v_diferenca_final := v_valor_disp_contas - v_subtotal_contas;

    IF ABS(v_diferenca_final) <= v_tolerancia THEN
        v_status := 'approved';
    ELSE
        v_status := 'divergence';
    END IF;

    RETURN jsonb_build_object(
        'date', v_target_date,
        'is_closed', COALESCE(v_snapshot.is_closed, false),
        'status', v_status,
        'tolerancia_aplicada', v_tolerancia,
        'diferenca_final', v_diferenca_final,
        'saldo_bancos', v_saldo_bancos,
        'total_saldo_banco_positivo', v_total_saldo_banco_positivo,
        'dinheiro_mp', v_dinheiro_mp,
        'a_receber', v_a_receber,
        'na_loja_os', v_na_loja_os,
        'total_patio', v_na_loja_os,
        'caixa_atual', v_caixa_atual,
        'caixa_anterior', v_caixa_anterior,
        'fluxo_caixa', v_fluxo_caixa,
        'faturamento_periodo', v_faturamento_periodo,
        'valor_disp_contas', v_valor_disp_contas,
        'contas_manual', v_contas_manual,
        'subtotal_contas', v_subtotal_contas,
        'stores', COALESCE(v_snapshot.metadata->'stores', '[]'::jsonb)
    );
END;
$$;
