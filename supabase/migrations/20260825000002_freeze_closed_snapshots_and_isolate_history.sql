-- ==============================================================================
-- MIGRATION: 20260825000002_freeze_closed_snapshots_and_isolate_history.sql
-- DESCRIPTION: Congelamento imutável dos 5 snapshots homologados (17, 18, 19, 21, 24/08)
--              e isolamento temporal na RPC de conciliação.
-- ==============================================================================

-- 1. ADICIONAR COLUNAS DE CONTROLE DE FECHAMENTO EM daily_snapshots
ALTER TABLE public.daily_snapshots
ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- 2. GRAVAR OS 5 SNAPSHOTS OFICIAIS EXTRAÍDOS DAS PLANILHAS CANÔNICAS (DESKTOP)

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


-- 3. ATUALIZAR RPC CANÔNICA get_daily_reconciliation_summary
--    Bifurcação: se o dia estiver consolidado (is_closed = true), retorna a fotografia imutável
--    Se estiver aberto ou forçado, calcula dinamicamente com base nas tabelas operacionais.

DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(text);
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(text, boolean);

CREATE OR REPLACE FUNCTION public.get_daily_reconciliation_summary(
    p_date text,
    p_force_dynamic boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_date date := p_date::date;
    v_saldo_bancos numeric := 0;
    v_saldo_negativo_itau numeric := 0;
    v_dinheiro_lojas numeric := 0;
    v_cartoes_a_compensar numeric := 0;
    v_devolucoes_rede numeric := 0;
    v_total_saldo_banco numeric := 0;
    v_dinheiro_mp numeric := 0;
    v_a_receber numeric := 0;
    v_na_loja_os numeric := 0;
    v_caixa_atual numeric := 0;
    v_caixa_anterior numeric := 0;
    v_fluxo_caixa numeric := 0;
    v_faturamento_anterior numeric := 0;
    v_faturamento_oi_base numeric := 0;
    v_faturamento_ajustes numeric := 0;
    v_faturamento_periodo numeric := 0;
    v_valor_disp_contas numeric := 0;
    v_contas_base numeric := 0;
    v_contas_extras numeric := 0;
    v_contas_manual numeric := 0;
    v_juros_rede numeric := 0;
    v_subtotal_contas numeric := 0;
    v_diferenca_final numeric := 0;
    v_status_geral text := 'divergent';
    v_total_entradas_ofx numeric := 0;
    v_total_saidas_ofx numeric := 0;
    v_contas_itens jsonb := '[]'::jsonb;
    v_faturamento_itens jsonb := '[]'::jsonb;
    v_stores_detail jsonb := '[]'::jsonb;
    v_triple_recon jsonb := '{}'::jsonb;
    v_snapshot record;
    v_prev_snapshot record;
BEGIN
    -- 1. Obter Snapshot diário (se existir)
    SELECT * INTO v_snapshot
    FROM daily_snapshots
    WHERE date = v_target_date;

    -- =========================================================================
    -- RAMAL 1: DIA FECHADO & CONSOLIDADO (Snapshot Imutável)
    -- =========================================================================
    IF v_snapshot IS NOT NULL AND v_snapshot.is_closed = true AND p_force_dynamic = false THEN
        v_caixa_atual := COALESCE(v_snapshot.caixa_atual, 0);
        v_saldo_bancos := COALESCE(v_snapshot.saldo_bancario, 0);
        v_dinheiro_mp := COALESCE(v_snapshot.dinheiro_mp, 0);
        v_a_receber := COALESCE(v_snapshot.a_receber_manual, 0);
        v_na_loja_os := COALESCE(v_snapshot.total_patio, 0);
        v_saldo_negativo_itau := COALESCE(v_snapshot.saldo_negativo_itau, 0);
        v_juros_rede := COALESCE(v_snapshot.juros_rede, 0);
        
        -- Metadados congelados
        IF v_snapshot.metadata IS NOT NULL THEN
            v_caixa_anterior := COALESCE((v_snapshot.metadata->>'caixa_anterior')::numeric, 0);
            v_fluxo_caixa := COALESCE((v_snapshot.metadata->>'fluxo_caixa')::numeric, v_caixa_atual - v_caixa_anterior);
            v_faturamento_oi_base := COALESCE((v_snapshot.metadata->>'faturamento_oi_base')::numeric, 0);
            v_faturamento_ajustes := COALESCE((v_snapshot.metadata->>'faturamento_ajustes')::numeric, 0);
            v_faturamento_periodo := COALESCE((v_snapshot.metadata->>'faturamento_periodo')::numeric, v_faturamento_oi_base + v_faturamento_ajustes);
            v_valor_disp_contas := COALESCE((v_snapshot.metadata->>'valor_disp_contas')::numeric, v_faturamento_periodo - v_fluxo_caixa);
            v_contas_manual := COALESCE((v_snapshot.metadata->>'contas_manual')::numeric, v_snapshot.contas_a_pagar);
            v_subtotal_contas := COALESCE((v_snapshot.metadata->>'subtotal_contas')::numeric, v_contas_manual + v_juros_rede);
            v_diferenca_final := COALESCE((v_snapshot.metadata->>'diferenca_final')::numeric, v_valor_disp_contas - v_subtotal_contas);
            v_status_geral := COALESCE(v_snapshot.metadata->>'status_geral', 'approved');
            v_total_saldo_banco := COALESCE((v_snapshot.metadata->>'total_saldo_banco')::numeric, v_saldo_bancos);
        ELSE
            -- Buscar caixa anterior do snapshot fechado imediatamente anterior
            SELECT caixa_atual INTO v_caixa_anterior
            FROM daily_snapshots
            WHERE date < v_target_date
            ORDER BY date DESC LIMIT 1;

            v_fluxo_caixa := v_caixa_atual - COALESCE(v_caixa_anterior, 0);
            v_faturamento_periodo := COALESCE(v_snapshot.faturamento, 0);
            v_valor_disp_contas := v_faturamento_periodo - v_fluxo_caixa;
            v_contas_manual := COALESCE(v_snapshot.contas_a_pagar, 0);
            v_subtotal_contas := v_contas_manual + v_juros_rede;
            v_diferenca_final := v_valor_disp_contas - v_subtotal_contas;
            v_status_geral := CASE WHEN ABS(v_diferenca_final) <= 50.00 THEN 'approved' ELSE 'divergent' END;
            v_total_saldo_banco := v_saldo_bancos;
        END IF;

        -- Buscar detalhes por filial armazenados em reconciliations
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'store_id', s.id,
            'store_name', s.name,
            'color', COALESCE(s.avatar_url, ''),
            'saldo_banco', COALESCE(r.bank_total, 0),
            'saldo_banco_ofx', COALESCE(r.bank_total, 0),
            'bank_balance', COALESCE(r.bank_total, 0),
            'dinheiro_loja', 0,
            'na_loja_os', COALESCE(r.na_loja_os, 0),
            'patio_os', COALESCE(r.na_loja_os, 0),
            'status', 'approved'
        ) ORDER BY s.name), '[]'::jsonb)
        INTO v_stores_detail
        FROM stores s
        LEFT JOIN (
            SELECT DISTINCT ON (store_id) store_id, bank_total, na_loja_os
            FROM reconciliations
            WHERE date <= v_target_date
            ORDER BY store_id, date DESC
        ) r ON r.store_id = s.id
        WHERE s.active = true;

        RETURN jsonb_build_object(
            'date', v_target_date,
            'status_geral', v_status_geral,
            'is_closed', true,
            'closed_at', v_snapshot.closed_at,
            
            -- Pilares
            'saldo_bancos_ofx', v_saldo_bancos,
            'dinheiro_em_lojas', v_dinheiro_lojas,
            'cartoes_a_compensar', v_cartoes_a_compensar,
            'devolucoes_rede', v_devolucoes_rede,
            'total_saldo_banco', v_total_saldo_banco,
            'saldo_negativo_itau', v_saldo_negativo_itau,
            
            'dinheiro_mp', v_dinheiro_mp,
            'a_receber', v_a_receber,
            'na_loja_os', v_na_loja_os,
            
            'caixa_atual', v_caixa_atual,
            'caixa_anterior', v_caixa_anterior,
            'fluxo_caixa', v_fluxo_caixa,
            
            'faturamento_oi_base', v_faturamento_oi_base,
            'faturamento_ajustes', v_faturamento_ajustes,
            'faturamento_periodo', v_faturamento_periodo,
            'valor_disp_contas', v_valor_disp_contas,
            
            'contas_base', v_contas_base,
            'contas_extras', v_contas_extras,
            'contas_manual', v_contas_manual,
            'juros_rede', v_juros_rede,
            'subtotal_contas', v_subtotal_contas,
            'diferenca_final', v_diferenca_final,
            
            'total_entradas_ofx', v_total_entradas_ofx,
            'total_saidas_ofx', v_total_saidas_ofx,
            
            'contas_itens', v_contas_itens,
            'faturamento_itens', v_faturamento_itens,
            'stores', v_stores_detail,
            'stores_detail', v_stores_detail
        );
    END IF;

    -- =========================================================================
    -- RAMAL 2: DIA ABERTO / DRAFT / FORÇADO (Cálculo Dinâmico em Tempo Real)
    -- =========================================================================

    -- Saldo Bancário Consolidado (10 contas Itaú)
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

    -- Entradas e Saídas do OFX do dia
    SELECT 
        COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END), 0)
    INTO v_total_entradas_ofx, v_total_saidas_ofx
    FROM ofx_transactions
    WHERE target_date = v_target_date;

    -- Pátio de OSs em aberto
    SELECT COALESCE(SUM(GREATEST(0, COALESCE(total_value, 0) - COALESCE(paid_value, 0))), 0)
    INTO v_na_loja_os
    FROM patio_os
    WHERE opened_at <= (v_target_date || ' 23:59:59')::timestamp
      AND (closed_at IS NULL OR closed_at > (v_target_date || ' 23:59:59')::timestamp)
      AND LOWER(COALESCE(status, 'em_aberto')) NOT IN ('finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado');

    IF v_na_loja_os = 0 AND v_snapshot.total_patio IS NOT NULL THEN
        v_na_loja_os := v_snapshot.total_patio;
    END IF;

    -- Caixa Anterior (sempre consome o snapshot fechado anterior)
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

    -- Faturamento base
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

    -- Ajustes de Faturamento
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

    -- Contas a Pagar
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

    v_contas_base := COALESCE(v_snapshot.contas_a_pagar, 0);
    v_contas_manual := v_contas_base + v_contas_extras;

    -- Dinheiro no Cofre com Consistência Temporal e Cartões a Compensar
    SELECT COALESCE(SUM(amount), 0)
    INTO v_dinheiro_lojas
    FROM store_cash_vault
    WHERE entry_date <= v_target_date 
      AND (
        status IN ('em_transito', 'pending')
        OR (status = 'depositado' AND deposited_at IS NOT NULL AND deposited_at::date > v_target_date)
      );

    BEGIN
        v_triple_recon := get_store_pos_triple_reconciliation(v_target_date);
        IF v_triple_recon IS NOT NULL THEN
            v_cartoes_a_compensar := COALESCE((v_triple_recon->>'total_nao_entrou')::numeric, 0);
            v_devolucoes_rede := COALESCE((v_triple_recon->>'total_devolucoes')::numeric, 0);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_triple_recon := '{"stores": [], "total_nao_entrou": 0, "total_devolucoes": 0}'::jsonb;
        v_cartoes_a_compensar := 0;
        v_devolucoes_rede := 0;
    END;

    IF v_devolucoes_rede = 0 THEN
        SELECT COALESCE(SUM(ABS(net_amount)), 0)
        INTO v_devolucoes_rede
        FROM pos_transactions
        WHERE target_date = v_target_date AND transaction_type = 'devolucao';
    END IF;

    -- Detalhamento por Filial com Deduplicação e Mapeamento Completo
    WITH recon_latest AS (
        SELECT DISTINCT ON (store_id) store_id, bank_total, na_loja_os as historical_na_loja
        FROM reconciliations
        WHERE date <= v_target_date
        ORDER BY store_id, date DESC
    ),
    store_pos_summary AS (
        SELECT 
            (elem->>'store_id')::text as store_id,
            COALESCE((elem->>'rede_bruto')::numeric, 0) as rede_bruto,
            COALESCE((elem->>'rede_liquido')::numeric, 0) as rede_liquido,
            COALESCE((elem->>'rede_devolucoes')::numeric, 0) as rede_devolucoes,
            COALESCE((elem->>'ofx_maquininhas')::numeric, 0) as ofx_maquininhas,
            COALESCE((elem->>'nao_entrou_valor')::numeric, 0) as nao_entrou_valor,
            COALESCE((elem->>'status_compensacao')::text, 'sem_movimento') as status_compensacao
        FROM jsonb_array_elements(COALESCE(v_triple_recon->'stores', '[]'::jsonb)) as elem
    ),
    rede_store AS (
        SELECT store_id, COALESCE(SUM(amount), 0) as rede_in
        FROM ofx_transactions
        WHERE target_date = v_target_date AND type = 'in'
          AND (
            counterpart_name ILIKE '%REDE%' OR counterpart_name ILIKE '%CIELO%' OR 
            counterpart_name ILIKE '%GETNET%' OR counterpart_name ILIKE '%STONE%' OR 
            counterpart_name ILIKE '%REDECARD%' OR counterpart_name ILIKE '%MAST%' OR 
            counterpart_name ILIKE '%VISA%' OR counterpart_name ILIKE '%ELO%' OR 
            counterpart_name ILIKE '%PAGSEGURO%' OR counterpart_name ILIKE '%ADQ%' OR 
            counterpart_name ILIKE '%CART%' OR fitid ILIKE '%REDE%' OR fitid ILIKE '%CIELO%'
          )
        GROUP BY store_id
    ),
    pix_os_store AS (
        SELECT store_id, COALESCE(SUM(amount), 0) as pix_os
        FROM ofx_transactions
        WHERE target_date = v_target_date AND type = 'in'
          AND matched_os_number IS NOT NULL
          AND NOT (
            counterpart_name ILIKE '%REDE%' OR counterpart_name ILIKE '%CIELO%' OR 
            counterpart_name ILIKE '%GETNET%' OR counterpart_name ILIKE '%STONE%' OR 
            counterpart_name ILIKE '%REDECARD%' OR counterpart_name ILIKE '%MAST%' OR 
            counterpart_name ILIKE '%VISA%' OR counterpart_name ILIKE '%ELO%' OR 
            counterpart_name ILIKE '%PAGSEGURO%' OR counterpart_name ILIKE '%ADQ%' OR 
            counterpart_name ILIKE '%CART%' OR fitid ILIKE '%REDE%' OR fitid ILIKE '%CIELO%'
          )
        GROUP BY store_id
    ),
    justified_other_store AS (
        SELECT store_id, COALESCE(SUM(amount), 0) as justified_other
        FROM ofx_transactions
        WHERE target_date = v_target_date AND type = 'in'
          AND (manual_category IS NOT NULL OR manual_justification IS NOT NULL)
          AND matched_os_number IS NULL
          AND NOT (
            counterpart_name ILIKE '%REDE%' OR counterpart_name ILIKE '%CIELO%' OR 
            counterpart_name ILIKE '%GETNET%' OR counterpart_name ILIKE '%STONE%' OR 
            counterpart_name ILIKE '%REDECARD%' OR counterpart_name ILIKE '%MAST%' OR 
            counterpart_name ILIKE '%VISA%' OR counterpart_name ILIKE '%ELO%' OR 
            counterpart_name ILIKE '%PAGSEGURO%' OR counterpart_name ILIKE '%ADQ%' OR 
            counterpart_name ILIKE '%CART%' OR fitid ILIKE '%REDE%' OR fitid ILIKE '%CIELO%'
          )
        GROUP BY store_id
    ),
    ofx_in_store AS (
        SELECT store_id, COALESCE(SUM(amount), 0) as ofx_in_total
        FROM ofx_transactions
        WHERE target_date = v_target_date AND type = 'in'
        GROUP BY store_id
    ),
    patio_store AS (
        SELECT store_id, COALESCE(SUM(GREATEST(0, COALESCE(total_value, 0) - COALESCE(paid_value, 0))), 0) as patio_val
        FROM patio_os
        WHERE opened_at <= (v_target_date || ' 23:59:59')::timestamp
          AND (closed_at IS NULL OR closed_at > (v_target_date || ' 23:59:59')::timestamp)
          AND LOWER(COALESCE(status, 'em_aberto')) NOT IN ('finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado')
        GROUP BY store_id
    ),
    vault_store AS (
        SELECT 
            store_id, 
            COALESCE(SUM(amount), 0) as vault_val,
            COALESCE(jsonb_agg(jsonb_build_object(
                'id', id,
                'amount', amount,
                'description', description,
                'entry_date', entry_date,
                'status', status,
                'deposited_at', deposited_at,
                'os_number_ref', os_number_ref
            )), '[]'::jsonb) as vault_entries
        FROM store_cash_vault
        WHERE entry_date <= v_target_date 
          AND (
            status IN ('em_transito', 'pending')
            OR (status = 'depositado' AND deposited_at IS NOT NULL AND deposited_at::date > v_target_date)
          )
        GROUP BY store_id
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'store_id', s.id,
        'store_name', s.name,
        'color', COALESCE(s.avatar_url, ''),
        'saldo_banco', COALESCE(r.bank_total, 0),
        'saldo_banco_ofx', COALESCE(r.bank_total, 0),
        'bank_balance', COALESCE(r.bank_total, 0),
        'dinheiro_loja', COALESCE(v.vault_val, 0),
        'cash_vault', COALESCE(v.vault_val, 0),
        'vault_entries', COALESCE(v.vault_entries, '[]'::jsonb),
        'maquininha', COALESCE(rs.rede_in, ps.ofx_maquininhas, 0),
        'rede_bruto', COALESCE(ps.rede_bruto, 0),
        'rede_liquido', COALESCE(ps.rede_liquido, 0),
        'rede_devolucoes', COALESCE(ps.rede_devolucoes, 0),
        'rede_ofx', COALESCE(rs.rede_in, ps.ofx_maquininhas, 0),
        'cartoes_a_compensar', COALESCE(ps.nao_entrou_valor, 0),
        'nao_entrou_valor', COALESCE(ps.nao_entrou_valor, 0),
        'status_compensacao', COALESCE(ps.status_compensacao, 'sem_movimento'),
        'pix', COALESCE(pos.pix_os, 0),
        'pix_os_ofx', COALESCE(pos.pix_os, 0),
        'justified_other_ofx', COALESCE(jos.justified_other, 0),
        'na_loja_os', COALESCE(p.patio_val, r.historical_na_loja, 0),
        'patio_os', COALESCE(p.patio_val, r.historical_na_loja, 0),
        'previsto_ofx', COALESCE(ois.ofx_in_total, 0),
        'diferenca', GREATEST(0, COALESCE(ois.ofx_in_total, 0) - COALESCE(rs.rede_in, 0) - COALESCE(pos.pix_os, 0) - COALESCE(jos.justified_other, 0)),
        'status', CASE 
            WHEN GREATEST(0, COALESCE(ois.ofx_in_total, 0) - COALESCE(rs.rede_in, 0) - COALESCE(pos.pix_os, 0) - COALESCE(jos.justified_other, 0)) <= 0.05 THEN 'approved' 
            ELSE 'divergence' 
        END
    ) ORDER BY s.name), '[]'::jsonb)
    INTO v_stores_detail
    FROM stores s
    LEFT JOIN recon_latest r ON r.store_id = s.id
    LEFT JOIN patio_store p ON p.store_id = s.id
    LEFT JOIN vault_store v ON v.store_id = s.id
    LEFT JOIN store_pos_summary ps ON ps.store_id = s.id
    LEFT JOIN rede_store rs ON rs.store_id = s.id
    LEFT JOIN pix_os_store pos ON pos.store_id = s.id
    LEFT JOIN justified_other_store jos ON jos.store_id = s.id
    LEFT JOIN ofx_in_store ois ON ois.store_id = s.id
    WHERE s.active = true;

    -- Apuração Consolidada do Fechamento
    v_total_saldo_banco := v_saldo_bancos + v_dinheiro_lojas + v_cartoes_a_compensar;
    v_caixa_atual := v_total_saldo_banco + v_dinheiro_mp + v_a_receber + v_na_loja_os;
    v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;
    v_valor_disp_contas := v_faturamento_periodo - v_fluxo_caixa;
    v_subtotal_contas := v_contas_manual + v_juros_rede;
    v_diferenca_final := v_valor_disp_contas - v_subtotal_contas;

    IF ABS(v_diferenca_final) <= 50.00 THEN
        v_status_geral := 'approved';
    ELSE
        v_status_geral := 'divergent';
    END IF;

    RETURN jsonb_build_object(
        'date', v_target_date,
        'status_geral', v_status_geral,
        'is_closed', COALESCE(v_snapshot.is_closed, false),
        'closed_at', v_snapshot.closed_at,
        
        -- Pilares
        'saldo_bancos_ofx', v_saldo_bancos,
        'dinheiro_em_lojas', v_dinheiro_lojas,
        'cartoes_a_compensar', v_cartoes_a_compensar,
        'devolucoes_rede', v_devolucoes_rede,
        'total_saldo_banco', v_total_saldo_banco,
        'saldo_negativo_itau', v_saldo_negativo_itau,
        
        'dinheiro_mp', v_dinheiro_mp,
        'a_receber', v_a_receber,
        'na_loja_os', v_na_loja_os,
        
        'caixa_atual', v_caixa_atual,
        'caixa_anterior', v_caixa_anterior,
        'fluxo_caixa', v_fluxo_caixa,
        
        'faturamento_oi_base', v_faturamento_oi_base,
        'faturamento_ajustes', v_faturamento_ajustes,
        'faturamento_periodo', v_faturamento_periodo,
        'valor_disp_contas', v_valor_disp_contas,
        
        'contas_base', v_contas_base,
        'contas_extras', v_contas_extras,
        'contas_manual', v_contas_manual,
        'juros_rede', v_juros_rede,
        'subtotal_contas', v_subtotal_contas,
        'diferenca_final', v_diferenca_final,
        
        'total_entradas_ofx', v_total_entradas_ofx,
        'total_saidas_ofx', v_total_saidas_ofx,
        
        'contas_itens', v_contas_itens,
        'faturamento_itens', v_faturamento_itens,
        'stores', v_stores_detail,
        'stores_detail', v_stores_detail
    );
END;
$$;
