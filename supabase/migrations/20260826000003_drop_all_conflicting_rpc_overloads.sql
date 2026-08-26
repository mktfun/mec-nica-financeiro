-- Migration: 20260826000003_drop_all_conflicting_rpc_overloads.sql
-- Description: Expurgar todas as sobrecargas duplicadas que causam PGRST203 no PostgREST e unificar as 5 RPCs canônicas

-- =========================================================================
-- STEP 1: DROP EXPLICITO DE TODAS AS SOBRECARGAS CONFLITANTES
-- =========================================================================

-- 1. get_daily_reconciliation_summary
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(date, boolean);
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(text, boolean);
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(date);
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(text);

-- 2. get_store_pos_triple_reconciliation
DROP FUNCTION IF EXISTS public.get_store_pos_triple_reconciliation(date);
DROP FUNCTION IF EXISTS public.get_store_pos_triple_reconciliation(text);
DROP FUNCTION IF EXISTS public.get_store_pos_triple_reconciliation(date, date);
DROP FUNCTION IF EXISTS public.get_store_pos_triple_reconciliation(text, text);

-- 3. get_raw_os_data
DROP FUNCTION IF EXISTS public.get_raw_os_data(uuid, date);
DROP FUNCTION IF EXISTS public.get_raw_os_data(text, date);
DROP FUNCTION IF EXISTS public.get_raw_os_data(text, text);

-- 4. get_store_financial_stats
DROP FUNCTION IF EXISTS public.get_store_financial_stats(uuid, date, date);
DROP FUNCTION IF EXISTS public.get_store_financial_stats(text, date, date);
DROP FUNCTION IF EXISTS public.get_store_financial_stats(text, text, text);

-- 5. get_receivables_summary
DROP FUNCTION IF EXISTS public.get_receivables_summary();
DROP FUNCTION IF EXISTS public.get_receivables_summary(date);
DROP FUNCTION IF EXISTS public.get_receivables_summary(text);


-- =========================================================================
-- STEP 2: CRIAÇÃO DAS 5 RPCs CANÔNICAS (100% POSTGREST-SAFE)
-- =========================================================================

-- 1. get_store_pos_triple_reconciliation (Canônica, Universal para 10 filiais)
CREATE OR REPLACE FUNCTION public.get_store_pos_triple_reconciliation(
    p_target_date text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
            COALESCE(r.rede_liquido, 0) as nao_entrou_valor,
            CASE 
                WHEN COALESCE(r.rede_liquido, 0) = 0 THEN 'sem_movimento'
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


-- 2. get_daily_reconciliation_summary (Canônica, Única e Universal)
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
    -- RAMAL 2: DIA ABERTO / DRAFT (Cálculo Dinâmico em Tempo Real)
    -- =========================================================================

    -- 1. Saldo Bancário Consolidado (10 contas Itaú)
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

    -- 8. Dinheiro no Cofre
    SELECT COALESCE(SUM(amount), 0)
    INTO v_dinheiro_lojas
    FROM store_cash_vault
    WHERE entry_date <= v_target_date 
      AND (
        status IN ('em_transito', 'pending')
        OR (status = 'depositado' AND deposited_at IS NOT NULL AND deposited_at::date > v_target_date)
      );

    -- 9. Cartões a Compensar (Chama a RPC de Conciliação Tripla Desacoplada)
    BEGIN
        v_triple_recon := get_store_pos_triple_reconciliation(v_target_date::text);
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

    -- 10. Detalhamento por Filial Universal
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
    patio_store AS (
        SELECT store_id, COALESCE(SUM(GREATEST(0, total_value - paid_value)), 0) as patio_val
        FROM patio_os
        WHERE opened_at <= (v_target_date || ' 23:59:59')::timestamp
          AND (closed_at IS NULL OR closed_at > (v_target_date || ' 23:59:59')::timestamp)
          AND LOWER(COALESCE(status, 'em_aberto')) NOT IN ('finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado')
        GROUP BY store_id
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'store_id', s.id,
        'store_name', s.name,
        'color', COALESCE(s.avatar_url, ''),
        'saldo_banco', COALESCE(r.bank_total, 0),
        'saldo_banco_ofx', COALESCE(r.bank_total, 0),
        'bank_balance', COALESCE(r.bank_total, 0),
        'dinheiro_loja', 0,
        'na_loja_os', COALESCE(p.patio_val, r.historical_na_loja, 0),
        'patio_os', COALESCE(p.patio_val, r.historical_na_loja, 0),
        'rede_bruto', COALESCE(pos.rede_bruto, 0),
        'rede_liquido', COALESCE(pos.rede_liquido, 0),
        'rede_devolucoes', COALESCE(pos.rede_devolucoes, 0),
        'ofx_maquininhas', COALESCE(pos.ofx_maquininhas, 0),
        'nao_entrou_maquininhas', COALESCE(pos.nao_entrou_valor, 0),
        'status_compensacao', COALESCE(pos.status_compensacao, 'sem_movimento'),
        'status', 'draft'
    ) ORDER BY s.name), '[]'::jsonb)
    INTO v_stores_detail
    FROM stores s
    LEFT JOIN recon_latest r ON r.store_id = s.id
    LEFT JOIN patio_store p ON p.store_id = s.id
    LEFT JOIN store_pos_summary pos ON pos.store_id = s.id
    WHERE s.active = true;

    -- 11. CÁLCULO CANÔNICO DO CAIXA ATUAL & PILARES
    v_total_saldo_banco := v_saldo_bancos + v_dinheiro_lojas + v_cartoes_a_compensar - v_devolucoes_rede;
    v_caixa_atual := v_total_saldo_banco + v_dinheiro_mp + v_a_receber + v_na_loja_os;
    v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;
    v_valor_disp_contas := v_faturamento_periodo - v_fluxo_caixa;
    v_subtotal_contas := v_contas_manual + v_juros_rede;
    v_diferenca_final := v_valor_disp_contas - v_subtotal_contas;
    v_status_geral := CASE WHEN ABS(v_diferenca_final) <= 50.00 THEN 'approved' ELSE 'divergent' END;

    RETURN jsonb_build_object(
        'date', v_target_date,
        'status_geral', v_status_geral,
        'is_closed', false,
        'closed_at', NULL,
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


-- 3. get_raw_os_data (Canônica)
CREATE OR REPLACE FUNCTION public.get_raw_os_data(p_store_id text, p_date text)
RETURNS TABLE(
    os_number text, 
    opened_at timestamp with time zone, 
    closed_at timestamp with time zone, 
    status text, 
    total_value numeric, 
    paid_value numeric, 
    remaining_value numeric, 
    payment_method text, 
    credit_debit_value numeric, 
    pix_transfer_value numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_date date := p_date::date;
BEGIN
  RETURN QUERY
  SELECT 
    po.os_number,
    po.opened_at,
    po.closed_at,
    po.status,
    po.total_value,
    po.paid_value,
    COALESCE(po.total_value, 0) - COALESCE(po.paid_value, 0) AS remaining_value,
    po.payment_method,
    po.credit_debit_value,
    po.pix_transfer_value
  FROM patio_os po
  WHERE po.store_id = p_store_id
    AND po.opened_at::date = v_date
  ORDER BY po.opened_at DESC;
END;
$$;


-- 4. get_store_financial_stats (Canônica)
CREATE OR REPLACE FUNCTION public.get_store_financial_stats(p_store_id text, p_start_date text, p_end_date text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_date date := p_start_date::date;
    v_end_date date := p_end_date::date;
    v_total_entradas numeric;
    v_total_saidas numeric;
    v_current_balance numeric;
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO v_total_entradas
    FROM transactions
    WHERE store_id = p_store_id AND target_date >= v_start_date AND target_date <= v_end_date AND type = 'in';

    SELECT ABS(COALESCE(SUM(amount), 0)) INTO v_total_saidas
    FROM transactions
    WHERE store_id = p_store_id AND target_date >= v_start_date AND target_date <= v_end_date AND type = 'out';

    SELECT COALESCE(caixa_atual, 0) INTO v_current_balance
    FROM daily_snapshots
    WHERE store_id = p_store_id AND date <= v_end_date
    ORDER BY date DESC LIMIT 1;

    RETURN jsonb_build_object(
        'store_id', p_store_id,
        'start_date', v_start_date,
        'end_date', v_end_date,
        'total_entradas', v_total_entradas,
        'total_saidas', v_total_saidas,
        'faturamento', v_total_entradas,
        'contas', v_total_saidas,
        'current_balance', v_current_balance
    );
END;
$$;


-- 5. get_receivables_summary (Canônica)
CREATE OR REPLACE FUNCTION public.get_receivables_summary(p_date text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_date date := COALESCE(p_date::date, CURRENT_DATE);
    v_total_pendente numeric := 0;
    v_total_recebido numeric := 0;
    v_total_vencido numeric := 0;
    v_total_geral numeric := 0;
    v_lojas jsonb;
BEGIN
    SELECT 
        COALESCE(SUM(CASE WHEN status = 'pendente' THEN value ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'recebido' THEN value ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'pendente' AND due_date < v_target_date THEN value ELSE 0 END), 0),
        COALESCE(SUM(value), 0)
    INTO v_total_pendente, v_total_recebido, v_total_vencido, v_total_geral
    FROM receivables
    WHERE date <= v_target_date;

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
$$;
