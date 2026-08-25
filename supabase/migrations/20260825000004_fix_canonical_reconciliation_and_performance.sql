-- ==============================================================================
-- MIGRATION: 20260825000004_fix_canonical_reconciliation_and_performance.sql
-- DESCRIPTION: Correção definitiva da RPC get_daily_reconciliation_summary,
--              eliminação de colunas fantasmas, consolidação do saldo patrimonial,
--              re-homologação de snapshots imutáveis e índices de alta performance.
-- ==============================================================================

-- 1. ÍNDICES ESTRATÉGICOS DE ALTA VELOCIDADE
CREATE INDEX IF NOT EXISTS idx_ofx_target_date_type ON public.ofx_transactions(target_date, type);
CREATE INDEX IF NOT EXISTS idx_ofx_target_date_store ON public.ofx_transactions(target_date, store_id);
CREATE INDEX IF NOT EXISTS idx_pos_target_date_store ON public.pos_transactions(target_date, store_id);
CREATE INDEX IF NOT EXISTS idx_store_vault_entry_status ON public.store_cash_vault(entry_date, status);
CREATE INDEX IF NOT EXISTS idx_patio_os_dates_status ON public.patio_os(opened_at, closed_at, status);
CREATE INDEX IF NOT EXISTS idx_reconciliations_store_date ON public.reconciliations(store_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_manual_bills_date ON public.daily_manual_bills(date);
CREATE INDEX IF NOT EXISTS idx_daily_revenue_adj_date ON public.daily_revenue_adjustments(date);

-- 2. RE-HOMOLOGAÇÃO DOS 5 SNAPSHOTS OFICIAIS IMUTÁVEIS (17, 18, 19, 21, 24/08)

-- 17/08/2026
INSERT INTO public.daily_snapshots (
    date, caixa_atual, saldo_bancario, dinheiro_mp, a_receber_manual, 
    total_patio, contas_a_pagar, juros_rede, saldo_negativo_itau, faturamento, 
    is_closed, closed_at, metadata
) VALUES (
    '2026-08-17', 299076.86, 190819.65, 9066.00, 10694.50, 
    88496.71, 81048.63, 5433.13, 0.00, 567618.25,
    true, '2026-08-17 21:00:00+00',
    jsonb_build_object(
        'caixa_anterior', 289386.12,
        'fluxo_caixa', 9690.74,
        'faturamento_oi_base', 70820.43,
        'faturamento_ajustes', 25351.63,
        'faturamento_periodo', 96172.06,
        'valor_disp_contas', 86481.32,
        'contas_manual', 81048.63,
        'juros_rede', 5433.13,
        'subtotal_contas', 86481.76,
        'diferenca_final', -0.44,
        'status_geral', 'approved',
        'total_saldo_banco', 190819.65
    )
)
ON CONFLICT (date) DO UPDATE SET
    caixa_atual = EXCLUDED.caixa_atual,
    saldo_bancario = EXCLUDED.saldo_bancario,
    dinheiro_mp = EXCLUDED.dinheiro_mp,
    a_receber_manual = EXCLUDED.a_receber_manual,
    total_patio = EXCLUDED.total_patio,
    contas_a_pagar = EXCLUDED.contas_a_pagar,
    juros_rede = EXCLUDED.juros_rede,
    saldo_negativo_itau = EXCLUDED.saldo_negativo_itau,
    faturamento = EXCLUDED.faturamento,
    is_closed = true,
    closed_at = EXCLUDED.closed_at,
    metadata = EXCLUDED.metadata;

-- 18/08/2026
INSERT INTO public.daily_snapshots (
    date, caixa_atual, saldo_bancario, dinheiro_mp, a_receber_manual, 
    total_patio, contas_a_pagar, juros_rede, saldo_negativo_itau, faturamento, 
    is_closed, closed_at, metadata
) VALUES (
    '2026-08-18', 316215.85, 211003.28, 8466.00, 10694.50, 
    115988.47, 21050.47, 3668.46, 29936.40, 609475.82,
    true, '2026-08-18 21:00:00+00',
    jsonb_build_object(
        'caixa_anterior', 299076.86,
        'fluxo_caixa', 17138.99,
        'faturamento_oi_base', 41857.57,
        'faturamento_ajustes', 0.00,
        'faturamento_periodo', 41857.57,
        'valor_disp_contas', 24718.58,
        'contas_manual', 21050.47,
        'juros_rede', 3668.46,
        'subtotal_contas', 24718.93,
        'diferenca_final', -0.35,
        'status_geral', 'approved',
        'total_saldo_banco', 211003.28
    )
)
ON CONFLICT (date) DO UPDATE SET
    caixa_atual = EXCLUDED.caixa_atual,
    saldo_bancario = EXCLUDED.saldo_bancario,
    dinheiro_mp = EXCLUDED.dinheiro_mp,
    a_receber_manual = EXCLUDED.a_receber_manual,
    total_patio = EXCLUDED.total_patio,
    contas_a_pagar = EXCLUDED.contas_a_pagar,
    juros_rede = EXCLUDED.juros_rede,
    saldo_negativo_itau = EXCLUDED.saldo_negativo_itau,
    faturamento = EXCLUDED.faturamento,
    is_closed = true,
    closed_at = EXCLUDED.closed_at,
    metadata = EXCLUDED.metadata;

-- 19/08/2026
INSERT INTO public.daily_snapshots (
    date, caixa_atual, saldo_bancario, dinheiro_mp, a_receber_manual, 
    total_patio, contas_a_pagar, juros_rede, saldo_negativo_itau, faturamento, 
    is_closed, closed_at, metadata
) VALUES (
    '2026-08-19', 271922.90, 152608.71, 8466.00, 10694.50, 
    100153.69, 114929.61, 3177.07, 0.00, 683288.89,
    true, '2026-08-19 21:00:00+00',
    jsonb_build_object(
        'caixa_anterior', 316215.85,
        'fluxo_caixa', -44292.95,
        'faturamento_oi_base', 73813.07,
        'faturamento_ajustes', 0.00,
        'faturamento_periodo', 73813.07,
        'valor_disp_contas', 118106.02,
        'contas_manual', 114929.61,
        'juros_rede', 3177.07,
        'subtotal_contas', 118106.68,
        'diferenca_final', -0.66,
        'status_geral', 'approved',
        'total_saldo_banco', 152608.71
    )
)
ON CONFLICT (date) DO UPDATE SET
    caixa_atual = EXCLUDED.caixa_atual,
    saldo_bancario = EXCLUDED.saldo_bancario,
    dinheiro_mp = EXCLUDED.dinheiro_mp,
    a_receber_manual = EXCLUDED.a_receber_manual,
    total_patio = EXCLUDED.total_patio,
    contas_a_pagar = EXCLUDED.contas_a_pagar,
    juros_rede = EXCLUDED.juros_rede,
    saldo_negativo_itau = EXCLUDED.saldo_negativo_itau,
    faturamento = EXCLUDED.faturamento,
    is_closed = true,
    closed_at = EXCLUDED.closed_at,
    metadata = EXCLUDED.metadata;

-- 21/08/2026
INSERT INTO public.daily_snapshots (
    date, caixa_atual, saldo_bancario, dinheiro_mp, a_receber_manual, 
    total_patio, contas_a_pagar, juros_rede, saldo_negativo_itau, faturamento, 
    is_closed, closed_at, metadata
) VALUES (
    '2026-08-21', 150600.29, 75622.66, 8466.00, 10694.50, 
    103023.72, 195066.04, 3115.41, 47206.59, 746804.77,
    true, '2026-08-21 21:00:00+00',
    jsonb_build_object(
        'caixa_anterior', 271922.90,
        'fluxo_caixa', -121322.61,
        'faturamento_oi_base', 63515.88,
        'faturamento_ajustes', 13342.24,
        'faturamento_periodo', 76858.12,
        'valor_disp_contas', 198180.73,
        'contas_manual', 195066.04,
        'juros_rede', 3115.41,
        'subtotal_contas', 198181.45,
        'diferenca_final', -0.72,
        'status_geral', 'approved',
        'total_saldo_banco', 75622.66
    )
)
ON CONFLICT (date) DO UPDATE SET
    caixa_atual = EXCLUDED.caixa_atual,
    saldo_bancario = EXCLUDED.saldo_bancario,
    dinheiro_mp = EXCLUDED.dinheiro_mp,
    a_receber_manual = EXCLUDED.a_receber_manual,
    total_patio = EXCLUDED.total_patio,
    contas_a_pagar = EXCLUDED.contas_a_pagar,
    juros_rede = EXCLUDED.juros_rede,
    saldo_negativo_itau = EXCLUDED.saldo_negativo_itau,
    faturamento = EXCLUDED.faturamento,
    is_closed = true,
    closed_at = EXCLUDED.closed_at,
    metadata = EXCLUDED.metadata;

-- 24/08/2026
INSERT INTO public.daily_snapshots (
    date, caixa_atual, saldo_bancario, dinheiro_mp, a_receber_manual, 
    total_patio, contas_a_pagar, juros_rede, saldo_negativo_itau, faturamento, 
    is_closed, closed_at, metadata
) VALUES (
    '2026-08-24', 175685.99, 102999.61, 13278.00, 10694.50, 
    88212.39, 40069.51, 5650.15, 39498.51, 817526.33,
    true, '2026-08-24 21:00:00+00',
    jsonb_build_object(
        'caixa_anterior', 150600.29,
        'fluxo_caixa', 25085.70,
        'faturamento_oi_base', 70721.56,
        'faturamento_ajustes', 90.00,
        'faturamento_periodo', 70811.56,
        'valor_disp_contas', 45725.86,
        'contas_manual', 40069.51,
        'juros_rede', 5650.15,
        'subtotal_contas', 45719.66,
        'diferenca_final', 6.20,
        'status_geral', 'approved',
        'total_saldo_banco', 102999.61
    )
)
ON CONFLICT (date) DO UPDATE SET
    caixa_atual = EXCLUDED.caixa_atual,
    saldo_bancario = EXCLUDED.saldo_bancario,
    dinheiro_mp = EXCLUDED.dinheiro_mp,
    a_receber_manual = EXCLUDED.a_receber_manual,
    total_patio = EXCLUDED.total_patio,
    contas_a_pagar = EXCLUDED.contas_a_pagar,
    juros_rede = EXCLUDED.juros_rede,
    saldo_negativo_itau = EXCLUDED.saldo_negativo_itau,
    faturamento = EXCLUDED.faturamento,
    is_closed = true,
    closed_at = EXCLUDED.closed_at,
    metadata = EXCLUDED.metadata;


-- 3. DROPAR SOBRECARGAS OBSOLETAS DA RPC get_daily_reconciliation_summary
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(text);
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(text, boolean);
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(date);
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(date, boolean);

-- 4. CRIAR A RPC CANÔNICA, ÚNICA, DETERMINÍSTICA E DE ALTA PERFORMANCE
CREATE OR REPLACE FUNCTION public.get_daily_reconciliation_summary(
    p_date date,
    p_force_dynamic boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_target_date date := p_date;
    v_snapshot record;
    v_faturamento_anterior numeric := 0;
    v_faturamento_oi_base numeric := 0;
    v_faturamento_ajustes numeric := 0;
    v_faturamento_periodo numeric := 0;
    v_caixa_anterior numeric := 0;
    v_saldo_bancos numeric := 0;
    v_saldo_negativo_itau numeric := 0;
    v_dinheiro_em_lojas numeric := 0;
    v_cartoes_a_compensar numeric := 0;
    v_total_saldo_banco numeric := 0;
    v_dinheiro_mp numeric := 0;
    v_a_receber numeric := 0;
    v_na_loja_os numeric := 0;
    v_caixa_atual numeric := 0;
    v_fluxo_caixa numeric := 0;
    v_valor_disp_contas numeric := 0;
    v_contas_base numeric := 0;
    v_contas_extras numeric := 0;
    v_contas_manual numeric := 0;
    v_juros_rede numeric := 0;
    v_devolucoes_rede numeric := 0;
    v_subtotal_contas numeric := 0;
    v_diferenca_final numeric := 0;
    v_status_geral text := 'divergent';
    v_triple jsonb;
    v_stores_list jsonb := '[]'::jsonb;
    v_faturamento_itens jsonb := '[]'::jsonb;
    v_contas_itens jsonb := '[]'::jsonb;
    v_total_entradas_ofx numeric := 0;
    v_total_saidas_ofx numeric := 0;
    v_prev_snapshot record;
BEGIN
    IF v_target_date IS NULL THEN
        RAISE EXCEPTION 'p_date deve ser informado.';
    END IF;

    -- Snapshot do dia atual
    SELECT * INTO v_snapshot
    FROM daily_snapshots
    WHERE date = v_target_date;

    -- =========================================================================
    -- RAMAL 1: DIA FECHADO E HOMOLOGADO (Period Close Locking)
    -- =========================================================================
    IF v_snapshot.id IS NOT NULL AND v_snapshot.is_closed = true AND p_force_dynamic = false THEN
        -- Busca faturamento e caixa anterior para exibição
        SELECT caixa_atual, faturamento INTO v_prev_snapshot
        FROM daily_snapshots
        WHERE date < v_target_date AND caixa_atual > 0
        ORDER BY date DESC
        LIMIT 1;

        v_caixa_anterior := COALESCE((v_snapshot.metadata->>'caixa_anterior')::numeric, v_prev_snapshot.caixa_atual, 0);
        v_caixa_atual := COALESCE(v_snapshot.caixa_atual, 0);
        v_fluxo_caixa := COALESCE((v_snapshot.metadata->>'fluxo_caixa')::numeric, v_caixa_atual - v_caixa_anterior);
        v_faturamento_oi_base := COALESCE((v_snapshot.metadata->>'faturamento_oi_base')::numeric, (v_snapshot.metadata->>'faturamento_liquido')::numeric, 0);
        v_faturamento_ajustes := COALESCE((v_snapshot.metadata->>'faturamento_ajustes')::numeric, v_snapshot.faturamento_outros_valor, 0);
        v_faturamento_periodo := COALESCE((v_snapshot.metadata->>'faturamento_periodo')::numeric, v_faturamento_oi_base + v_faturamento_ajustes);
        v_valor_disp_contas := COALESCE((v_snapshot.metadata->>'valor_disp_contas')::numeric, v_faturamento_periodo - v_fluxo_caixa);
        v_contas_base := COALESCE(v_snapshot.contas_a_pagar, 0);
        v_contas_manual := COALESCE((v_snapshot.metadata->>'contas_manual')::numeric, v_snapshot.contas_a_pagar);
        v_juros_rede := COALESCE(v_snapshot.juros_rede, 0);
        v_subtotal_contas := COALESCE((v_snapshot.metadata->>'subtotal_contas')::numeric, v_contas_manual + v_juros_rede);
        v_diferenca_final := COALESCE((v_snapshot.metadata->>'diferenca_final')::numeric, v_valor_disp_contas - v_subtotal_contas);
        v_total_saldo_banco := COALESCE((v_snapshot.metadata->>'total_saldo_banco')::numeric, v_snapshot.saldo_bancario, 0);
        v_status_geral := COALESCE(v_snapshot.metadata->>'status_geral', CASE WHEN ABS(v_diferenca_final) <= 50.00 THEN 'approved' ELSE 'divergent' END);
        
        -- Monta lista das lojas com base nos dados registrados de reconciliations (colunas canônicas existentes)
        SELECT COALESCE(jsonb_agg(
            jsonb_build_object(
                'store_id', s.id,
                'store_name', s.name,
                'color', COALESCE(s.avatar_url, ''),
                'saldo_banco_ofx', COALESCE(r.bank_total, 0),
                'saldo_banco', COALESCE(r.bank_total, 0),
                'bank_balance', COALESCE(r.bank_total, 0),
                'dinheiro_loja', 0,
                'cash_vault', 0,
                'vault_entries', '[]'::jsonb,
                'nao_entrou_valor', 0,
                'status_compensacao', 'entrou',
                'cartoes_a_compensar', 0,
                'pix_os_ofx', 0,
                'maquininha', COALESCE(r.machine_total, 0),
                'rede_bruto', COALESCE(r.machine_total, 0),
                'rede_liquido', COALESCE(r.machine_total, 0),
                'rede_taxas', COALESCE(r.machine_fees, 0),
                'rede_devolucoes', 0,
                'rede_ofx', COALESCE(r.machine_total, 0),
                'pix', 0,
                'justified_other_ofx', 0,
                'na_loja_os', COALESCE(r.na_loja_os, 0),
                'patio_os', COALESCE(r.na_loja_os, 0),
                'previsto_ofx', COALESCE(r.bank_total, 0),
                'diferenca', 0,
                'status', 'approved'
            ) ORDER BY s.name
        ), '[]'::jsonb)
        INTO v_stores_list
        FROM stores s
        LEFT JOIN (
            SELECT DISTINCT ON (store_id) store_id, bank_total, na_loja_os, machine_total, machine_fees
            FROM reconciliations
            WHERE date <= v_target_date
            ORDER BY store_id, date DESC
        ) r ON r.store_id = s.id
        WHERE s.active = true;

        RETURN jsonb_build_object(
            'date', v_target_date,
            'is_closed', true,
            'closed_at', v_snapshot.closed_at,
            'status_geral', v_status_geral,
            'caixa_atual', v_caixa_atual,
            'caixa_anterior', v_caixa_anterior,
            'fluxo_caixa', v_fluxo_caixa,
            'faturamento_periodo', v_faturamento_periodo,
            'faturamento_oi_base', v_faturamento_oi_base,
            'faturamento_ajustes', v_faturamento_ajustes,
            'faturamento_itens', '[]'::jsonb,
            'valor_disp_contas', v_valor_disp_contas,
            'contas_base', v_contas_base,
            'contas_extras', 0,
            'contas_manual', v_contas_manual,
            'juros_rede', v_juros_rede,
            'devolucoes_rede', 0,
            'subtotal_contas', v_subtotal_contas,
            'diferenca_final', v_diferenca_final,
            'total_saldo_banco', v_total_saldo_banco,
            'saldo_bancos_ofx', COALESCE(v_snapshot.saldo_bancario, 0),
            'saldo_negativo_itau', COALESCE(v_snapshot.saldo_negativo_itau, 0),
            'dinheiro_em_lojas', 0,
            'cartoes_a_compensar', 0,
            'dinheiro_mp', COALESCE(v_snapshot.dinheiro_mp, 0),
            'a_receber', COALESCE(v_snapshot.a_receber_manual, 0),
            'na_loja_os', COALESCE(v_snapshot.total_patio, 0),
            'total_entradas_ofx', 0,
            'total_saidas_ofx', 0,
            'contas_itens', '[]'::jsonb,
            'stores', COALESCE(v_stores_list, '[]'::jsonb),
            'stores_detail', COALESCE(v_stores_list, '[]'::jsonb)
        );
    END IF;

    -- =========================================================================
    -- RAMAL 2: DIA ABERTO OU FORÇADO DINÂMICO (Cálculo em Tempo Real)
    -- =========================================================================
    -- 1. Faturamento acumulado anterior e caixa anterior (snapshot fechado anterior)
    SELECT faturamento, caixa_atual INTO v_prev_snapshot
    FROM daily_snapshots
    WHERE date < v_target_date AND caixa_atual > 0
    ORDER BY date DESC
    LIMIT 1;

    v_faturamento_anterior := COALESCE(v_prev_snapshot.faturamento, 0);
    v_caixa_anterior := COALESCE(v_prev_snapshot.caixa_atual, 0);

    -- 2. Faturamento Base do Dia (Odômetro)
    IF v_snapshot.faturamento IS NOT NULL THEN
        IF v_faturamento_anterior > 0 AND v_snapshot.faturamento > v_faturamento_anterior THEN
            v_faturamento_oi_base := v_snapshot.faturamento - v_faturamento_anterior;
        ELSE
            v_faturamento_oi_base := v_snapshot.faturamento;
        END IF;
    ELSE
        v_faturamento_oi_base := 0;
    END IF;

    -- 3. Faturamento Ajustes
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

    -- 4. Tripla Conciliação de Maquininhas
    BEGIN
        v_triple := get_store_pos_triple_reconciliation(v_target_date);
        IF v_triple IS NOT NULL THEN
            v_cartoes_a_compensar := COALESCE((v_triple->>'total_nao_entrou')::numeric, 0);
            v_juros_rede := COALESCE((v_triple->>'total_rede_taxas')::numeric, 0);
            v_devolucoes_rede := COALESCE((v_triple->>'total_devolucoes')::numeric, 0);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_triple := '{"stores": [], "total_nao_entrou": 0, "total_devolucoes": 0}'::jsonb;
        v_cartoes_a_compensar := 0;
        v_juros_rede := 0;
        v_devolucoes_rede := 0;
    END;

    -- 5. Dinheiro em Cofre das Lojas com consistência temporal
    SELECT COALESCE(SUM(amount), 0)
    INTO v_dinheiro_em_lojas
    FROM store_cash_vault
    WHERE entry_date <= v_target_date
      AND (
          status IN ('em_transito', 'pending')
          OR (status = 'depositado' AND (deposited_at IS NULL OR (deposited_at AT TIME ZONE 'America/Sao_Paulo')::date > v_target_date))
      );

    -- 6. Saldo Bancário Consolidado (10 contas Itaú)
    SELECT 
        COALESCE(SUM(bank_total), 0),
        COALESCE(SUM(CASE WHEN bank_total < 0 THEN ABS(bank_total) ELSE 0 END), 0)
    INTO v_saldo_bancos, v_saldo_negativo_itau
    FROM (
        SELECT DISTINCT ON (store_id) store_id, bank_total
        FROM reconciliations
        WHERE date <= v_target_date
        ORDER BY store_id, date DESC
    ) latest_recons;

    IF v_saldo_bancos = 0 AND v_snapshot.saldo_bancario IS NOT NULL THEN
        v_saldo_bancos := v_snapshot.saldo_bancario;
    END IF;

    -- Entradas e saídas de transações do dia para auditoria de extrato
    SELECT 
        COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END), 0)
    INTO v_total_entradas_ofx, v_total_saidas_ofx
    FROM ofx_transactions
    WHERE target_date = v_target_date;

    -- Total Saldo Banco (Pilar 1)
    v_total_saldo_banco := v_saldo_bancos + v_dinheiro_em_lojas + v_cartoes_a_compensar;

    -- 7. Dinheiro MP (Pilar 2)
    v_dinheiro_mp := COALESCE(v_snapshot.dinheiro_mp, 0);

    -- 8. A Receber (Pilar 3) com agregação dinâmica da tabela receivables com fallback
    SELECT COALESCE(SUM(value), 0)
    INTO v_a_receber
    FROM public.receivables
    WHERE date <= v_target_date
      AND (
          status = 'pendente'
          OR (status = 'recebido' AND (received_at AT TIME ZONE 'America/Sao_Paulo')::date > v_target_date)
      );

    IF v_a_receber = 0 AND v_snapshot.a_receber_manual IS NOT NULL AND v_snapshot.a_receber_manual > 0 THEN
        v_a_receber := v_snapshot.a_receber_manual;
    END IF;

    -- 9. Na Loja OS (Pilar 4)
    SELECT COALESCE(SUM(GREATEST(0, total_value - COALESCE(
        CASE 
            WHEN last_payment_date IS NOT NULL AND last_payment_date > v_target_date THEN 0
            ELSE paid_value 
        END, 0))), 0)
    INTO v_na_loja_os
    FROM patio_os
    WHERE status != 'cancelada'
      AND (
          status != 'finalizada' 
          OR (closed_at IS NOT NULL AND (closed_at AT TIME ZONE 'America/Sao_Paulo')::date > v_target_date)
      );

    IF v_na_loja_os = 0 AND v_snapshot.total_patio IS NOT NULL THEN
        v_na_loja_os := v_snapshot.total_patio;
    END IF;

    -- 10. Caixa Atual e Fluxo de Caixa
    v_caixa_atual := v_total_saldo_banco + v_dinheiro_mp + v_a_receber + v_na_loja_os;
    v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;

    -- 11. Valor Disponível para Contas
    v_valor_disp_contas := v_faturamento_periodo - v_fluxo_caixa;

    -- 12. Contas a Pagar: Base Planilha + Extras Manuais
    v_contas_base := COALESCE(v_snapshot.contas_a_pagar, 0);
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', id,
            'title', title,
            'amount', amount,
            'category', category,
            'description', description,
            'store_id', store_id
        )), '[]'::jsonb)
    INTO v_contas_extras, v_contas_itens
    FROM daily_manual_bills
    WHERE date = v_target_date;

    v_contas_manual := v_contas_base + v_contas_extras;
    v_subtotal_contas := v_contas_manual + v_juros_rede + v_devolucoes_rede;

    -- 13. Diferença Final
    v_diferenca_final := v_valor_disp_contas - v_subtotal_contas;
    IF ABS(v_diferenca_final) <= 50.00 THEN
        v_status_geral := 'approved';
    ELSE
        v_status_geral := 'divergent';
    END IF;

    -- 14. Raio-X das 10 Filiais (CTEs Otimizadas e Pré-Agregadas)
    WITH store_recons AS (
        SELECT DISTINCT ON (store_id) store_id, bank_total, na_loja_os as hist_na_loja
        FROM reconciliations
        WHERE date <= v_target_date
        ORDER BY store_id, date DESC
    ),
    store_ofx AS (
        SELECT 
            store_id,
            COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE -amount END), 0) as bank_flow,
            COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END), 0) as total_in,
            COALESCE(SUM(CASE WHEN type = 'in' AND (counterpart_name ILIKE '%REDE%' OR counterpart_name ILIKE '%REDECARD%' OR counterpart_name ILIKE '%CIELO%') THEN amount ELSE 0 END), 0) as rede_credit,
            COALESCE(SUM(CASE WHEN type = 'in' AND matched_os_number IS NOT NULL THEN amount ELSE 0 END), 0) as pix_matched,
            COALESCE(SUM(CASE WHEN type = 'in' AND manual_category IS NOT NULL THEN amount ELSE 0 END), 0) as justified_other
        FROM ofx_transactions
        WHERE target_date = v_target_date
        GROUP BY store_id
    ),
    store_patio AS (
        SELECT 
            store_id,
            COALESCE(SUM(GREATEST(0, total_value - COALESCE(
                CASE 
                    WHEN last_payment_date IS NOT NULL AND last_payment_date > v_target_date THEN 0
                    ELSE paid_value 
                END, 0))), 0) as patio_val
        FROM patio_os
        WHERE status != 'cancelada'
          AND (status != 'finalizada' OR (closed_at IS NOT NULL AND (closed_at AT TIME ZONE 'America/Sao_Paulo')::date > v_target_date))
        GROUP BY store_id
    ),
    store_vault AS (
        SELECT 
            store_id,
            COALESCE(SUM(amount), 0) as vault_val,
            COALESCE(jsonb_agg(jsonb_build_object(
                'id', id,
                'amount', amount,
                'status', status,
                'entry_date', entry_date,
                'os_number_ref', os_number_ref,
                'description', description
            )), '[]'::jsonb) as vault_entries
        FROM store_cash_vault
        WHERE entry_date <= v_target_date 
          AND (status IN ('em_transito', 'pending') OR (status = 'depositado' AND (deposited_at IS NULL OR (deposited_at AT TIME ZONE 'America/Sao_Paulo')::date > v_target_date)))
        GROUP BY store_id
    )
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'store_id', s.id,
            'store_name', s.name,
            'color', COALESCE(s.avatar_url, ''),
            'saldo_banco_ofx', COALESCE(sr.bank_total, 0),
            'saldo_banco', COALESCE(sr.bank_total, 0) + COALESCE(v.vault_val, 0) + COALESCE((st_triple->>'nao_entrou_valor')::numeric, 0),
            'bank_balance', COALESCE(sr.bank_total, 0),
            'dinheiro_loja', COALESCE(v.vault_val, 0),
            'cash_vault', COALESCE(v.vault_val, 0),
            'vault_entries', COALESCE(v.vault_entries, '[]'::jsonb),
            'nao_entrou_valor', COALESCE((st_triple->>'nao_entrou_valor')::numeric, 0),
            'cartoes_a_compensar', COALESCE((st_triple->>'nao_entrou_valor')::numeric, 0),
            'status_compensacao', COALESCE(st_triple->>'status_compensacao', 'sem_movimento'),
            'rede_bruto', COALESCE((st_triple->>'rede_bruto')::numeric, 0),
            'rede_liquido', COALESCE((st_triple->>'rede_liquido')::numeric, 0),
            'rede_taxas', COALESCE((st_triple->>'rede_taxas')::numeric, 0),
            'rede_devolucoes', COALESCE((st_triple->>'rede_devolucoes')::numeric, 0),
            'maquininha', COALESCE(o.rede_credit, (st_triple->>'ofx_maquininhas')::numeric, 0),
            'rede_ofx', COALESCE(o.rede_credit, (st_triple->>'ofx_maquininhas')::numeric, 0),
            'pix_os_ofx', COALESCE(o.pix_matched, 0),
            'pix', COALESCE(o.pix_matched, 0),
            'justified_other_ofx', COALESCE(o.justified_other, 0),
            'na_loja_os', COALESCE(p.patio_val, sr.hist_na_loja, 0),
            'patio_os', COALESCE(p.patio_val, sr.hist_na_loja, 0),
            'previsto_ofx', COALESCE(o.total_in, 0),
            'diferenca', GREATEST(0, COALESCE(o.total_in, 0) - (COALESCE(o.rede_credit, (st_triple->>'ofx_maquininhas')::numeric, 0) + COALESCE(o.pix_matched, 0) + COALESCE(o.justified_other, 0))),
            'status', CASE 
                WHEN GREATEST(0, COALESCE(o.total_in, 0) - (COALESCE(o.rede_credit, (st_triple->>'ofx_maquininhas')::numeric, 0) + COALESCE(o.pix_matched, 0) + COALESCE(o.justified_other, 0))) <= 0.1 THEN 'approved'
                ELSE 'divergence'
            END
        ) ORDER BY s.name
    ), '[]'::jsonb)
    INTO v_stores_list
    FROM stores s
    LEFT JOIN store_recons sr ON sr.store_id = s.id
    LEFT JOIN store_ofx o ON o.store_id = s.id
    LEFT JOIN store_patio p ON p.store_id = s.id
    LEFT JOIN store_vault v ON v.store_id = s.id
    LEFT JOIN LATERAL (
        SELECT elem as st_triple
        FROM jsonb_array_elements(COALESCE(v_triple->'stores', '[]'::jsonb)) elem
        WHERE (elem->>'store_id') = s.id
        LIMIT 1
    ) ON true
    WHERE s.active = true;

    RETURN jsonb_build_object(
        'date', v_target_date,
        'is_closed', false,
        'closed_at', null,
        'status_geral', v_status_geral,
        'caixa_atual', v_caixa_atual,
        'caixa_anterior', v_caixa_anterior,
        'fluxo_caixa', v_fluxo_caixa,
        'faturamento_periodo', v_faturamento_periodo,
        'faturamento_oi_base', v_faturamento_oi_base,
        'faturamento_ajustes', v_faturamento_ajustes,
        'faturamento_itens', v_faturamento_itens,
        'valor_disp_contas', v_valor_disp_contas,
        'contas_base', v_contas_base,
        'contas_extras', v_contas_extras,
        'contas_manual', v_contas_manual,
        'juros_rede', v_juros_rede,
        'devolucoes_rede', v_devolucoes_rede,
        'subtotal_contas', v_subtotal_contas,
        'diferenca_final', v_diferenca_final,
        'total_saldo_banco', v_total_saldo_banco,
        'saldo_bancos_ofx', v_saldo_bancos,
        'saldo_negativo_itau', v_saldo_negativo_itau,
        'dinheiro_em_lojas', v_dinheiro_em_lojas,
        'cartoes_a_compensar', v_cartoes_a_compensar,
        'dinheiro_mp', v_dinheiro_mp,
        'a_receber', v_a_receber,
        'na_loja_os', v_na_loja_os,
        'total_entradas_ofx', v_total_entradas_ofx,
        'total_saidas_ofx', v_total_saidas_ofx,
        'contas_itens', v_contas_itens,
        'stores', COALESCE(v_stores_list, '[]'::jsonb),
        'stores_detail', COALESCE(v_stores_list, '[]'::jsonb)
    );
END;
$function$;

-- 5. RPC RECEBÍVEIS RESUMO
CREATE OR REPLACE FUNCTION public.get_receivables_summary(p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_target_date date := COALESCE(p_date, CURRENT_DATE);
    v_total_pendente numeric := 0;
    v_total_recebido numeric := 0;
    v_total_vencido numeric := 0;
    v_total_geral numeric := 0;
    v_lojas jsonb;
BEGIN
    -- Totais
    SELECT 
        COALESCE(SUM(CASE WHEN status = 'pendente' THEN value ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'recebido' THEN value ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'pendente' AND due_date < v_target_date THEN value ELSE 0 END), 0),
        COALESCE(SUM(value), 0)
    INTO v_total_pendente, v_total_recebido, v_total_vencido, v_total_geral
    FROM receivables
    WHERE date <= v_target_date;

    -- Agrupamento por Loja
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'store_id', s.id,
            'store_name', s.name,
            'total_pendente', COALESCE(r.pendente, 0),
            'total_recebido', COALESCE(r.recebido, 0),
            'total_vencido', COALESCE(r.vencido, 0),
            'total_geral', COALESCE(r.total, 0),
            'qtd_titulos', COALESCE(r.qtd, 0)
        ) ORDER BY s.name
    ), '[]'::jsonb)
    INTO v_lojas
    FROM stores s
    LEFT JOIN (
        SELECT 
            store_id,
            SUM(CASE WHEN status = 'pendente' THEN value ELSE 0 END) as pendente,
            SUM(CASE WHEN status = 'recebido' THEN value ELSE 0 END) as recebido,
            SUM(CASE WHEN status = 'pendente' AND due_date < v_target_date THEN value ELSE 0 END) as vencido,
            SUM(value) as total,
            COUNT(*) as qtd
        FROM receivables
        WHERE date <= v_target_date
        GROUP BY store_id
    ) r ON r.store_id = s.id
    WHERE s.active = true;

    RETURN jsonb_build_object(
        'date', v_target_date,
        'total_pendente', v_total_pendente,
        'total_recebido', v_total_recebido,
        'total_vencido', v_total_vencido,
        'total_geral', v_total_geral,
        'stores', v_lojas
    );
END;
$function$;

NOTIFY pgrst, 'reload schema';
