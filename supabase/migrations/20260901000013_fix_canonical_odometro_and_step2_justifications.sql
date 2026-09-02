-- ============================================================================
-- Migration: 20260901000013_fix_canonical_odometro_and_step2_justifications.sql
-- Description: Correção definitiva do encadeamento de odômetro anterior (Delta Faturamento),
--              integração de justificativas de Entradas (daily_revenue_adjustments)
--              e Saídas (daily_manual_bills) e blindagem da Diferença Final.
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
    
    v_saldo_bancos numeric := 0; v_saldo_bancos_positivo numeric := 0; v_saldo_negativo_itau numeric := 0;
    v_dinheiro_lojas numeric := 0; v_cartoes_a_compensar numeric := 0; v_devolucoes_rede numeric := 0;
    v_total_saldo_banco numeric := 0; v_total_saldo_banco_positivo numeric := 0; v_dinheiro_mp numeric := 0;
    v_a_receber numeric := 0; v_na_loja_os numeric := 0; v_caixa_atual numeric := 0; v_caixa_anterior numeric := 0;
    v_fluxo_caixa numeric := 0; v_odometro_hoje numeric := 0; v_faturamento_oi_base numeric := 0; v_faturamento_ajustes numeric := 0;
    v_faturamento_periodo numeric := 0; v_faturamento_anterior numeric := 0; v_faturamento_itens jsonb := '[]'::jsonb;
    v_valor_disp_contas numeric := 0; v_contas_base numeric := 0; v_contas_extras numeric := 0;
    v_contas_manual numeric := 0; v_total_bills numeric := 0; v_contas_imported_bills numeric := 0;
    v_juros_rede numeric := 0; v_subtotal_contas numeric := 0; v_diferenca_final numeric := 0;
    v_status_geral text := 'divergent'; v_contas_itens jsonb := '[]'::jsonb;
    v_total_entradas_ofx numeric := 0; v_total_saidas_ofx numeric := 0;
    v_ofx_justified_inflow numeric := 0;
    v_triple_recon jsonb; v_stores_detail jsonb := '[]'::jsonb;
BEGIN
    SELECT * INTO v_snapshot FROM daily_snapshots WHERE date = v_target_date;
    IF FOUND THEN v_snapshot_found := true; END IF;

    -- =========================================================================
    -- APURAÇÃO DAS CTEs POR FILIAL (Split Canônico de Entradas e Saídas)
    -- =========================================================================
    WITH rede_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(CASE WHEN COALESCE(transaction_type, '') != 'devolucao' THEN gross_amount ELSE 0 END), 0) as rede_bruto,
            COALESCE(SUM(CASE WHEN COALESCE(transaction_type, '') != 'devolucao' THEN net_amount ELSE 0 END), 0) as rede_liquido,
            COALESCE(SUM(CASE WHEN COALESCE(transaction_type, '') != 'devolucao' THEN fee_amount ELSE 0 END), 0) as rede_taxas,
            COALESCE(SUM(CASE WHEN COALESCE(transaction_type, '') = 'devolucao' THEN ABS(net_amount) ELSE 0 END), 0) as rede_devolucoes
        FROM pos_transactions
        WHERE COALESCE(target_date, occurred_at::date) = v_target_date
        GROUP BY TRIM(store_id::text)
    ),
    ofx_entradas_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(amount), 0) as ofx_entradas_total,
            COALESCE(SUM(CASE 
                WHEN (counterpart_name ILIKE '%REDE%' OR counterpart_name ILIKE '%REDECARD%' OR counterpart_name ILIKE '%CIELO%' OR counterpart_name ILIKE '%STONE%' OR counterpart_name ILIKE '%PAGSEGURO%' OR counterpart_name ILIKE '%GETNET%' OR fitid ILIKE '%REDE%' OR fitid ILIKE '%CIELO%' OR fitid ILIKE '%STONE%' OR fitid ILIKE '%PAGSEGURO%')
                THEN amount ELSE 0 END), 0) as ofx_maquininhas,
            COALESCE(SUM(CASE 
                WHEN (matched_os_number IS NOT NULL OR counterpart_name ILIKE '%PIX%' OR fitid ILIKE '%PIX%' OR fitid ILIKE '%TRANSF%')
                  AND NOT (counterpart_name ILIKE '%REDE%' OR counterpart_name ILIKE '%REDECARD%' OR fitid ILIKE '%REDE%')
                THEN amount ELSE 0 END), 0) as pix_total,
            COALESCE(SUM(CASE 
                WHEN (manual_category IS NOT NULL AND TRIM(manual_category) != '')
                  OR (manual_justification IS NOT NULL AND TRIM(manual_justification) != '')
                THEN amount ELSE 0 END), 0) as entradas_justificadas,
            COALESCE(SUM(CASE 
                WHEN matched_os_number IS NULL 
                  AND (manual_category IS NULL OR TRIM(manual_category) = '')
                  AND (manual_justification IS NULL OR TRIM(manual_justification) = '')
                  AND NOT (
                      counterpart_name ILIKE '%REDE%' OR counterpart_name ILIKE '%REDECARD%' OR 
                      counterpart_name ILIKE '%CIELO%' OR counterpart_name ILIKE '%STONE%' OR 
                      counterpart_name ILIKE '%PAGSEGURO%' OR counterpart_name ILIKE '%GETNET%' OR 
                      fitid ILIKE '%REDE%' OR fitid ILIKE '%CIELO%' OR fitid ILIKE '%STONE%' OR fitid ILIKE '%PAGSEGURO%'
                  )
                THEN amount ELSE 0 END), 0) as entradas_orfas
        FROM ofx_transactions
        WHERE COALESCE(target_date, occurred_at::date) = v_target_date AND type = 'in'
        GROUP BY TRIM(store_id::text)
    ),
    ofx_saidas_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(ABS(amount)), 0) as ofx_saidas_total,
            COALESCE(SUM(CASE 
                WHEN matched_bill_id IS NOT NULL
                  OR (manual_category IS NOT NULL AND TRIM(manual_category) != '')
                  OR (manual_justification IS NOT NULL AND TRIM(manual_justification) != '')
                THEN ABS(amount) ELSE 0 END), 0) as saidas_justificadas,
            COALESCE(SUM(CASE 
                WHEN matched_bill_id IS NULL
                  AND (manual_category IS NULL OR TRIM(manual_category) = '')
                  AND (manual_justification IS NULL OR TRIM(manual_justification) = '')
                THEN ABS(amount)
                ELSE 0
            END), 0) as saidas_orfas
        FROM ofx_transactions
        WHERE COALESCE(target_date, occurred_at::date) = v_target_date AND type = 'out'
        GROUP BY TRIM(store_id::text)
    ),
    bills_store_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(amount), 0) as contas_loja_total
        FROM daily_manual_bills
        WHERE date = v_target_date AND COALESCE(contabilizar_no_subtotal, true) = true
        GROUP BY TRIM(store_id::text)
    ),
    patio_agg AS (
        SELECT TRIM(store_id::text) as store_id, COALESCE(SUM(GREATEST(0, total_value - paid_value)), 0) as patio_total
        FROM patio_os
        WHERE opened_at <= (v_target_date || ' 23:59:59')::timestamp
          AND (closed_at IS NULL OR closed_at::date > v_target_date)
          AND LOWER(COALESCE(status, 'em_aberto')) NOT IN ('finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado')
          AND (COALESCE(total_value, 0) - COALESCE(paid_value, 0)) > 0.05
        GROUP BY TRIM(store_id::text)
    ),
    vault_agg AS (
        SELECT TRIM(store_id::text) as store_id, COALESCE(SUM(amount), 0) as vault_total
        FROM store_cash_vault
        WHERE entry_date <= v_target_date
          AND (status IN ('em_transito', 'pending') OR (status = 'depositado' AND deposited_at IS NOT NULL AND deposited_at::date > v_target_date))
        GROUP BY TRIM(store_id::text)
    ),
    recon_latest AS (
        SELECT DISTINCT ON (TRIM(store_id::text)) 
            TRIM(store_id::text) as store_id, bank_total, na_loja_os as historical_na_loja
        FROM reconciliations
        WHERE date <= v_target_date
        ORDER BY TRIM(store_id::text), date DESC
    )
    SELECT jsonb_agg(jsonb_build_object(
        'store_id', s.id,
        'store_name', s.name,
        'saldo_banco_ofx', COALESCE(r.bank_total, 0),
        'saldo_banco_itau', COALESCE(r.bank_total, 0),
        'saldo_banco', (COALESCE(r.bank_total, 0) + COALESCE(v.vault_total, 0) + GREATEST(0, COALESCE(rd.rede_liquido, 0) - COALESCE(oe.ofx_maquininhas, 0))),
        'rede_total', COALESCE(rd.rede_liquido, 0),
        'maquininha', COALESCE(rd.rede_liquido, 0),
        'rede_bruto', COALESCE(rd.rede_bruto, 0),
        'rede_liquido', COALESCE(rd.rede_liquido, 0),
        'rede_taxas', COALESCE(rd.rede_taxas, 0),
        'ofx_maquininhas', COALESCE(oe.ofx_maquininhas, 0),
        'nao_entrou_valor', GREATEST(0, COALESCE(rd.rede_liquido, 0) - COALESCE(oe.ofx_maquininhas, 0)),
        'pix_total', COALESCE(oe.pix_total, 0),
        'pix_os', COALESCE(oe.pix_total, 0),
        'pix', COALESCE(oe.pix_total, 0),
        'na_loja_os', COALESCE(p.patio_total, r.historical_na_loja, 0),
        'patio_os', COALESCE(p.patio_total, r.historical_na_loja, 0),
        'dinheiro_loja', COALESCE(v.vault_total, 0),
        
        -- Métricas de Entradas (Subtração Linear)
        'ofx_entradas_total', COALESCE(oe.ofx_entradas_total, 0),
        'entradas_realizadas', COALESCE(oe.ofx_entradas_total, 0),
        'entradas_conciliadas', (COALESCE(oe.ofx_entradas_total, 0) - COALESCE(oe.entradas_orfas, 0)),
        'entradas_previsto', (COALESCE(oe.ofx_entradas_total, 0) - COALESCE(oe.entradas_orfas, 0)),
        'previsto_vendas_total', (COALESCE(rd.rede_liquido, 0) + COALESCE(oe.pix_total, 0) + COALESCE(v.vault_total, 0) + COALESCE(oe.entradas_justificadas, 0)),
        'previsto_ofx', (COALESCE(rd.rede_liquido, 0) + COALESCE(oe.pix_total, 0)),
        'dif_entradas', COALESCE(oe.entradas_orfas, 0),
        'diferenca_entradas', COALESCE(oe.entradas_orfas, 0),
        
        -- Métricas de Saídas (Subtração Linear)
        'ofx_saidas_total', COALESCE(sofx.ofx_saidas_total, 0),
        'saidas_ofx', COALESCE(sofx.ofx_saidas_total, 0),
        'contas_loja_total', COALESCE(bst.contas_loja_total, 0),
        'contas_loja', (COALESCE(sofx.ofx_saidas_total, 0) - COALESCE(sofx.saidas_orfas, 0)),
        'contas_conciliadas', (COALESCE(sofx.ofx_saidas_total, 0) - COALESCE(sofx.saidas_orfas, 0)),
        'dif_saidas', COALESCE(sofx.saidas_orfas, 0),
        'diferenca_saidas', COALESCE(sofx.saidas_orfas, 0),
        
        -- Diferença Líquida & Status
        'diferenca_total', (COALESCE(oe.entradas_orfas, 0) - COALESCE(sofx.saidas_orfas, 0)),
        'diferenca', (COALESCE(oe.entradas_orfas, 0) - COALESCE(sofx.saidas_orfas, 0)),
        'status_compensacao', CASE 
            WHEN COALESCE(rd.rede_liquido, 0) = 0 AND COALESCE(oe.ofx_maquininhas, 0) = 0 THEN 'sem_movimento'
            WHEN GREATEST(0, COALESCE(rd.rede_liquido, 0) - COALESCE(oe.ofx_maquininhas, 0)) = 0 THEN 'entrou'
            WHEN COALESCE(oe.ofx_maquininhas, 0) > 0 AND GREATEST(0, COALESCE(rd.rede_liquido, 0) - COALESCE(oe.ofx_maquininhas, 0)) > 0 THEN 'parcial'
            ELSE 'a_compensar'
        END,
        'status', CASE WHEN ABS(COALESCE(oe.entradas_orfas, 0) - COALESCE(sofx.saidas_orfas, 0)) <= 0.05 THEN 'approved' ELSE 'divergent' END
    ))
    INTO v_stores_detail
    FROM stores s
    LEFT JOIN recon_latest r ON r.store_id = TRIM(s.id::text)
    LEFT JOIN rede_agg rd ON rd.store_id = TRIM(s.id::text)
    LEFT JOIN ofx_entradas_agg oe ON oe.store_id = TRIM(s.id::text)
    LEFT JOIN ofx_saidas_agg sofx ON sofx.store_id = TRIM(s.id::text)
    LEFT JOIN bills_store_agg bst ON bst.store_id = TRIM(s.id::text)
    LEFT JOIN patio_agg p ON p.store_id = TRIM(s.id::text)
    LEFT JOIN vault_agg v ON v.store_id = TRIM(s.id::text)
    WHERE s.active = true;

    -- =========================================================================
    -- RESGATE DO ODÔMETRO E CAIXA DO DIA ANTERIOR (Universal para Ramal 1 e 2)
    -- =========================================================================
    SELECT 
        COALESCE(caixa_atual, 0),
        CASE 
            WHEN faturamento > 100000 THEN faturamento
            WHEN (metadata->>'odometro_anterior')::numeric > 100000 THEN (metadata->>'odometro_anterior')::numeric
            WHEN (metadata->>'faturamento_anterior')::numeric > 100000 THEN (metadata->>'faturamento_anterior')::numeric
            ELSE COALESCE(faturamento, 0)
        END
    INTO v_caixa_anterior, v_faturamento_anterior
    FROM daily_snapshots
    WHERE date < v_target_date
      AND (faturamento > 0 OR (metadata->>'odometro_hoje')::numeric > 0)
    ORDER BY date DESC
    LIMIT 1;

    -- =========================================================================
    -- RAMAL 1: SNAPSHOT FECHADO (Leitura Segura O-1 com Atualização Dinâmica de Ajustes)
    -- =========================================================================
    IF v_snapshot_found AND v_snapshot.is_closed = true AND p_force_dynamic = false THEN
        v_saldo_bancos := COALESCE(v_snapshot.saldo_bancario, 0);
        v_saldo_bancos_positivo := COALESCE((v_snapshot.metadata->>'saldo_bancos_positivo')::numeric, v_saldo_bancos);
        v_saldo_negativo_itau := COALESCE(v_snapshot.saldo_negativo_itau, (v_snapshot.metadata->>'saldo_negativo_itau')::numeric, 0);

        IF v_saldo_bancos = 0 THEN
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
        END IF;

        v_dinheiro_mp := COALESCE(v_snapshot.dinheiro_mp, 0);
        v_a_receber := COALESCE(v_snapshot.a_receber_manual, 0);
        v_na_loja_os := COALESCE(v_snapshot.total_patio, 0);
        v_caixa_atual := COALESCE(v_snapshot.caixa_atual, 0);
        v_caixa_anterior := COALESCE(NULLIF((v_snapshot.metadata->>'caixa_anterior')::numeric, 0), v_caixa_anterior);
        v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;
        v_odometro_hoje := COALESCE((v_snapshot.metadata->>'odometro_hoje')::numeric, v_snapshot.faturamento, 0);
        
        -- Cálculo exato do Delta Faturamento
        IF v_odometro_hoje > 100000 AND v_faturamento_anterior > 100000 AND v_odometro_hoje > v_faturamento_anterior THEN
            v_faturamento_oi_base := v_odometro_hoje - v_faturamento_anterior;
        ELSIF (v_snapshot.metadata->>'faturamento_periodo')::numeric > 0 AND (v_snapshot.metadata->>'faturamento_periodo')::numeric < 100000 THEN
            v_faturamento_oi_base := (v_snapshot.metadata->>'faturamento_periodo')::numeric;
        ELSE
            v_faturamento_oi_base := COALESCE((v_snapshot.metadata->>'faturamento_oi_base')::numeric, v_snapshot.faturamento, 0);
        END IF;
        
        -- Busca ajustes de daily_revenue_adjustments
        SELECT 
            COALESCE(SUM(CASE WHEN type IN ('deduction', 'estorno') THEN -ABS(amount) ELSE ABS(amount) END), 0),
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

        -- Sincronização com entradas OFX justificadas para faturamento
        SELECT COALESCE(SUM(amount), 0)
        INTO v_ofx_justified_inflow
        FROM ofx_transactions
        WHERE COALESCE(target_date, occurred_at::date) = v_target_date 
          AND type = 'in'
          AND (
              (
                  manual_category IS NOT NULL 
                  AND TRIM(manual_category) != ''
                  AND manual_category NOT ILIKE '%[Apenas Conciliar]%'
                  AND manual_category NOT ILIKE '%[NÃO SOMAR]%'
                  AND manual_category NOT ILIKE '%rendimento%'
              )
              OR (
                  manual_justification IS NOT NULL
                  AND TRIM(manual_justification) != ''
                  AND manual_justification NOT ILIKE '%[NÃO SOMAR]%'
              )
          )
          AND NOT EXISTS (
              SELECT 1 FROM daily_revenue_adjustments dra WHERE dra.id = ofx_transactions.id
          );

        v_faturamento_ajustes := v_faturamento_ajustes + v_ofx_justified_inflow;
        v_faturamento_periodo := v_faturamento_oi_base + v_faturamento_ajustes;
        
        -- Contas a Pagar dinâmicas
        SELECT 
            COALESCE(SUM(CASE WHEN COALESCE(contabilizar_no_subtotal, true) = true THEN amount ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN COALESCE(contabilizar_no_subtotal, true) = true AND (is_extra = true OR external_code IS NULL) THEN amount ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN COALESCE(contabilizar_no_subtotal, true) = true AND (is_extra = false AND external_code IS NOT NULL) THEN amount ELSE 0 END), 0),
            COALESCE(jsonb_agg(jsonb_build_object(
                'id', id,
                'title', title,
                'amount', amount,
                'category', category,
                'is_paid', (payment_date IS NOT NULL OR match_status = 'matched' OR matched_ofx_id IS NOT NULL),
                'external_code', external_code,
                'contabilizar_no_subtotal', COALESCE(contabilizar_no_subtotal, true)
            )), '[]'::jsonb)
        INTO v_total_bills, v_contas_extras, v_contas_imported_bills, v_contas_itens
        FROM daily_manual_bills
        WHERE date = v_target_date;

        IF v_total_bills > 0 THEN
            IF v_contas_imported_bills > 0 THEN
                v_contas_base := v_contas_imported_bills;
            ELSE
                v_contas_base := v_total_bills - v_contas_extras;
            END IF;
        ELSE
            v_contas_base := COALESCE((v_snapshot.metadata->>'contas_base')::numeric, v_snapshot.contas_a_pagar, 0);
        END IF;

        v_contas_manual := COALESCE(NULLIF(v_contas_base + v_contas_extras, 0), v_snapshot.contas_a_pagar, 0);
        v_juros_rede := COALESCE(v_snapshot.juros_rede, 0);
        v_devolucoes_rede := COALESCE((v_snapshot.metadata->>'devolucoes_rede')::numeric, 0);
        v_subtotal_contas := v_contas_manual + v_juros_rede + v_devolucoes_rede;
        
        v_valor_disp_contas := v_faturamento_periodo - v_fluxo_caixa;
        v_diferenca_final := v_valor_disp_contas - v_subtotal_contas;
        v_status_geral := CASE WHEN ABS(v_diferenca_final) <= 50.00 THEN 'balanced' ELSE 'divergent' END;
        
        v_total_entradas_ofx := COALESCE((v_snapshot.metadata->>'total_entradas_ofx')::numeric, 0);
        v_total_saidas_ofx := COALESCE((v_snapshot.metadata->>'total_saidas_ofx')::numeric, 0);
        v_dinheiro_lojas := COALESCE((v_snapshot.metadata->>'dinheiro_lojas')::numeric, 0);
        v_cartoes_a_compensar := COALESCE((v_snapshot.metadata->>'cartoes_a_compensar')::numeric, 0);

        v_triple_recon := COALESCE(v_snapshot.metadata->'triple_recon', '{}'::jsonb);
        
        v_total_saldo_banco_positivo := v_saldo_bancos_positivo + v_dinheiro_lojas + v_cartoes_a_compensar - v_devolucoes_rede;
        v_total_saldo_banco := v_saldo_bancos + v_dinheiro_lojas + v_cartoes_a_compensar - v_devolucoes_rede;

        IF v_snapshot.metadata->'stores' IS NOT NULL AND jsonb_array_length(v_snapshot.metadata->'stores') > 0 THEN
            v_stores_detail := v_snapshot.metadata->'stores';
        END IF;

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
            'odometro_hoje', v_odometro_hoje,
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
            'stores', COALESCE(v_stores_detail, '[]'::jsonb),
            'stores_detail', COALESCE(v_stores_detail, '[]'::jsonb),
            'triple_recon', v_triple_recon,
            'faturamento_itens', v_faturamento_itens,
            'contas_itens', v_contas_itens
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

    -- 5. Faturamento: Odômetro Hoje e Delta Faturamento
    IF v_snapshot_found AND (v_snapshot.metadata->>'odometro_hoje')::numeric > 0 THEN
        v_odometro_hoje := (v_snapshot.metadata->>'odometro_hoje')::numeric;
    ELSIF v_snapshot_found AND v_snapshot.faturamento IS NOT NULL AND v_snapshot.faturamento > 100000 THEN
        v_odometro_hoje := v_snapshot.faturamento;
    ELSE
        SELECT COALESCE(SUM(total_value), 0)
        INTO v_odometro_hoje
        FROM patio_os
        WHERE opened_at::date <= v_target_date;
    END IF;

    IF v_faturamento_anterior > 0 AND v_odometro_hoje > v_faturamento_anterior THEN
        v_faturamento_oi_base := v_odometro_hoje - v_faturamento_anterior;
    ELSIF v_odometro_hoje > 0 AND (v_faturamento_anterior = 0 OR v_odometro_hoje < v_faturamento_anterior) THEN
        v_faturamento_oi_base := v_odometro_hoje;
    ELSIF v_snapshot_found AND v_snapshot.faturamento IS NOT NULL AND v_snapshot.faturamento > 0 AND v_snapshot.faturamento < 100000 THEN
        v_faturamento_oi_base := v_snapshot.faturamento;
    ELSE
        v_faturamento_oi_base := 0;
    END IF;

    -- Agregação universal de daily_revenue_adjustments
    SELECT 
        COALESCE(SUM(CASE WHEN type IN ('deduction', 'estorno') THEN -ABS(amount) ELSE ABS(amount) END), 0),
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

    -- Sincronização com entradas OFX justificadas para Faturamento
    SELECT COALESCE(SUM(amount), 0)
    INTO v_ofx_justified_inflow
    FROM ofx_transactions
    WHERE COALESCE(target_date, occurred_at::date) = v_target_date 
      AND type = 'in'
      AND (
          (
              manual_category IS NOT NULL 
              AND TRIM(manual_category) != ''
              AND manual_category NOT ILIKE '%[Apenas Conciliar]%'
              AND manual_category NOT ILIKE '%[NÃO SOMAR]%'
              AND manual_category NOT ILIKE '%rendimento%'
          )
          OR (
              manual_justification IS NOT NULL
              AND TRIM(manual_justification) != ''
              AND manual_justification NOT ILIKE '%[NÃO SOMAR]%'
          )
      )
      AND NOT EXISTS (
          SELECT 1 FROM daily_revenue_adjustments dra WHERE dra.id = ofx_transactions.id
      );

    v_faturamento_ajustes := v_faturamento_ajustes + v_ofx_justified_inflow;
    v_faturamento_periodo := v_faturamento_oi_base + v_faturamento_ajustes;

    -- 6. Contas a Pagar Dinâmico
    SELECT 
        COALESCE(SUM(CASE WHEN COALESCE(contabilizar_no_subtotal, true) = true THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN COALESCE(contabilizar_no_subtotal, true) = true AND (is_extra = true OR external_code IS NULL) THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN COALESCE(contabilizar_no_subtotal, true) = true AND (is_extra = false AND external_code IS NOT NULL) THEN amount ELSE 0 END), 0),
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', id,
            'title', title,
            'amount', amount,
            'category', category,
            'is_paid', (payment_date IS NOT NULL OR match_status = 'matched' OR matched_ofx_id IS NOT NULL),
            'external_code', external_code,
            'contabilizar_no_subtotal', COALESCE(contabilizar_no_subtotal, true)
        )), '[]'::jsonb)
    INTO v_total_bills, v_contas_extras, v_contas_imported_bills, v_contas_itens
    FROM daily_manual_bills
    WHERE date = v_target_date;

    IF v_total_bills > 0 THEN
        IF v_contas_imported_bills > 0 THEN
            v_contas_base := v_contas_imported_bills;
        ELSE
            v_contas_base := v_total_bills - v_contas_extras;
        END IF;
    ELSIF v_snapshot.contas_a_pagar IS NOT NULL AND v_snapshot.contas_a_pagar > 0 THEN
        v_contas_base := v_snapshot.contas_a_pagar;
    ELSE
        v_contas_base := 0;
    END IF;

    v_contas_manual := COALESCE(NULLIF(v_contas_base + v_contas_extras, 0), v_snapshot.contas_a_pagar, 0);

    -- 7. Conciliação Tripla e Lojas
    v_triple_recon := get_store_pos_triple_reconciliation(v_target_date::text);
    v_cartoes_a_compensar := COALESCE((v_triple_recon->>'total_nao_entrou')::numeric, 0);
    v_devolucoes_rede := COALESCE((v_triple_recon->>'total_rede_devolucoes')::numeric, 0);
    v_juros_rede := COALESCE(v_snapshot.juros_rede, 0);

    -- 8. Dinheiro em Lojas (Cofre em Trânsito)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_dinheiro_lojas
    FROM store_cash_vault
    WHERE entry_date <= v_target_date
      AND (deposited_at IS NULL OR deposited_at::date > v_target_date)
      AND status IN ('em_transito', 'pending');

    IF v_dinheiro_lojas = 0 AND v_snapshot.metadata->>'dinheiro_em_lojas' IS NOT NULL THEN
        v_dinheiro_lojas := (v_snapshot.metadata->>'dinheiro_em_lojas')::numeric;
    END IF;

    -- 9. Totais Canônicos da Holding
    v_total_saldo_banco_positivo := v_saldo_bancos_positivo + v_dinheiro_lojas + v_cartoes_a_compensar - v_devolucoes_rede;
    v_total_saldo_banco := v_saldo_bancos + v_dinheiro_lojas + v_cartoes_a_compensar - v_devolucoes_rede;

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
    
    SELECT 
        COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END), 0)
    INTO v_total_entradas_ofx, v_total_saidas_ofx
    FROM ofx_transactions
    WHERE COALESCE(target_date, occurred_at::date) = v_target_date;

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
        'odometro_hoje', v_odometro_hoje,
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
