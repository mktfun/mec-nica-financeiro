-- Migration: 20260917000004_fix_strict_conciliation_date_isolation.sql
-- Spec 415: Blindagem contra Vazamento de Datas Anteriores do OFX (Cards e Extrato da Conciliação)
-- 1. Saneamento de target_date das transações bancárias de dias anteriores (14/09 e 15/09)
-- 2. Blindagem estrita da RPC get_daily_reconciliation_summary eliminando bypass por import_batch_id
-- 3. Eliminação de contagem dupla em contas de loja / saídas justificadas

-- =========================================================================
-- ETAPA 1: SANEAMENTO CIRÚRGICO DE TARGET_DATE DAS TRANSAÇÕES PASSADAS
-- =========================================================================
UPDATE public.ofx_transactions 
SET target_date = occurred_at::date 
WHERE occurred_at < '2026-09-16 00:00:00+00' 
  AND target_date = '2026-09-17';

UPDATE public.transactions
SET target_date = occurred_at::date
WHERE occurred_at < '2026-09-16 00:00:00+00'
  AND target_date = '2026-09-17'
  AND source = 'ofx';

-- =========================================================================
-- ETAPA 2: ATUALIZAÇÃO DA RPC SSOT GET_DAILY_RECONCILIATION_SUMMARY
-- =========================================================================
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
    v_valor_disp_contas numeric := 0;
    v_contas_base numeric := 0;
    v_contas_imported_bills numeric := 0;
    v_subtotal_contas numeric := 0;
    v_juros_rede numeric := 0;
    
    -- Diferença e Lojas
    v_diferenca_final numeric := 0;
    v_status_geral text := 'approved';
    v_stores_detail jsonb := '[]'::jsonb;
    v_cash_vault_snapshot jsonb := null;
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
            COALESCE(SUM(CASE WHEN transaction_type = 'devolucao' THEN gross_amount ELSE 0 END), 0) as rede_devolucoes
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
                  OR match_status IN ('matched', 'intercompany_paired') THEN amount 
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
                  OR match_status IN ('matched', 'intercompany_paired') THEN 0
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
            COALESCE(SUM(CASE WHEN matched_bill_id IS NOT NULL OR manual_category IS NOT NULL THEN amount ELSE 0 END), 0) as saidas_justificadas,
            COALESCE(SUM(CASE WHEN matched_bill_id IS NULL AND manual_category IS NULL THEN amount ELSE 0 END), 0) as saidas_orfas
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
        'contas_conciliadas', COALESCE(
            CASE 
                WHEN COALESCE(bst.contas_loja_total, 0) > 0 AND COALESCE(sofx.saidas_justificadas, 0) > 0 
                    THEN GREATEST(bst.contas_loja_total, sofx.saidas_justificadas)
                WHEN COALESCE(bst.contas_loja_total, 0) > 0 
                    THEN bst.contas_loja_total
                ELSE sofx.saidas_justificadas
            END, 0
        ),
        'contas_loja_total', COALESCE(
            CASE 
                WHEN COALESCE(bst.contas_loja_total, 0) > 0 AND COALESCE(sofx.saidas_justificadas, 0) > 0 
                    THEN GREATEST(bst.contas_loja_total, sofx.saidas_justificadas)
                WHEN COALESCE(bst.contas_loja_total, 0) > 0 
                    THEN bst.contas_loja_total
                ELSE sofx.saidas_justificadas
            END, 0
        ),
        'contas_loja', COALESCE(
            CASE 
                WHEN COALESCE(bst.contas_loja_total, 0) > 0 AND COALESCE(sofx.saidas_justificadas, 0) > 0 
                    THEN GREATEST(bst.contas_loja_total, sofx.saidas_justificadas)
                WHEN COALESCE(bst.contas_loja_total, 0) > 0 
                    THEN bst.contas_loja_total
                ELSE sofx.saidas_justificadas
            END, 0
        ),
        'dif_saidas', (COALESCE(sofx.ofx_saidas_total, 0) - COALESCE(
            CASE 
                WHEN COALESCE(bst.contas_loja_total, 0) > 0 AND COALESCE(sofx.saidas_justificadas, 0) > 0 
                    THEN GREATEST(bst.contas_loja_total, sofx.saidas_justificadas)
                WHEN COALESCE(bst.contas_loja_total, 0) > 0 
                    THEN bst.contas_loja_total
                ELSE sofx.saidas_justificadas
            END, 0
        )),
        'diferenca_saidas', (COALESCE(sofx.ofx_saidas_total, 0) - COALESCE(
            CASE 
                WHEN COALESCE(bst.contas_loja_total, 0) > 0 AND COALESCE(sofx.saidas_justificadas, 0) > 0 
                    THEN GREATEST(bst.contas_loja_total, sofx.saidas_justificadas)
                WHEN COALESCE(bst.contas_loja_total, 0) > 0 
                    THEN bst.contas_loja_total
                ELSE sofx.saidas_justificadas
            END, 0
        )),
        
        -- STATUS DA FILIAL
        'status', CASE 
            WHEN ABS((COALESCE(efx.ofx_entradas_total, 0) - (COALESCE(efx.ofx_maquininhas, 0) + COALESCE(efx.pix_total, 0) + COALESCE(efx.entradas_justificadas, 0))) + 
                     (COALESCE(sofx.ofx_saidas_total, 0) - COALESCE(
                        CASE 
                            WHEN COALESCE(bst.contas_loja_total, 0) > 0 AND COALESCE(sofx.saidas_justificadas, 0) > 0 
                                THEN GREATEST(bst.contas_loja_total, sofx.saidas_justificadas)
                            WHEN COALESCE(bst.contas_loja_total, 0) > 0 
                                THEN bst.contas_loja_total
                            ELSE sofx.saidas_justificadas
                        END, 0))) <= 0.05 THEN 'conciliado'
            WHEN ABS((COALESCE(efx.ofx_entradas_total, 0) - (COALESCE(efx.ofx_maquininhas, 0) + COALESCE(efx.pix_total, 0) + COALESCE(efx.entradas_justificadas, 0)))) <= 0.05 AND
                 ABS((COALESCE(sofx.ofx_saidas_total, 0) - COALESCE(
                    CASE 
                        WHEN COALESCE(bst.contas_loja_total, 0) > 0 AND COALESCE(sofx.saidas_justificadas, 0) > 0 
                            THEN GREATEST(bst.contas_loja_total, sofx.saidas_justificadas)
                        WHEN COALESCE(bst.contas_loja_total, 0) > 0 
                            THEN bst.contas_loja_total
                        ELSE sofx.saidas_justificadas
                    END, 0))) <= 0.05 THEN 'approved' 
            ELSE 'divergence' 
        END,
        'diferenca', ((COALESCE(efx.ofx_entradas_total, 0) - (COALESCE(efx.ofx_maquininhas, 0) + COALESCE(efx.pix_total, 0) + COALESCE(efx.entradas_justificadas, 0))) - 
                      (COALESCE(sofx.ofx_saidas_total, 0) - COALESCE(
                        CASE 
                            WHEN COALESCE(bst.contas_loja_total, 0) > 0 AND COALESCE(sofx.saidas_justificadas, 0) > 0 
                                THEN GREATEST(bst.contas_loja_total, sofx.saidas_justificadas)
                            WHEN COALESCE(bst.contas_loja_total, 0) > 0 
                                THEN bst.contas_loja_total
                            ELSE sofx.saidas_justificadas
                        END, 0)))
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
    LEFT JOIN vault_agg v ON v.store_id = s.id;

    -- =========================================================================
    -- RAMAL 1: DIA FECHADO (IS_CLOSED = TRUE E NÃO FORÇADO DINÂMICO)
    -- =========================================================================
    IF v_snapshot_found AND v_snapshot.is_closed = true AND NOT p_force_dynamic THEN
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
            
            -- 5 Macro Pilares
            'saldo_bancos_ofx', COALESCE(v_snapshot.saldo_bancario, 0),
            'saldo_bancos_positivo', COALESCE((v_snapshot.metadata->>'saldo_bancos_positivo')::numeric, v_snapshot.saldo_bancario, 0),
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
            
            -- Lojas (Usa stores gravado ou detalhamento apurado)
            'stores', CASE 
                WHEN v_snapshot.metadata->'stores' IS NOT NULL AND jsonb_array_length(v_snapshot.metadata->'stores') > 0 
                THEN v_snapshot.metadata->'stores' 
                ELSE v_stores_detail 
            END,
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

    -- 3. Cartões a Compensar
    SELECT 
        COALESCE(SUM(net_amount), 0),
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

    -- 5. Na Loja OS (Pátio da data)
    SELECT COALESCE(SUM(total_value - paid_value), 0) INTO v_na_loja_os
    FROM patio_os
    WHERE (status ILIKE '%aberto%' OR status ILIKE '%parcial%' OR status ILIKE '%pendente%' OR status = 'ABERTA' OR status = 'PENDENTE')
      AND opened_at::date <= v_target_date::date;

    -- 6. Caixa Atual e Fluxo
    v_caixa_atual := v_total_saldo_banco_positivo + v_dinheiro_mp + v_a_receber + v_na_loja_os;

    IF v_prev_snapshot.caixa_atual IS NOT NULL THEN
        v_caixa_anterior := v_prev_snapshot.caixa_atual;
    ELSE
        v_caixa_anterior := v_caixa_atual;
    END IF;

    v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;

    -- 7. Faturamento DRE Dinâmico com Isolamento Estrito
    SELECT COALESCE(SUM(amount), 0) INTO v_faturamento_oi_base
    FROM transactions
    WHERE (
        target_date = v_target_date::date
        OR (target_date IS NULL AND (
            (occurred_at >= v_start_utc AND occurred_at < v_end_utc)
            OR (occurred_at >= v_start_brt AND occurred_at < v_end_brt)
        ))
    ) AND type = 'in' AND source = 'ofx';

    SELECT COALESCE(SUM(amount), 0) INTO v_faturamento_ajustes
    FROM daily_revenue_adjustments
    WHERE date = v_target_date::date;

    v_faturamento_periodo := v_faturamento_oi_base + v_faturamento_ajustes;

    -- 8. Contas a Pagar & Juros Dinâmicos com Isolamento Estrito
    SELECT COALESCE(SUM(amount), 0) INTO v_contas_imported_bills
    FROM daily_manual_bills
    WHERE date = v_target_date::date AND COALESCE(contabilizar_no_subtotal, true) = true;

    IF v_contas_imported_bills > 0 THEN
        v_contas_base := v_contas_imported_bills;
    ELSE
        SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_contas_base
        FROM transactions
        WHERE (
            target_date = v_target_date::date
            OR (target_date IS NULL AND (
                (occurred_at >= v_start_utc AND occurred_at < v_end_utc)
                OR (occurred_at >= v_start_brt AND occurred_at < v_end_brt)
            ))
        ) AND type = 'out' AND source = 'ofx';
    END IF;

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
    v_valor_disp_contas := v_faturamento_periodo - v_fluxo_caixa;
    v_diferenca_final := v_valor_disp_contas - v_subtotal_contas;

    -- Tolerância canônica (R$ 50,00) com vocabulário fixo
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
        
        -- 5 Macro Pilares
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
        
        -- DRE & Contas
        'faturamento_periodo', v_faturamento_periodo,
        'faturamento_oi_base', v_faturamento_oi_base,
        'faturamento_ajustes', v_faturamento_ajustes,
        'odometro_anterior', COALESCE((v_snapshot.metadata->>'odometro_anterior')::numeric, 0),
        'odometro_hoje', COALESCE((v_snapshot.metadata->>'odometro_hoje')::numeric, 0),
        'contas_base', v_contas_base,
        'juros_rede', v_juros_rede,
        'subtotal_contas', v_subtotal_contas,
        'valor_disp_contas', v_valor_disp_contas,
        
        -- Detalhe das Lojas
        'stores', v_stores_detail,
        'stores_detail', v_stores_detail,
        'cash_vault_snapshot', v_cash_vault_snapshot
    );
END;
$$;
