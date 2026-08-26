-- Migration: 20260826000007_fix_store_real_divergence_and_justifications.sql
-- Description: Correção canônica da diferença por loja (somando apenas transações de extrato órfãs/pendentes)

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
    v_contas_imported_bills numeric := 0;
    v_contas_extras numeric := 0;
    v_contas_manual numeric := 0;
    v_total_bills numeric := 0;
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
            'vault_entries', '[]'::jsonb,
            'na_loja_os', COALESCE(r.na_loja_os, 0),
            'patio_os', COALESCE(r.na_loja_os, 0),
            'maquininha', 0,
            'rede_liquido', 0,
            'rede_bruto', 0,
            'rede_devolucoes', 0,
            'pix', 0,
            'pix_os', 0,
            'previsto_ofx', 0,
            'diferenca', 0,
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

    -- 7. Contas a Pagar: DEDUPLICAÇÃO CANÔNICA DE PONTA A PONTA
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN external_code IS NULL THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN external_code IS NOT NULL THEN amount ELSE 0 END), 0),
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', id,
            'title', title,
            'amount', amount,
            'category', category,
            'description', description,
            'store_id', store_id,
            'external_code', external_code
        )), '[]'::jsonb)
    INTO v_total_bills, v_contas_extras, v_contas_imported_bills, v_contas_itens
    FROM daily_manual_bills
    WHERE date = v_target_date;

    IF v_total_bills > 0 THEN
        v_contas_manual := v_total_bills;
        v_contas_base := v_contas_imported_bills;
    ELSE
        v_contas_base := COALESCE(v_snapshot.contas_a_pagar, 0);
        v_contas_manual := v_contas_base;
    END IF;

    -- 8. Dinheiro no Cofre (Global)
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

    -- 10. Detalhamento por Filial Universal (Com Diferença Real Baseada em Pendências de Extrato)
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
    ),
    pix_store AS (
        SELECT 
            store_id,
            COALESCE(SUM(amount), 0) as pix_total
        FROM ofx_transactions
        WHERE target_date = v_target_date 
          AND type = 'in'
          AND (
              matched_os_number IS NOT NULL 
              OR counterpart_name ILIKE '%PIX%' 
              OR fitid ILIKE '%PIX%' 
              OR fitid ILIKE '%TRANSF%'
          )
          AND NOT (
              counterpart_name ILIKE '%REDE%' 
              OR counterpart_name ILIKE '%REDECARD%' 
              OR counterpart_name ILIKE '%CIELO%' 
              OR counterpart_name ILIKE '%STONE%' 
              OR counterpart_name ILIKE '%PAGSEGURO%'
              OR fitid ILIKE '%REDE%'
              OR bank_name ILIKE '%REDE%'
          )
        GROUP BY store_id
    ),
    ofx_store_in AS (
        SELECT 
            store_id,
            COALESCE(SUM(amount), 0) as entradas_total
        FROM ofx_transactions
        WHERE target_date = v_target_date AND type = 'in'
        GROUP BY store_id
    ),
    ofx_pending_store AS (
        SELECT 
            store_id,
            COALESCE(SUM(amount), 0) as pending_total
        FROM ofx_transactions
        WHERE target_date = v_target_date
          AND matched_os_number IS NULL
          AND manual_category IS NULL
          AND NOT (
              counterpart_name ILIKE '%REDE%' 
              OR counterpart_name ILIKE '%REDECARD%' 
              OR counterpart_name ILIKE '%CIELO%' 
              OR counterpart_name ILIKE '%STONE%' 
              OR counterpart_name ILIKE '%PAGSEGURO%'
              OR fitid ILIKE '%REDE%'
              OR bank_name ILIKE '%REDE%'
              OR type = 'out'
          )
        GROUP BY store_id
    ),
    store_vault AS (
        SELECT 
            store_id,
            COALESCE(SUM(amount), 0) as dinheiro_loja,
            jsonb_agg(jsonb_build_object(
                'id', id,
                'amount', amount,
                'status', status,
                'entry_date', entry_date,
                'description', description
            )) as vault_entries
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
        'saldo_banco', COALESCE(r.bank_total, 0) + COALESCE(v.dinheiro_loja, 0) + COALESCE(pos.nao_entrou_valor, 0),
        'saldo_banco_ofx', COALESCE(r.bank_total, 0),
        'bank_balance', COALESCE(r.bank_total, 0),
        'dinheiro_loja', COALESCE(v.dinheiro_loja, 0),
        'vault_entries', COALESCE(v.vault_entries, '[]'::jsonb),
        'na_loja_os', COALESCE(p.patio_val, r.historical_na_loja, 0),
        'patio_os', COALESCE(p.patio_val, r.historical_na_loja, 0),
        'maquininha', COALESCE(pos.rede_liquido, 0),
        'rede_bruto', COALESCE(pos.rede_bruto, 0),
        'rede_liquido', COALESCE(pos.rede_liquido, 0),
        'rede_devolucoes', COALESCE(pos.rede_devolucoes, 0),
        'ofx_maquininhas', COALESCE(pos.ofx_maquininhas, 0),
        'nao_entrou_maquininhas', COALESCE(pos.nao_entrou_valor, 0),
        'nao_entrou_valor', COALESCE(pos.nao_entrou_valor, 0),
        'pix', COALESCE(pix.pix_total, 0),
        'pix_os', COALESCE(pix.pix_total, 0),
        'previsto_ofx', COALESCE(pos.rede_liquido, 0) + COALESCE(pix.pix_total, 0),
        'diferenca', COALESCE(pend.pending_total, 0),
        'status_compensacao', COALESCE(pos.status_compensacao, 'sem_movimento'),
        'status', CASE WHEN COALESCE(pend.pending_total, 0) = 0 THEN 'approved' ELSE 'divergent' END
    ) ORDER BY s.name), '[]'::jsonb)
    INTO v_stores_detail
    FROM stores s
    LEFT JOIN recon_latest r ON r.store_id = s.id
    LEFT JOIN patio_store p ON p.store_id = s.id
    LEFT JOIN store_pos_summary pos ON pos.store_id = s.id
    LEFT JOIN pix_store pix ON pix.store_id = s.id
    LEFT JOIN ofx_store_in ofx_in ON ofx_in.store_id = s.id
    LEFT JOIN ofx_pending_store pend ON pend.store_id = s.id
    LEFT JOIN store_vault v ON v.store_id = s.id
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
