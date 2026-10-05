-- =========================================================================
-- MIGRATION: 20261003000004_calibracao_saidas_ofx_e_saneamento_contas_loja.sql
-- SPEC 476: Calibração da Conciliação de Saídas/Entradas OFX e Saneamento de Contas
-- =========================================================================

CREATE OR REPLACE FUNCTION public.get_daily_reconciliation_summary(p_date text, p_force_dynamic boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_target_date text := p_date;
    v_snapshot record;
    v_prev_snapshot record;
    v_snapshot_found boolean := false;
    
    -- Limites temporais sargables (UTC e Fuso de Brasília)
    v_start_utc timestamptz;
    v_end_utc timestamptz;
    v_start_brt timestamptz;
    v_end_brt timestamptz;

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
    v_caixa_atual numeric := 0;
    v_caixa_anterior numeric := 0;
    v_fluxo_caixa numeric := 0;
    
    -- DRE & Contas
    v_faturamento_oi_base numeric := 0;
    v_faturamento_ajustes numeric := 0;
    v_faturamento_periodo numeric := 0;
    v_faturamento_anterior numeric := 0;
    v_odometro_anterior numeric := 0;
    v_odometro_hoje numeric := 0;
    v_valor_disp_contas numeric := 0;
    v_contas_base numeric := 0;
    v_contas_imported_bills numeric := 0;
    v_contas_extras numeric := 0;
    v_subtotal_contas numeric := 0;
    v_juros_rede numeric := 0;
    
    -- Diferença e Lojas
    v_diferenca_final numeric := 0;
    v_status_geral text := 'approved';
    v_stores_detail jsonb := '[]'::jsonb;
    v_cash_vault_snapshot jsonb := null;
    v_healed_saldo_banco numeric := 0;
    v_healed_cartoes numeric := 0;
BEGIN
    -- 0. Inicialização dos limites temporais sargables
    v_start_utc := (v_target_date::date::text || ' 00:00:00+00')::timestamptz;
    v_end_utc := ((v_target_date::date + INTERVAL '1 day')::date::text || ' 00:00:00+00')::timestamptz;
    v_start_brt := (v_target_date::date::text || ' 00:00:00-03')::timestamptz;
    v_end_brt := ((v_target_date::date + INTERVAL '1 day')::date::text || ' 00:00:00-03')::timestamptz;

    -- 1. Identificar snapshot do dia corrente
    SELECT * INTO v_snapshot 
    FROM daily_snapshots 
    WHERE date = v_target_date::date 
    LIMIT 1;
    
    IF FOUND THEN
        v_snapshot_found := true;
    END IF;

    -- 2. Identificar snapshot do dia anterior mais recente
    SELECT * INTO v_prev_snapshot 
    FROM daily_snapshots 
    WHERE date < v_target_date::date 
    ORDER BY date DESC 
    LIMIT 1;

    -- Extração robusta do faturamento e odômetro do fechamento anterior (Spec 473)
    v_odometro_anterior := COALESCE(
        (v_prev_snapshot.metadata->>'odometro_hoje')::numeric, 
        v_prev_snapshot.faturamento, 
        0
    );
    v_faturamento_anterior := v_odometro_anterior;

    -- =========================================================================
    -- APURAÇÃO CANÔNICA DAS 10 FILIAIS (ISOLAMENTO ESTRITO POR TARGET_DATE)
    -- =========================================================================
    WITH stores_list AS (
        SELECT id, name FROM stores WHERE COALESCE(active, true) = true
    ),
    rede_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(gross_amount), 0) as rede_bruto,
            COALESCE(SUM(net_amount), 0) as rede_liquido,
            COALESCE(SUM(fee_amount), 0) as rede_taxas,
            COALESCE(SUM(CASE WHEN transaction_type = 'devolucao' THEN gross_amount ELSE 0 END), 0) as rede_devolucoes,
            COALESCE(SUM(
                CASE 
                    WHEN settlement_status IN ('entrou', 'liquidado') THEN 0
                    WHEN settlement_status = 'parcial' THEN GREATEST(0, net_amount - COALESCE(settled_amount, 0))
                    ELSE net_amount
                END
            ), 0) as nao_entrou_valor
        FROM pos_transactions
        WHERE (
            target_date = v_target_date::date
            OR (target_date IS NULL AND (
                (occurred_at >= v_start_utc AND occurred_at < v_end_utc)
                OR (occurred_at >= v_start_brt AND occurred_at < v_end_brt)
            ))
        )
        GROUP BY TRIM(store_id::text)
    ),
    ofx_entradas_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(amount), 0) as ofx_entradas_total,
            -- BALDE 1: ADQUIRENTES / MAQUININHAS
            COALESCE(SUM(CASE 
                WHEN manual_category ILIKE '%REDE%' 
                  OR counterpart_name ILIKE '%REDE%' 
                  OR counterpart_name ILIKE '%CARD%'
                  OR counterpart_name ILIKE '%CIELO%'
                  OR counterpart_name ILIKE '%STONE%'
                  OR counterpart_name ILIKE '%PAGSEGURO%'
                  OR bank_name ILIKE '%REDE%'
                  OR bank_name ILIKE '%CARD%'
                  OR bank_name ILIKE '%CIELO%'
                  OR bank_name ILIKE '%STONE%'
                  OR bank_name ILIKE '%PAGSEGURO%' THEN amount 
                ELSE 0 
            END), 0) as ofx_maquininhas,
            -- BALDE 2: PIX / RECEBIMENTO OS (Exclui Balde 1)
            COALESCE(SUM(CASE 
                WHEN (manual_category ILIKE '%REDE%' OR counterpart_name ILIKE '%REDE%' OR counterpart_name ILIKE '%CARD%' OR counterpart_name ILIKE '%CIELO%' OR counterpart_name ILIKE '%STONE%' OR counterpart_name ILIKE '%PAGSEGURO%' OR bank_name ILIKE '%REDE%' OR bank_name ILIKE '%CARD%' OR bank_name ILIKE '%CIELO%' OR bank_name ILIKE '%STONE%' OR bank_name ILIKE '%PAGSEGURO%') THEN 0
                WHEN matched_os_number IS NOT NULL 
                  OR manual_category ILIKE '%OS%' 
                  OR manual_category ILIKE '%PIX%'
                  OR counterpart_name ILIKE '%PIX%'
                  OR bank_name ILIKE '%PIX%' THEN amount 
                ELSE 0 
            END), 0) as pix_total,
            -- BALDE 3: ENTRADAS JUSTIFICADAS (Exclui Balde 1 e Balde 2)
            COALESCE(SUM(CASE 
                WHEN (manual_category ILIKE '%REDE%' OR counterpart_name ILIKE '%REDE%' OR counterpart_name ILIKE '%CARD%' OR counterpart_name ILIKE '%CIELO%' OR counterpart_name ILIKE '%STONE%' OR counterpart_name ILIKE '%PAGSEGURO%' OR bank_name ILIKE '%REDE%' OR bank_name ILIKE '%CARD%' OR bank_name ILIKE '%CIELO%' OR bank_name ILIKE '%STONE%' OR bank_name ILIKE '%PAGSEGURO%') THEN 0
                WHEN matched_os_number IS NOT NULL 
                  OR manual_category ILIKE '%OS%' 
                  OR manual_category ILIKE '%PIX%'
                  OR counterpart_name ILIKE '%PIX%'
                  OR bank_name ILIKE '%PIX%' THEN 0
                WHEN (manual_category IS NOT NULL AND TRIM(manual_category) <> '')
                  OR (manual_justification IS NOT NULL AND TRIM(manual_justification) <> '')
                  OR match_status IN ('matched', 'intercompany_paired', 'justified', 'conciliado') THEN amount 
                ELSE 0 
            END), 0) as entradas_justificadas,
            -- BALDE 4: CRÉDITOS ÓRFÃOS (Tudo o que restou não classificado)
            COALESCE(SUM(CASE 
                WHEN (manual_category ILIKE '%REDE%' OR counterpart_name ILIKE '%REDE%' OR counterpart_name ILIKE '%CARD%' OR counterpart_name ILIKE '%CIELO%' OR counterpart_name ILIKE '%STONE%' OR counterpart_name ILIKE '%PAGSEGURO%' OR bank_name ILIKE '%REDE%' OR bank_name ILIKE '%CARD%' OR bank_name ILIKE '%CIELO%' OR bank_name ILIKE '%STONE%' OR bank_name ILIKE '%PAGSEGURO%') THEN 0
                WHEN matched_os_number IS NOT NULL 
                  OR manual_category ILIKE '%OS%' 
                  OR manual_category ILIKE '%PIX%'
                  OR counterpart_name ILIKE '%PIX%'
                  OR bank_name ILIKE '%PIX%' THEN 0
                WHEN (manual_category IS NOT NULL AND TRIM(manual_category) <> '')
                  OR (manual_justification IS NOT NULL AND TRIM(manual_justification) <> '')
                  OR match_status IN ('matched', 'intercompany_paired', 'justified', 'conciliado') THEN 0
                ELSE amount 
            END), 0) as entradas_orfas
        FROM ofx_transactions
        WHERE (
            target_date = v_target_date::date
            OR (target_date IS NULL AND (
                (occurred_at >= v_start_utc AND occurred_at < v_end_utc)
                OR (occurred_at >= v_start_brt AND occurred_at < v_end_brt)
            ))
        ) AND type = 'in'
        GROUP BY TRIM(store_id::text)
    ),
    ofx_saidas_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(amount), 0) as ofx_saidas_total,
            COALESCE(SUM(CASE 
                WHEN matched_bill_id IS NOT NULL 
                  OR (manual_category IS NOT NULL AND TRIM(manual_category) <> '')
                  OR (manual_justification IS NOT NULL AND TRIM(manual_justification) <> '')
                  OR match_status IN ('matched', 'matched_batch', 'intercompany_paired', 'justified', 'conciliado')
                THEN amount 
                ELSE 0 
            END), 0) as saidas_justificadas,
            COALESCE(SUM(CASE 
                WHEN matched_bill_id IS NULL 
                 AND (manual_category IS NULL OR TRIM(manual_category) = '')
                 AND (manual_justification IS NULL OR TRIM(manual_justification) = '')
                 AND (match_status IS NULL OR match_status NOT IN ('matched', 'matched_batch', 'intercompany_paired', 'justified', 'conciliado'))
                THEN amount 
                ELSE 0 
            END), 0) as saidas_orfas
        FROM ofx_transactions
        WHERE (
            target_date = v_target_date::date
            OR (target_date IS NULL AND (
                (occurred_at >= v_start_utc AND occurred_at < v_end_utc)
                OR (occurred_at >= v_start_brt AND occurred_at < v_end_brt)
            ))
        ) AND type = 'out'
        GROUP BY TRIM(store_id::text)
    ),
    bills_store_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(amount), 0) as contas_loja_total
        FROM daily_manual_bills
        WHERE date = v_target_date::date AND COALESCE(contabilizar_no_subtotal, true) = true
        GROUP BY TRIM(store_id::text)
    ),
    recon_today AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            bank_total,
            na_loja_os
        FROM reconciliations
        WHERE date = v_target_date::date
    ),
    recon_latest AS (
        SELECT DISTINCT ON (TRIM(store_id::text))
            TRIM(store_id::text) as store_id,
            bank_total,
            na_loja_os
        FROM reconciliations
        WHERE date <= v_target_date::date
        ORDER BY TRIM(store_id::text), date DESC
    ),
    patio_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(total_value - paid_value), 0) as patio_total
        FROM patio_os
        WHERE (status ILIKE '%aberto%' OR status ILIKE '%parcial%' OR status ILIKE '%pendente%' OR status = 'ABERTA' OR status = 'PENDENTE')
          AND opened_at::date <= v_target_date::date
        GROUP BY TRIM(store_id::text)
    ),
    vault_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(amount), 0) as vault_total
        FROM store_cash_vault
        WHERE entry_date = v_target_date::date AND status IN ('em_transito', 'pending')
        GROUP BY TRIM(store_id::text)
    ),
    -- =========================================================================
    -- VERIFICAÇÕES DE VÍNCULOS POR FILIAL (SPEC 467 / SPEC 470)
    -- =========================================================================
    os_checks_cte AS (
        SELECT
            TRIM(obs.store_id::text) as store_id,
            COUNT(*) as total_obs,
            COALESCE(SUM(CASE 
                WHEN (COALESCE(obs.delta_credit, 0) > 0 OR COALESCE(obs.delta_debit, 0) > 0 OR COALESCE(obs.delta_pix, 0) > 0)
                 AND (COALESCE(obs.delta_credit, 0) <= 0 OR COALESCE(obs.consumed_credit, 0) >= COALESCE(obs.delta_credit, 0))
                 AND (COALESCE(obs.delta_debit, 0) <= 0 OR COALESCE(obs.consumed_debit, 0) >= COALESCE(obs.delta_debit, 0))
                THEN 1
                WHEN COALESCE(obs.delta_credit, 0) <= 0 AND COALESCE(obs.delta_debit, 0) <= 0 AND COALESCE(obs.delta_pix, 0) <= 0
                THEN 1
                ELSE 0
            END), 0) as covered_obs,
            COALESCE(SUM(CASE 
                WHEN (COALESCE(obs.delta_credit, 0) > 0 OR COALESCE(obs.delta_debit, 0) > 0 OR COALESCE(obs.delta_pix, 0) > 0)
                 AND NOT (
                     (COALESCE(obs.delta_credit, 0) <= 0 OR COALESCE(obs.consumed_credit, 0) >= COALESCE(obs.delta_credit, 0))
                     AND (COALESCE(obs.delta_debit, 0) <= 0 OR COALESCE(obs.consumed_debit, 0) >= COALESCE(obs.delta_debit, 0))
                 )
                THEN 1
                ELSE 0
            END), 0) as pending_obs
        FROM os_import_observations obs
        WHERE obs.target_date = v_target_date::date
          AND obs.baseline_source NOT IN ('historical_closed', 'historical_patio_carryover')
          AND NOT EXISTS (
              SELECT 1 FROM patio_os pos 
              WHERE pos.store_id = obs.store_id 
                AND pos.os_number = obs.os_number 
                AND pos.closed_at::date < v_target_date::date
          )
        GROUP BY TRIM(obs.store_id::text)
    ),
    rede_checks_cte AS (
        SELECT
            TRIM(pt.store_id::text) as store_id,
            COUNT(*) as total_pos,
            COALESCE(SUM(CASE 
                WHEN pt.transaction_type = 'devolucao' THEN 1
                WHEN (pt.manual_category IS NOT NULL AND TRIM(pt.manual_category) <> '') THEN 1
                WHEN pt.matched_os_number IS NOT NULL 
                 AND EXISTS (
                     SELECT 1 FROM patio_os pos 
                     WHERE TRIM(pos.store_id::text) = TRIM(pt.store_id::text) 
                       AND pos.os_number = pt.matched_os_number
                 )
                 AND EXISTS (
                     SELECT 1 FROM conciliation_matches cm 
                     WHERE cm.rede_transaction_id = pt.id 
                       AND TRIM(cm.store_id::text) = TRIM(pt.store_id::text)
                       AND cm.system_os_number = pt.matched_os_number
                 )
                THEN 1
                ELSE 0
            END), 0) as covered_pos,
            COALESCE(SUM(CASE 
                WHEN pt.transaction_type = 'devolucao' THEN 0
                WHEN (pt.manual_category IS NOT NULL AND TRIM(pt.manual_category) <> '') THEN 0
                WHEN pt.matched_os_number IS NOT NULL 
                 AND EXISTS (
                     SELECT 1 FROM patio_os pos 
                     WHERE TRIM(pos.store_id::text) = TRIM(pt.store_id::text) 
                       AND pos.os_number = pt.matched_os_number
                 )
                 AND EXISTS (
                     SELECT 1 FROM conciliation_matches cm 
                     WHERE cm.rede_transaction_id = pt.id 
                       AND TRIM(cm.store_id::text) = TRIM(pt.store_id::text)
                       AND cm.system_os_number = pt.matched_os_number
                 )
                THEN 0
                ELSE 1
            END), 0) as pending_pos
        FROM pos_transactions pt
        WHERE (
            pt.target_date = v_target_date::date
            OR (pt.target_date IS NULL AND (
                (pt.occurred_at >= v_start_utc AND pt.occurred_at < v_end_utc)
                OR (pt.occurred_at >= v_start_brt AND pt.occurred_at < v_end_brt)
            ))
        )
        GROUP BY TRIM(pt.store_id::text)
    ),
    entradas_checks_cte AS (
        SELECT
            TRIM(tx.store_id::text) as store_id,
            COUNT(*) as total_entradas,
            COALESCE(SUM(CASE 
                WHEN tx.matched_os_number IS NOT NULL 
                 AND EXISTS (
                     SELECT 1 FROM patio_os pos 
                     WHERE TRIM(pos.store_id::text) = TRIM(tx.store_id::text) 
                       AND pos.os_number = tx.matched_os_number
                 )
                THEN 1
                WHEN tx.manual_category ILIKE '%REDE%' 
                  OR tx.counterpart_name ILIKE '%REDE%' 
                  OR tx.counterpart_name ILIKE '%CARD%'
                  OR tx.counterpart_name ILIKE '%CIELO%'
                  OR tx.counterpart_name ILIKE '%STONE%'
                  OR tx.counterpart_name ILIKE '%PAGSEGURO%'
                  OR tx.bank_name ILIKE '%REDE%'
                  OR tx.bank_name ILIKE '%CARD%'
                  OR tx.bank_name ILIKE '%CIELO%'
                  OR tx.bank_name ILIKE '%STONE%'
                  OR tx.bank_name ILIKE '%PAGSEGURO%'
                  OR EXISTS (
                      SELECT 1 FROM pos_ofx_settlements pos_set 
                      WHERE pos_set.ofx_transaction_id = tx.id
                  )
                THEN 1
                WHEN (tx.manual_category IS NOT NULL AND TRIM(tx.manual_category) <> '')
                  OR (tx.manual_justification IS NOT NULL AND TRIM(tx.manual_justification) <> '')
                  OR tx.match_status IN ('matched', 'intercompany_paired', 'justified', 'conciliado')
                THEN 1
                ELSE 0
            END), 0) as covered_entradas,
            COALESCE(SUM(CASE 
                WHEN tx.matched_os_number IS NOT NULL 
                 AND EXISTS (
                     SELECT 1 FROM patio_os pos 
                     WHERE TRIM(pos.store_id::text) = TRIM(tx.store_id::text) 
                       AND pos.os_number = tx.matched_os_number
                 )
                THEN 0
                WHEN tx.manual_category ILIKE '%REDE%' 
                  OR tx.counterpart_name ILIKE '%REDE%' 
                  OR tx.counterpart_name ILIKE '%CARD%'
                  OR tx.counterpart_name ILIKE '%CIELO%'
                  OR tx.counterpart_name ILIKE '%STONE%'
                  OR tx.counterpart_name ILIKE '%PAGSEGURO%'
                  OR tx.bank_name ILIKE '%REDE%'
                  OR tx.bank_name ILIKE '%CARD%'
                  OR tx.bank_name ILIKE '%CIELO%'
                  OR tx.bank_name ILIKE '%STONE%'
                  OR tx.bank_name ILIKE '%PAGSEGURO%'
                  OR EXISTS (
                      SELECT 1 FROM pos_ofx_settlements pos_set 
                      WHERE pos_set.ofx_transaction_id = tx.id
                  )
                THEN 0
                WHEN (tx.manual_category IS NOT NULL AND TRIM(tx.manual_category) <> '')
                  OR (tx.manual_justification IS NOT NULL AND TRIM(tx.manual_justification) <> '')
                  OR tx.match_status IN ('matched', 'intercompany_paired', 'justified', 'conciliado')
                THEN 0
                ELSE 1
            END), 0) as pending_entradas
        FROM ofx_transactions tx
        WHERE (
            tx.target_date = v_target_date::date
            OR (tx.target_date IS NULL AND (
                (tx.occurred_at >= v_start_utc AND tx.occurred_at < v_end_utc)
                OR (tx.occurred_at >= v_start_brt AND tx.occurred_at < v_end_brt)
            ))
        ) AND tx.type = 'in'
        GROUP BY TRIM(tx.store_id::text)
    ),
    saidas_checks_cte AS (
        SELECT
            TRIM(tx.store_id::text) as store_id,
            COUNT(*) as total_saidas,
            COALESCE(SUM(CASE 
                WHEN tx.matched_bill_id IS NOT NULL 
                 AND EXISTS (
                     SELECT 1 FROM daily_manual_bills b 
                     WHERE b.id = tx.matched_bill_id
                 )
                THEN 1
                WHEN (tx.manual_category IS NOT NULL AND TRIM(tx.manual_category) <> '')
                  OR (tx.manual_justification IS NOT NULL AND TRIM(tx.manual_justification) <> '')
                  OR tx.match_status IN ('matched', 'matched_batch', 'intercompany_paired', 'justified', 'conciliado')
                THEN 1
                ELSE 0
            END), 0) as covered_saidas,
            COALESCE(SUM(CASE 
                WHEN tx.matched_bill_id IS NOT NULL 
                 AND EXISTS (
                     SELECT 1 FROM daily_manual_bills b 
                     WHERE b.id = tx.matched_bill_id
                 )
                THEN 0
                WHEN (tx.manual_category IS NOT NULL AND TRIM(tx.manual_category) <> '')
                  OR (tx.manual_justification IS NOT NULL AND TRIM(tx.manual_justification) <> '')
                  OR tx.match_status IN ('matched', 'matched_batch', 'intercompany_paired', 'justified', 'conciliado')
                THEN 0
                ELSE 1
            END), 0) as pending_saidas
        FROM ofx_transactions tx
        WHERE (
            tx.target_date = v_target_date::date
            OR (tx.target_date IS NULL AND (
                (tx.occurred_at >= v_start_utc AND tx.occurred_at < v_end_utc)
                OR (tx.occurred_at >= v_start_brt AND tx.occurred_at < v_end_brt)
            ))
        ) AND tx.type = 'out'
        GROUP BY TRIM(tx.store_id::text)
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'store_id', s.id,
        'store_name', s.name,
        'saldo_banco', COALESCE(rt.bank_total, rl.bank_total, 0),
        'saldo_banco_ofx', COALESCE(rt.bank_total, rl.bank_total, 0),
        'saldo_positivo_real', CASE WHEN COALESCE(rt.bank_total, rl.bank_total, 0) > 0 THEN COALESCE(rt.bank_total, rl.bank_total, 0) ELSE 0 END,
        'saldo_devedor_real', CASE WHEN COALESCE(rt.bank_total, rl.bank_total, 0) < 0 THEN ABS(COALESCE(rt.bank_total, rl.bank_total, 0)) ELSE 0 END,
        'dinheiro_loja', COALESCE(v.vault_total, 0),
        'rede_bruto', COALESCE(rd.rede_bruto, 0),
        'rede_liquido', COALESCE(rd.rede_liquido, 0),
        'rede_taxas', COALESCE(rd.rede_taxas, 0),
        'rede_devolucoes', COALESCE(rd.rede_devolucoes, 0),
        'nao_entrou_valor', COALESCE(rd.nao_entrou_valor, 0),
        'status_compensacao', CASE 
            WHEN COALESCE(rd.rede_liquido, 0) = 0 THEN 'sem_movimento'
            WHEN COALESCE(rd.nao_entrou_valor, 0) <= 0.05 THEN 'entrou'
            WHEN COALESCE(rd.nao_entrou_valor, 0) < COALESCE(rd.rede_liquido, 0) - 0.05 THEN 'parcial'
            ELSE 'nao_entrou'
        END,
        'maquininha', COALESCE(rd.rede_liquido, 0),
        'cartao_total', COALESCE(rd.rede_liquido, 0),
        'pix', COALESCE(efx.pix_total, 0),
        'na_loja_os', COALESCE(rt.na_loja_os, p.patio_total, 0),
        'patio_os', COALESCE(rt.na_loja_os, p.patio_total, 0),
        
        -- DUAL-SPLIT: LINHA 1 (ENTRADAS)
        'ofx_entradas_total', COALESCE(efx.ofx_entradas_total, 0),
        'entradas_realizadas', COALESCE(efx.ofx_entradas_total, 0),
        'ofx_maquininhas', COALESCE(efx.ofx_maquininhas, 0),
        'entradas_conciliadas', (COALESCE(efx.ofx_maquininhas, 0) + COALESCE(efx.pix_total, 0) + COALESCE(efx.entradas_justificadas, 0)),
        'entradas_previsto', (COALESCE(efx.ofx_maquininhas, 0) + COALESCE(efx.pix_total, 0) + COALESCE(efx.entradas_justificadas, 0)),
        'entradas_orfas', COALESCE(efx.entradas_orfas, 0),
        'dif_entradas', (COALESCE(efx.ofx_entradas_total, 0) - (COALESCE(efx.ofx_maquininhas, 0) + COALESCE(efx.pix_total, 0) + COALESCE(efx.entradas_justificadas, 0))),
        'diferenca_entradas', (COALESCE(efx.ofx_entradas_total, 0) - (COALESCE(efx.ofx_maquininhas, 0) + COALESCE(efx.pix_total, 0) + COALESCE(efx.entradas_justificadas, 0))),
        
        -- DUAL-SPLIT: LINHA 2 (SAÍDAS) - Elimina duplicidade entre contas manuais e saídas justificadas
        'ofx_saidas_total', COALESCE(sofx.ofx_saidas_total, 0),
        'saidas_ofx', COALESCE(sofx.ofx_saidas_total, 0),
        'saidas_justificadas', COALESCE(sofx.saidas_justificadas, 0),
        'saidas_orfas', COALESCE(sofx.saidas_orfas, 0),
        'contas_conciliadas', COALESCE(bst.contas_loja_total, 0),
        'contas_loja_total', COALESCE(bst.contas_loja_total, 0),
        'contas_loja', COALESCE(bst.contas_loja_total, 0),
        'dif_saidas', COALESCE(sofx.saidas_orfas, 0),
        'diferenca_saidas', COALESCE(sofx.saidas_orfas, 0),
        
        -- STATUS DA FILIAL
        'status', CASE 
            WHEN COALESCE(sofx.saidas_orfas, 0) <= 0.05 
             AND COALESCE(efx.entradas_orfas, 0) <= 0.05 
             AND COALESCE(rd.nao_entrou_valor, 0) <= 0.05 THEN 'conciliado'
            WHEN COALESCE(sofx.saidas_orfas, 0) <= 0.05 
             AND COALESCE(efx.entradas_orfas, 0) <= 0.05 THEN 'approved' 
            ELSE 'divergence' 
        END,
        'diferenca', (COALESCE(efx.entradas_orfas, 0) - COALESCE(sofx.saidas_orfas, 0)),

        -- VERIFICAÇÃO DE VÍNCULOS (SPEC 467 / SPEC 470)
        'verificacao_vinculos', jsonb_build_object(
            'total_checks', 4,
            'pending_count', (
                (CASE WHEN COALESCE(chk_os.pending_obs, 0) > 0 THEN 1 ELSE 0 END) +
                (CASE WHEN COALESCE(chk_rd.pending_pos, 0) > 0 THEN 1 ELSE 0 END) +
                (CASE WHEN COALESCE(chk_in.pending_entradas, 0) > 0 THEN 1 ELSE 0 END) +
                (CASE WHEN COALESCE(chk_out.pending_saidas, 0) > 0 THEN 1 ELSE 0 END)
            ),
            'status', CASE 
                WHEN (
                    (CASE WHEN COALESCE(chk_os.pending_obs, 0) > 0 THEN 1 ELSE 0 END) +
                    (CASE WHEN COALESCE(chk_rd.pending_pos, 0) > 0 THEN 1 ELSE 0 END) +
                    (CASE WHEN COALESCE(chk_in.pending_entradas, 0) > 0 THEN 1 ELSE 0 END) +
                    (CASE WHEN COALESCE(chk_out.pending_saidas, 0) > 0 THEN 1 ELSE 0 END)
                ) > 0 THEN 'pending'
                ELSE 'verified'
            END,
            'groups', jsonb_build_object(
                'os_payments', jsonb_build_object(
                    'total', COALESCE(chk_os.total_obs, 0),
                    'covered', COALESCE(chk_os.covered_obs, 0),
                    'pending', COALESCE(chk_os.pending_obs, 0),
                    'status', CASE WHEN COALESCE(chk_os.pending_obs, 0) > 0 THEN 'pending' ELSE 'verified' END
                ),
                'rede_os', jsonb_build_object(
                    'total', COALESCE(chk_rd.total_pos, 0),
                    'covered', COALESCE(chk_rd.covered_pos, 0),
                    'pending', COALESCE(chk_rd.pending_pos, 0),
                    'status', CASE WHEN COALESCE(chk_rd.pending_pos, 0) > 0 THEN 'pending' ELSE 'verified' END
                ),
                'entradas_ofx', jsonb_build_object(
                    'total', COALESCE(chk_in.total_entradas, 0),
                    'covered', COALESCE(chk_in.covered_entradas, 0),
                    'pending', COALESCE(chk_in.pending_entradas, 0),
                    'status', CASE WHEN COALESCE(chk_in.pending_entradas, 0) > 0 THEN 'pending' ELSE 'verified' END
                ),
                'saidas_ofx', jsonb_build_object(
                    'total', COALESCE(chk_out.total_saidas, 0),
                    'covered', COALESCE(chk_out.covered_saidas, 0),
                    'pending', COALESCE(chk_out.pending_saidas, 0),
                    'status', CASE WHEN COALESCE(chk_out.pending_saidas, 0) > 0 THEN 'pending' ELSE 'verified' END
                )
            )
        )
    ) ORDER BY s.name ASC), '[]'::jsonb)
    INTO v_stores_detail
    FROM stores_list s
    LEFT JOIN rede_agg rd ON rd.store_id = s.id
    LEFT JOIN ofx_entradas_agg efx ON efx.store_id = s.id
    LEFT JOIN ofx_saidas_agg sofx ON sofx.store_id = s.id
    LEFT JOIN bills_store_agg bst ON bst.store_id = s.id
    LEFT JOIN recon_today rt ON rt.store_id = s.id
    LEFT JOIN recon_latest rl ON rl.store_id = s.id
    LEFT JOIN patio_agg p ON p.store_id = s.id
    LEFT JOIN vault_agg v ON v.store_id = s.id
    LEFT JOIN os_checks_cte chk_os ON chk_os.store_id = s.id
    LEFT JOIN rede_checks_cte chk_rd ON chk_rd.store_id = s.id
    LEFT JOIN entradas_checks_cte chk_in ON chk_in.store_id = s.id
    LEFT JOIN saidas_checks_cte chk_out ON chk_out.store_id = s.id;

    -- =========================================================================
    -- RAMAL 1: DIA FECHADO (PRESERVAÇÃO DO SNAPSHOT COM CURA DE CAMPOS ZERADOS E VÍNCULOS LIVE)
    -- =========================================================================
    IF v_snapshot_found AND v_snapshot.is_closed = true AND NOT p_force_dynamic THEN
        -- Cura de saldo de banco
        IF COALESCE(v_snapshot.saldo_bancario, 0) = 0 THEN
            SELECT COALESCE(SUM(bank_total), 0) INTO v_healed_saldo_banco
            FROM reconciliations
            WHERE date = v_target_date::date;
        ELSE
            v_healed_saldo_banco := v_snapshot.saldo_bancario;
        END IF;

        -- Cura de cartões a compensar
        IF COALESCE((v_snapshot.metadata->>'cartoes_a_compensar')::numeric, 0) = 0 THEN
            SELECT COALESCE(SUM(
                CASE 
                    WHEN settlement_status IN ('entrou', 'liquidado') THEN 0
                    WHEN settlement_status = 'parcial' THEN GREATEST(0, net_amount - COALESCE(settled_amount, 0))
                    ELSE net_amount
                END
            ), 0) INTO v_healed_cartoes
            FROM pos_transactions
            WHERE (
                target_date = v_target_date::date
                OR (target_date IS NULL AND (
                    (occurred_at >= v_start_utc AND occurred_at < v_end_utc)
                    OR (occurred_at >= v_start_brt AND occurred_at < v_end_brt)
                ))
            );
        ELSE
            v_healed_cartoes := COALESCE((v_snapshot.metadata->>'cartoes_a_compensar')::numeric, 0);
        END IF;

        -- Cura de contas a pagar se o snapshot estiver com 0 mas houver contas no banco
        IF COALESCE(v_snapshot.contas_a_pagar, 0) = 0 THEN
            SELECT COALESCE(SUM(amount), 0) INTO v_contas_base
            FROM daily_manual_bills
            WHERE date = v_target_date::date AND COALESCE(contabilizar_no_subtotal, true) = true;
        ELSE
            v_contas_base := v_snapshot.contas_a_pagar;
        END IF;

        SELECT COALESCE(SUM(amount), 0) INTO v_contas_extras
        FROM daily_manual_bills
        WHERE date = v_target_date::date AND is_extra = true AND COALESCE(contabilizar_no_subtotal, true) = true;

        v_diferenca_final := COALESCE((v_snapshot.metadata->>'diferenca_final')::numeric, 0);
        v_status_geral := CASE 
            WHEN (v_snapshot.metadata->>'status_geral') IN ('approved', 'divergence') THEN (v_snapshot.metadata->>'status_geral')
            WHEN ABS(v_diferenca_final) <= 50.00 THEN 'approved' 
            ELSE 'divergence' 
        END;

        RETURN jsonb_build_object(
            'date', v_target_date,
            'is_closed', true,
            'is_marco_zero', COALESCE((v_snapshot.metadata->>'is_marco_zero')::boolean, false),
            'closed_at', v_snapshot.closed_at,
            'status_geral', v_status_geral,
            'diferenca_final', v_diferenca_final,
            'saldo_bancos_ofx', v_healed_saldo_banco,
            'saldo_bancos_positivo', COALESCE((v_snapshot.metadata->>'saldo_bancos_positivo')::numeric, (CASE WHEN v_healed_saldo_banco > 0 THEN v_healed_saldo_banco ELSE 0 END)),
            'saldo_negativo_itau', COALESCE(v_snapshot.saldo_negativo_itau, (CASE WHEN v_healed_saldo_banco < 0 THEN ABS(v_healed_saldo_banco) ELSE 0 END)),
            'total_saldo_banco', v_healed_saldo_banco,
            'total_saldo_banco_positivo', COALESCE((v_snapshot.metadata->>'total_saldo_banco_positivo')::numeric, 0) + (CASE WHEN COALESCE((v_snapshot.metadata->>'cartoes_a_compensar')::numeric, 0) = 0 THEN v_healed_cartoes ELSE 0 END),
            'dinheiro_lojas', COALESCE((v_snapshot.metadata->>'dinheiro_lojas')::numeric, (v_snapshot.metadata->>'dinheiro_em_lojas')::numeric, 0),
            'cartoes_a_compensar', v_healed_cartoes,
            'devolucoes_rede', COALESCE((v_snapshot.metadata->>'devolucoes_rede')::numeric, 0),
            'dinheiro_mp', COALESCE(v_snapshot.dinheiro_mp, 0),
            'a_receber', COALESCE(v_snapshot.a_receber_manual, 0),
            'na_loja_os', COALESCE(v_snapshot.total_patio, 0),
            'total_patio', COALESCE(v_snapshot.total_patio, 0),
            'caixa_atual', COALESCE(v_snapshot.caixa_atual, 0) + (CASE WHEN COALESCE((v_snapshot.metadata->>'cartoes_a_compensar')::numeric, 0) = 0 THEN v_healed_cartoes ELSE 0 END),
            'caixa_anterior', COALESCE(NULLIF((v_snapshot.metadata->>'caixa_anterior')::numeric, 0), v_prev_snapshot.caixa_atual, 0),
            'fluxo_caixa', COALESCE((v_snapshot.metadata->>'fluxo_caixa')::numeric, (COALESCE(v_snapshot.caixa_atual, 0) - COALESCE(NULLIF((v_snapshot.metadata->>'caixa_anterior')::numeric, 0), v_prev_snapshot.caixa_atual, 0))),
            'faturamento_periodo', COALESCE(v_snapshot.faturamento, 0),
            'faturamento_oi_base', COALESCE((v_snapshot.metadata->>'faturamento_oi_base')::numeric, v_snapshot.faturamento, 0),
            'faturamento_ajustes', COALESCE((v_snapshot.metadata->>'faturamento_ajustes')::numeric, 0),
            'faturamento_anterior', COALESCE((v_snapshot.metadata->>'faturamento_anterior')::numeric, v_faturamento_anterior),
            'odometro_anterior', COALESCE((v_snapshot.metadata->>'odometro_anterior')::numeric, v_odometro_anterior),
            'odometro_hoje', COALESCE((v_snapshot.metadata->>'odometro_hoje')::numeric, v_snapshot.faturamento, 0),
            'contas_base', v_contas_base,
            'contas_manual', v_contas_base,
            'contas_extras', v_contas_extras,
            'juros_rede', COALESCE(v_snapshot.juros_rede, 0),
            'subtotal_contas', COALESCE((v_snapshot.metadata->>'subtotal_contas')::numeric, (v_contas_base + COALESCE(v_snapshot.juros_rede, 0))),
            'valor_disp_contas', COALESCE((v_snapshot.metadata->>'valor_disp_contas')::numeric, 0),
            
            -- Lojas: Preserva os totais financeiros do snapshot, mas sobrepõe em tempo real o status operacional de verificacao_vinculos
            'stores', (
                SELECT COALESCE(jsonb_agg(
                    jsonb_set(
                        jsonb_set(
                            jsonb_set(
                                jsonb_set(
                                    jsonb_set(
                                        jsonb_set(
                                            jsonb_set(
                                                s_snap.elem,
                                                '{verificacao_vinculos}',
                                                COALESCE(s_live.live_elem->'verificacao_vinculos', s_snap.elem->'verificacao_vinculos', '{}'::jsonb)
                                            ),
                                            '{saidas_orfas}',
                                            COALESCE(s_live.live_elem->'saidas_orfas', s_snap.elem->'saidas_orfas', '0'::jsonb)
                                        ),
                                        '{entradas_orfas}',
                                        COALESCE(s_live.live_elem->'entradas_orfas', s_snap.elem->'entradas_orfas', '0'::jsonb)
                                    ),
                                    '{saidas_justificadas}',
                                    COALESCE(s_live.live_elem->'saidas_justificadas', s_snap.elem->'saidas_justificadas', '0'::jsonb)
                                ),
                                '{dif_saidas}',
                                COALESCE(s_live.live_elem->'dif_saidas', s_snap.elem->'dif_saidas', '0'::jsonb)
                            ),
                            '{diferenca_saidas}',
                            COALESCE(s_live.live_elem->'diferenca_saidas', s_snap.elem->'diferenca_saidas', '0'::jsonb)
                        ),
                        '{status}',
                        COALESCE(s_live.live_elem->'status', s_snap.elem->'status', '"conciliado"'::jsonb)
                    )
                ), v_stores_detail)
                FROM jsonb_array_elements(
                    CASE 
                        WHEN v_snapshot.metadata->'stores' IS NOT NULL AND jsonb_array_length(v_snapshot.metadata->'stores') > 0 
                        THEN v_snapshot.metadata->'stores' 
                        ELSE v_stores_detail 
                    END
                ) AS s_snap(elem)
                LEFT JOIN LATERAL (
                    SELECT live_elem
                    FROM jsonb_array_elements(v_stores_detail) AS l(live_elem)
                    WHERE live_elem->>'store_id' = s_snap.elem->>'store_id'
                    LIMIT 1
                ) s_live ON true
            ),
            'stores_detail', v_stores_detail,
            'cash_vault_snapshot', v_snapshot.metadata->'cash_vault_snapshot'
        );
    END IF;

    -- =========================================================================
    -- RAMAL 2: DIA ABERTO OU FORÇADO DINÂMICO (CÁLCULO DIRETO DAS TABELAS SSOT)
    -- =========================================================================
    -- 1. Saldos Bancários (reconciliations)
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

    -- 2. Dinheiro em Cofre
    SELECT COALESCE(SUM(amount), 0) INTO v_dinheiro_lojas
    FROM store_cash_vault
    WHERE entry_date = v_target_date::date AND status IN ('em_transito', 'pending');

    -- 3. Cartões a Compensar (Apenas parcelas pendentes de compensação bancária)
    SELECT 
        COALESCE(SUM(
            CASE 
                WHEN settlement_status IN ('entrou', 'liquidado') THEN 0
                WHEN settlement_status = 'parcial' THEN GREATEST(0, net_amount - COALESCE(settled_amount, 0))
                ELSE net_amount
            END
        ), 0),
        COALESCE(SUM(CASE WHEN transaction_type = 'devolucao' THEN gross_amount ELSE 0 END), 0)
    INTO v_cartoes_a_compensar, v_devolucoes_rede
    FROM pos_transactions
    WHERE (
        target_date = v_target_date::date
        OR (target_date IS NULL AND (
            (occurred_at >= v_start_utc AND occurred_at < v_end_utc)
            OR (occurred_at >= v_start_brt AND occurred_at < v_end_brt)
        ))
    );

    v_total_saldo_banco_positivo := v_saldo_bancos_positivo + v_dinheiro_lojas + v_cartoes_a_compensar - v_devolucoes_rede;
    v_total_saldo_banco := v_saldo_bancos_positivo;

    -- 4. Ativos Operacionais (Carry-over seguro de snapshots)
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

    -- 5. Veículos em Pátio
    SELECT COALESCE(SUM(total_value - paid_value), 0) INTO v_na_loja_os
    FROM patio_os
    WHERE (status ILIKE '%aberto%' OR status ILIKE '%parcial%' OR status ILIKE '%pendente%' OR status = 'ABERTA' OR status = 'PENDENTE')
      AND opened_at::date <= v_target_date::date;

    IF v_na_loja_os = 0 AND v_snapshot_found AND COALESCE(v_snapshot.total_patio, 0) > 0 THEN
        v_na_loja_os := v_snapshot.total_patio;
    ELSIF v_na_loja_os = 0 AND v_prev_snapshot.total_patio IS NOT NULL AND v_prev_snapshot.total_patio > 0 THEN
        v_na_loja_os := v_prev_snapshot.total_patio;
    END IF;

    -- 6. Cálculo do Caixa Atual e Anterior
    v_caixa_atual := v_total_saldo_banco_positivo + v_dinheiro_mp + v_a_receber + v_na_loja_os - v_saldo_negativo_itau;

    IF v_snapshot_found AND (COALESCE((v_snapshot.metadata->>'is_caixa_atual_override')::boolean, false) = true) THEN
        v_caixa_atual := COALESCE(v_snapshot.caixa_atual, v_caixa_atual);
    END IF;

    -- Carry-over seguro de caixa anterior
    IF v_snapshot_found AND v_snapshot.metadata->>'caixa_anterior' IS NOT NULL AND (v_snapshot.metadata->>'caixa_anterior')::numeric > 0 THEN
        v_caixa_anterior := (v_snapshot.metadata->>'caixa_anterior')::numeric;
    ELSIF v_prev_snapshot.caixa_atual IS NOT NULL THEN
        v_caixa_anterior := v_prev_snapshot.caixa_atual;
    ELSE
        v_caixa_anterior := 0;
    END IF;

    v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;

    -- 7. Faturamento e Ajustes (Sargable & Seguro)
    SELECT COALESCE(SUM(t.amount), 0) INTO v_faturamento_oi_base
    FROM ofx_transactions t
    WHERE (
        t.target_date = v_target_date::date 
        OR (t.target_date IS NULL AND (
            (t.occurred_at >= v_start_utc AND t.occurred_at < v_end_utc)
            OR (t.occurred_at >= v_start_brt AND t.occurred_at < v_end_brt)
        ))
    )
      AND t.type = 'in'
      AND COALESCE(t.contabilizar_no_subtotal, true) = true
      AND COALESCE(t.match_status, '') NOT IN ('intercompany_paired', 'auto_cancelled')
      AND NOT EXISTS (
          SELECT 1 FROM daily_revenue_adjustments dra WHERE dra.id = t.id
      );

    SELECT COALESCE(SUM(amount), 0) INTO v_faturamento_ajustes
    FROM daily_revenue_adjustments
    WHERE date = v_target_date::date;

    v_faturamento_periodo := v_faturamento_oi_base + v_faturamento_ajustes;
    v_odometro_hoje := v_odometro_anterior + v_faturamento_periodo;

    -- 8. Contas a Pagar: soma de daily_manual_bills ou saídas do OFX como fallback
    SELECT COALESCE(SUM(amount), 0) INTO v_contas_imported_bills
    FROM daily_manual_bills
    WHERE date = v_target_date::date AND COALESCE(contabilizar_no_subtotal, true) = true;

    IF v_contas_imported_bills > 0 THEN
        v_contas_base := v_contas_imported_bills;
    ELSE
        SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_contas_base
        FROM ofx_transactions
        WHERE (
            target_date = v_target_date::date
            OR (target_date IS NULL AND (
                (occurred_at >= v_start_utc AND occurred_at < v_end_utc)
                OR (occurred_at >= v_start_brt AND occurred_at < v_end_brt)
            ))
        ) AND type = 'out';
    END IF;

    SELECT COALESCE(SUM(amount), 0) INTO v_contas_extras
    FROM daily_manual_bills
    WHERE date = v_target_date::date AND is_extra = true AND COALESCE(contabilizar_no_subtotal, true) = true;

    SELECT COALESCE(SUM(fee_amount), 0) INTO v_juros_rede
    FROM pos_transactions
    WHERE (
        target_date = v_target_date::date
        OR (target_date IS NULL AND (
            (occurred_at >= v_start_utc AND occurred_at < v_end_utc)
            OR (occurred_at >= v_start_brt AND occurred_at < v_end_brt)
        ))
    );

    v_subtotal_contas := v_contas_base + v_juros_rede;

    -- Fórmula do Disponível (Spec 467)
    v_valor_disp_contas := ABS(v_faturamento_periodo + v_fluxo_caixa);
    v_diferenca_final := v_valor_disp_contas - v_subtotal_contas;

    IF ABS(v_diferenca_final) <= 50.00 THEN
        v_status_geral := 'approved';
    ELSE
        v_status_geral := 'divergence';
    END IF;

    RETURN jsonb_build_object(
        'date', v_target_date,
        'is_closed', COALESCE(v_snapshot.is_closed, false),
        'is_marco_zero', COALESCE((v_snapshot.metadata->>'is_marco_zero')::boolean, false),
        'closed_at', v_snapshot.closed_at,
        'status_geral', v_status_geral,
        'diferenca_final', v_diferenca_final,
        'saldo_bancos_ofx', v_saldo_bancos,
        'saldo_bancos_positivo', v_saldo_bancos_positivo,
        'saldo_negativo_itau', v_saldo_negativo_itau,
        'total_saldo_banco', v_total_saldo_banco,
        'total_saldo_banco_positivo', v_total_saldo_banco_positivo,
        'dinheiro_lojas', v_dinheiro_lojas,
        'cartoes_a_compensar', v_cartoes_a_compensar,
        'devolucoes_rede', v_devolucoes_rede,
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
        'faturamento_anterior', v_faturamento_anterior,
        'odometro_anterior', v_odometro_anterior,
        'odometro_hoje', v_odometro_hoje,
        'contas_base', v_contas_base,
        'contas_manual', v_contas_base,
        'contas_extras', v_contas_extras,
        'juros_rede', v_juros_rede,
        'subtotal_contas', v_subtotal_contas,
        'valor_disp_contas', v_valor_disp_contas,
        'stores', v_stores_detail,
        'stores_detail', v_stores_detail,
        'cash_vault_snapshot', null
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_daily_reconciliation_summary(text, boolean) TO authenticated, service_role, anon;

-- =========================================================================
-- SANEAMENTO RETROATIVO DE OBSERVAÇÕES DE OS EM 2026-08-25
-- Transforma OSs com entrada em pátio anterior a 25/08 em historical_patio_carryover
-- =========================================================================
UPDATE public.os_import_observations obs
SET 
    baseline_source = 'historical_patio_carryover',
    paid_before = obs.paid_after,
    credit_before = obs.credit_after,
    debit_before = obs.debit_after,
    pix_before = obs.pix_after,
    delta_paid = 0,
    delta_credit = 0,
    delta_debit = 0,
    delta_pix = 0,
    updated_at = NOW()
FROM public.patio_os pos
WHERE pos.store_id = obs.store_id
  AND pos.os_number = obs.os_number
  AND obs.target_date = '2026-08-25'
  AND (
      pos.opened_at::date < '2026-08-25'
      OR obs.baseline_source = 'existing_patio'
      OR (pos.closed_at IS NOT NULL AND pos.closed_at::date < '2026-08-25')
  );

-- =========================================================================
-- VINCULAÇÃO DETERMINÍSTICA REDE -> OS #1849 NO REI DO MÓDULO (st-09)
-- =========================================================================
UPDATE public.pos_transactions
SET matched_os_number = '1849', updated_at = NOW()
WHERE store_id = 'st-09'
  AND (target_date = '2026-08-25' OR occurred_at::date = '2026-08-25')
  AND gross_amount = 3490.00
  AND matched_os_number IS NULL;

INSERT INTO public.conciliation_matches (
    rede_transaction_id, store_id, target_date, system_os_number, status, divergence_amount
)
SELECT id, store_id, target_date, '1849', 'matched', 0
FROM public.pos_transactions
WHERE store_id = 'st-09'
  AND (target_date = '2026-08-25' OR occurred_at::date = '2026-08-25')
  AND gross_amount = 3490.00
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
