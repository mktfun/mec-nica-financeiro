-- Migration: 20260928000004_restore_daily_summary_and_rede_os_match.sql
-- Spec 443: Restaurar Fechamento por Filial, Rede a Compensar e Vínculo Rede × OS

-- =========================================================================
-- 1. get_daily_reconciliation_summary: Unificação do cálculo de a compensar,
--    cura de snapshots incompletos e classificação fiel de status de filiais
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_daily_reconciliation_summary(p_date text, p_force_dynamic boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
    v_has_divergence boolean := false;
    v_healed_cartoes numeric := 0;
    v_healed_saldo_banco numeric := 0;
BEGIN
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
    -- APURAÇÃO CANÔNICA DAS 10 FILIAIS COM CONTRATO DE CÁLCULO ESTRITO EM CENTAVOS
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
        WHERE COALESCE(target_date, occurred_at::date) = v_target_date::date
        GROUP BY TRIM(store_id::text)
    ),
    ofx_entradas_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(amount), 0) as ofx_entradas_total,
            -- Lotes REDE no extrato
            COALESCE(SUM(CASE WHEN manual_category ILIKE '%REDE%' OR counterpart_name ILIKE '%REDE%' OR counterpart_name ILIKE '%CARD%' THEN amount ELSE 0 END), 0) as ofx_maquininhas,
            -- PIX OS identificado (por matched_os_number ou categoria explícita de OS)
            COALESCE(SUM(CASE WHEN matched_os_number IS NOT NULL OR manual_category IN ('PIX / Recebimento OS', 'Recebimento OS') THEN amount ELSE 0 END), 0) as pix_total,
            -- Justificativas EXCLUSIVAS (que NÃO casaram com OS e NÃO são REDE)
            COALESCE(SUM(CASE 
                WHEN matched_os_number IS NULL 
                 AND manual_category IS NOT NULL 
                 AND manual_category NOT IN ('PIX / Recebimento OS', 'Recebimento OS', 'REDE')
                THEN amount ELSE 0 END), 0) as entradas_justificadas
        FROM ofx_transactions
        WHERE target_date = v_target_date::date AND type = 'in'
        GROUP BY TRIM(store_id::text)
    ),
    ofx_saidas_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(amount), 0) as ofx_saidas_total,
            -- Saídas justificadas avulsas (SOMENTE as que NÃO estão ligadas a uma conta já importada)
            COALESCE(SUM(CASE WHEN matched_bill_id IS NULL AND manual_category IS NOT NULL THEN amount ELSE 0 END), 0) as saidas_justificadas_avulsas
        FROM ofx_transactions
        WHERE target_date = v_target_date::date AND type = 'out'
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
    calculated_stores AS (
        SELECT 
            s.id as store_id,
            s.name as store_name,
            COALESCE(rt.bank_total, rl.bank_total, 0) as saldo_banco,
            COALESCE(v.vault_total, 0) as dinheiro_loja,
            COALESCE(rd.rede_bruto, 0) as rede_bruto,
            COALESCE(rd.rede_liquido, 0) as rede_liquido,
            COALESCE(rd.rede_taxas, 0) as rede_taxas,
            COALESCE(rd.rede_devolucoes, 0) as rede_devolucoes,
            COALESCE(oe.ofx_maquininhas, 0) as ofx_maquininhas,
            GREATEST(0, COALESCE(rd.rede_liquido, 0) - COALESCE(oe.ofx_maquininhas, 0)) as nao_entrou_valor,
            CASE 
                WHEN COALESCE(rd.rede_liquido, 0) = 0 THEN 'sem_movimento'
                WHEN COALESCE(oe.ofx_maquininhas, 0) >= COALESCE(rd.rede_liquido, 0) THEN 'entrou'
                WHEN COALESCE(oe.ofx_maquininhas, 0) > 0 THEN 'parcial'
                ELSE 'nao_entrou'
            END as status_compensacao,
            CASE 
                WHEN COALESCE(rt.bank_total, rl.bank_total, 0) >= 0 THEN 'credor' 
                ELSE 'devedor' 
            END as status_banco,
            COALESCE(oe.pix_total, 0) as pix,
            COALESCE(rt.na_loja_os, p.patio_total, rl.na_loja_os, 0) as na_loja_os,
            -- Entradas:
            COALESCE(oe.ofx_entradas_total, 0) as entradas_previsto, -- Real creditado no banco
            (COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0)) as entradas_conciliadas,
            -- dif_entradas:
            CASE 
                WHEN ABS(COALESCE(oe.ofx_entradas_total, 0) - (COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0))) <= 0.05 THEN 0.00
                ELSE ROUND(
                    (COALESCE(oe.ofx_entradas_total, 0) - (COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0))) - 
                    LEAST(
                        GREATEST(0, COALESCE(oe.ofx_entradas_total, 0) - (COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0))), 
                        COALESCE(oe.entradas_justificadas, 0)
                    ),
                    2
                )
            END as dif_entradas_raw,
            -- Saídas:
            COALESCE(sofx.ofx_saidas_total, 0) as saidas_ofx,
            COALESCE(bst.contas_loja_total, 0) as contas_loja,
            -- dif_saidas:
            CASE 
                WHEN ABS(COALESCE(sofx.ofx_saidas_total, 0) - COALESCE(bst.contas_loja_total, 0)) <= 0.05 THEN 0.00
                ELSE ROUND(
                    (COALESCE(sofx.ofx_saidas_total, 0) - COALESCE(bst.contas_loja_total, 0)) - 
                    LEAST(
                        GREATEST(0, COALESCE(sofx.ofx_saidas_total, 0) - COALESCE(bst.contas_loja_total, 0)), 
                        COALESCE(sofx.saidas_justificadas_avulsas, 0)
                    ),
                    2
                )
            END as dif_saidas_raw,
            -- Flags de movimento real da filial
            (COALESCE(oe.ofx_entradas_total, 0) > 0 OR COALESCE(sofx.ofx_saidas_total, 0) > 0) as has_ofx_movement,
            (COALESCE(rd.rede_bruto, 0) > 0 OR COALESCE(rd.rede_liquido, 0) > 0) as has_rede_movement,
            (COALESCE(bst.contas_loja_total, 0) > 0) as has_bills_movement,
            (COALESCE(oe.ofx_entradas_total, 0) = 0 AND COALESCE(sofx.ofx_saidas_total, 0) = 0 AND COALESCE(rd.rede_bruto, 0) = 0 AND COALESCE(bst.contas_loja_total, 0) = 0) as is_empty_store
        FROM stores_list s
        LEFT JOIN rede_agg rd ON rd.store_id = s.id
        LEFT JOIN ofx_entradas_agg oe ON oe.store_id = s.id
        LEFT JOIN ofx_saidas_agg sofx ON sofx.store_id = s.id
        LEFT JOIN bills_store_agg bst ON bst.store_id = s.id
        LEFT JOIN recon_today rt ON rt.store_id = s.id
        LEFT JOIN recon_latest rl ON rl.store_id = s.id
        LEFT JOIN patio_agg p ON p.store_id = s.id
        LEFT JOIN vault_agg v ON v.store_id = s.id
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'store_id', cs.store_id,
        'store_name', cs.store_name,
        'saldo_banco', cs.saldo_banco,
        'saldo_banco_ofx', cs.saldo_banco,
        'saldo_positivo_real', CASE WHEN cs.saldo_banco > 0 THEN cs.saldo_banco ELSE 0 END,
        'saldo_devedor_real', CASE WHEN cs.saldo_banco < 0 THEN ABS(cs.saldo_banco) ELSE 0 END,
        'dinheiro_loja', cs.dinheiro_loja,
        'rede_bruto', cs.rede_bruto,
        'rede_liquido', cs.rede_liquido,
        'rede_taxas', cs.rede_taxas,
        'rede_devolucoes', cs.rede_devolucoes,
        'ofx_maquininhas', cs.ofx_maquininhas,
        'nao_entrou_valor', cs.nao_entrou_valor,
        'status_compensacao', cs.status_compensacao,
        'status_banco', cs.status_banco,
        'pix', cs.pix,
        'na_loja_os', cs.na_loja_os,
        'entradas_realizadas', cs.entradas_previsto,
        'entradas_previsto', (cs.entradas_conciliadas + LEAST(GREATEST(0, cs.entradas_previsto - cs.entradas_conciliadas), cs.dif_entradas_raw)),
        'dif_entradas', CASE WHEN ABS(cs.dif_entradas_raw) <= 0.05 THEN 0.00 ELSE cs.dif_entradas_raw END,
        'diferenca_entradas', CASE WHEN ABS(cs.dif_entradas_raw) <= 0.05 THEN 0.00 ELSE cs.dif_entradas_raw END,
        'saidas_ofx', cs.saidas_ofx,
        'contas_loja', cs.contas_loja,
        'dif_saidas', CASE WHEN ABS(cs.dif_saidas_raw) <= 0.05 THEN 0.00 ELSE cs.dif_saidas_raw END,
        'diferenca_saidas', CASE WHEN ABS(cs.dif_saidas_raw) <= 0.05 THEN 0.00 ELSE cs.dif_saidas_raw END,
        'diferenca', ROUND((CASE WHEN ABS(cs.dif_entradas_raw) <= 0.05 THEN 0.00 ELSE cs.dif_entradas_raw END) - 
                           (CASE WHEN ABS(cs.dif_saidas_raw) <= 0.05 THEN 0.00 ELSE cs.dif_saidas_raw END), 2),
        -- Spec 443: Distinção estrita entre 100% conciliado real vs ausência de movimento
        'status', CASE 
            WHEN cs.is_empty_store THEN 'sem_movimento'
            WHEN ABS(cs.dif_entradas_raw) <= 0.05 AND ABS(cs.dif_saidas_raw) <= 0.05 THEN 'approved'
            ELSE 'divergence'
        END,
        'has_ofx_movement', cs.has_ofx_movement,
        'has_rede_movement', cs.has_rede_movement,
        'has_bills_movement', cs.has_bills_movement,
        'is_empty_store', cs.is_empty_store
    )), '[]'::jsonb) INTO v_stores_detail
    FROM calculated_stores cs;

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

        -- Auto-healing para snapshots congelados antes da importação de maquininhas:
        v_healed_cartoes := COALESCE((v_snapshot.metadata->>'cartoes_a_compensar')::numeric, 0);
        IF v_healed_cartoes = 0 THEN
            SELECT COALESCE(SUM(
                CASE 
                    WHEN settlement_status IN ('entrou', 'liquidado') THEN 0
                    WHEN settlement_status = 'parcial' THEN GREATEST(0, net_amount - COALESCE(settled_amount, 0))
                    ELSE net_amount
                END
            ), 0)
            INTO v_healed_cartoes
            FROM pos_transactions
            WHERE COALESCE(target_date, occurred_at::date) = v_target_date::date;
        END IF;

        -- Auto-healing para snapshots com saldo bancário zerado mas com registros em reconciliations:
        v_healed_saldo_banco := COALESCE(v_snapshot.saldo_bancario, 0);
        IF v_healed_saldo_banco = 0 THEN
            SELECT COALESCE(SUM(bank_total), 0) INTO v_healed_saldo_banco
            FROM reconciliations
            WHERE date = v_target_date::date;
        END IF;

        RETURN jsonb_build_object(
            'date', v_target_date,
            'is_closed', true,
            'is_marco_zero', COALESCE((v_snapshot.metadata->>'is_marco_zero')::boolean, false),
            'closed_at', v_snapshot.closed_at,
            'status_geral', v_status_geral,
            'diferenca_final', v_diferenca_final,
            
            -- 5 Macro Pilares
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
            'caixa_anterior', COALESCE((v_snapshot.metadata->>'caixa_anterior')::numeric, v_prev_snapshot.caixa_atual, 0),
            'fluxo_caixa', COALESCE((v_snapshot.metadata->>'fluxo_caixa')::numeric, (COALESCE(v_snapshot.caixa_atual, 0) - COALESCE((v_snapshot.metadata->>'caixa_anterior')::numeric, v_prev_snapshot.caixa_atual, 0))),
            'faturamento_periodo', COALESCE(v_snapshot.faturamento, 0),
            'faturamento_oi_base', COALESCE((v_snapshot.metadata->>'faturamento_oi_base')::numeric, v_snapshot.faturamento, 0),
            'faturamento_ajustes', COALESCE((v_snapshot.metadata->>'faturamento_ajustes')::numeric, 0),
            'odometro_anterior', COALESCE((v_snapshot.metadata->>'odometro_anterior')::numeric, 0),
            'odometro_hoje', COALESCE((v_snapshot.metadata->>'odometro_hoje')::numeric, 0),
            'contas_base', COALESCE(v_snapshot.contas_a_pagar, 0),
            'juros_rede', COALESCE(v_snapshot.juros_rede, 0),
            'subtotal_contas', COALESCE((v_snapshot.metadata->>'subtotal_contas')::numeric, (COALESCE(v_snapshot.contas_a_pagar, 0) + COALESCE(v_snapshot.juros_rede, 0))),
            'valor_disp_contas', COALESCE((v_snapshot.metadata->>'valor_disp_contas')::numeric, 0),
            
            -- Lojas (Usa v_stores_detail recalculado de forma canônica)
            'stores', v_stores_detail,
            'cash_vault_snapshot', v_snapshot.metadata->'cash_vault_snapshot'
        );
    END IF;

    -- =========================================================================
    -- RAMAL 2: DIA ABERTO OU FORÇADO DINÂMICO (CÁLCULO DIRETO DAS TABELAS SSOT)
    -- =========================================================================
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

    -- 3. Cartões a Compensar (estritamente o que NÃO foi liquidado no banco)
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
    WHERE COALESCE(target_date, occurred_at::date) = v_target_date::date;

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

    -- 5. Pátio Ativo (WIP)
    SELECT COALESCE(SUM(total_value - paid_value), 0) INTO v_na_loja_os
    FROM patio_os
    WHERE (status ILIKE '%aberto%' OR status ILIKE '%parcial%' OR status ILIKE '%pendente%' OR status = 'ABERTA' OR status = 'PENDENTE')
      AND opened_at::date <= v_target_date::date;

    IF v_na_loja_os = 0 AND v_snapshot_found AND COALESCE(v_snapshot.total_patio, 0) > 0 THEN
        v_na_loja_os := v_snapshot.total_patio;
    ELSIF v_na_loja_os = 0 AND v_prev_snapshot.total_patio IS NOT NULL AND v_prev_snapshot.total_patio > 0 THEN
        v_na_loja_os := v_prev_snapshot.total_patio;
    END IF;

    -- 6. Caixa Atual & Fluxo
    v_caixa_atual := (v_total_saldo_banco_positivo + v_dinheiro_mp + v_a_receber + v_na_loja_os) - v_saldo_negativo_itau;

    IF v_snapshot_found AND (COALESCE((v_snapshot.metadata->>'is_caixa_atual_override')::boolean, false) = true) THEN
        v_caixa_atual := COALESCE(v_snapshot.caixa_atual, v_caixa_atual);
    END IF;

    IF v_snapshot_found AND v_snapshot.metadata->>'caixa_anterior' IS NOT NULL THEN
        v_caixa_anterior := (v_snapshot.metadata->>'caixa_anterior')::numeric;
    ELSIF v_prev_snapshot.caixa_atual IS NOT NULL THEN
        v_caixa_anterior := v_prev_snapshot.caixa_atual;
    ELSE
        v_caixa_anterior := 0;
    END IF;

    v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;

    -- 7. Faturamento DRE Dinâmico
    SELECT COALESCE(SUM(amount), 0) INTO v_faturamento_oi_base
    FROM transactions
    WHERE target_date = v_target_date::date AND type = 'in' AND source = 'ofx';

    SELECT COALESCE(SUM(amount), 0) INTO v_faturamento_ajustes
    FROM daily_revenue_adjustments
    WHERE date = v_target_date::date;

    v_faturamento_periodo := v_faturamento_oi_base + v_faturamento_ajustes;

    -- 8. Contas a Pagar & Juros Dinâmicos
    SELECT COALESCE(SUM(amount), 0) INTO v_contas_imported_bills
    FROM daily_manual_bills
    WHERE date = v_target_date::date AND COALESCE(contabilizar_no_subtotal, true) = true;

    IF v_contas_imported_bills > 0 THEN
        v_contas_base := v_contas_imported_bills;
    ELSE
        SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_contas_base
        FROM transactions
        WHERE target_date = v_target_date::date AND type = 'out' AND source = 'ofx';
    END IF;

    SELECT COALESCE(SUM(fee_amount), 0) INTO v_juros_rede
    FROM pos_transactions
    WHERE COALESCE(target_date, occurred_at::date) = v_target_date::date;

    v_subtotal_contas := v_contas_base + v_juros_rede;
    v_valor_disp_contas := v_faturamento_periodo - v_fluxo_caixa;
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
        'faturamento_periodo', v_faturamento_periodo,
        'faturamento_oi_base', v_faturamento_oi_base,
        'faturamento_ajustes', v_faturamento_ajustes,
        'odometro_anterior', COALESCE((v_prev_snapshot.metadata->>'odometro_hoje')::numeric, 0),
        'odometro_hoje', COALESCE((v_snapshot.metadata->>'odometro_hoje')::numeric, 0),
        'contas_base', v_contas_base,
        'juros_rede', v_juros_rede,
        'subtotal_contas', v_subtotal_contas,
        'valor_disp_contas', v_valor_disp_contas,
        
        -- Lojas e Cofre
        'stores', v_stores_detail,
        'cash_vault_snapshot', null
    );
END;
$function$;

-- =========================================================================
-- 2. auto_match_daily_transactions: Vínculo informativo de OS já paga,
--    ampliação da janela de ciclo da OS e zero mutação de settlement_status
-- =========================================================================
CREATE OR REPLACE FUNCTION public.auto_match_daily_transactions(p_date text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_target_date DATE;
    v_pos_record RECORD;
    v_ofx_record RECORD;
    v_os_record public.patio_os%ROWTYPE;
    v_count_candidates INT := 0;
    v_pos_matched INT := 0;
    v_pix_matched INT := 0;
    v_collision_count INT := 0;
    v_corporate_tagged INT := 0;
    v_saidas_result JSONB;
    v_receivables_result JSONB;
    v_summary_result JSONB;
BEGIN
    IF p_date IS NULL THEN
        RAISE EXCEPTION 'p_date não pode ser nulo';
    END IF;

    v_target_date := p_date::date;

    -- =========================================================================
    -- FASE 0: CLASSIFICAÇÃO INTERCOMPANY ANTES DO PIX (NUNCA CASAM COM OS)
    -- =========================================================================
    UPDATE public.ofx_transactions
    SET manual_category = 'Transferência Entre Lojas [Apenas Conciliar]',
        manual_justification = 'Transferência Intercompany (Não-OS)',
        match_status = 'intercompany_paired',
        matched_os_number = NULL,
        contabilizar_no_subtotal = false,
        updated_at = now()
    WHERE target_date = v_target_date
      AND type = 'in'
      AND (
          COALESCE(counterpart_name, '') ILIKE '%EMPORIO DO OLEO%'
          OR COALESCE(counterpart_name, '') ILIKE '%HOLDING%'
          OR COALESCE(counterpart_name, '') ILIKE '%TRANSFERENCIA ENTRE%'
          OR COALESCE(counterpart_name, '') ILIKE '%MP AUTO MECANICA%'
          OR COALESCE(counterpart_name, '') ILIKE '%MP JABAQUARA%'
          OR COALESCE(counterpart_name, '') ILIKE '%MECANICA POPULAR%'
          OR COALESCE(counterpart_name, '') ILIKE '%AUTO MECANICA POPULAR%'
          OR COALESCE(counterpart_name, '') ILIKE '%HD CENTRO AUTOMOTIVO%'
          OR COALESCE(counterpart_name, '') ILIKE '%REI DO MODULO%'
          OR COALESCE(cnpj_cpf, '') IN ('29.954.349/0001-44', '63.102.080/0001-06', '50.903.911/0001-05', '50.901.642/0001-30')
      );

    -- 0B. Empréstimos, Seguros e Rendimentos
    UPDATE public.ofx_transactions
    SET manual_category = 'EMPRÉSTIMO',
        manual_justification = 'Empréstimo Capital de Giro (Corporativo / Não-OS)',
        updated_at = now()
    WHERE target_date = v_target_date AND type = 'in' AND matched_os_number IS NULL
      AND (COALESCE(counterpart_name, '') ILIKE '%EMPREST%' OR COALESCE(counterpart_name, '') ILIKE '%CAPITAL DE GIRO%');

    UPDATE public.ofx_transactions
    SET manual_category = 'RENDIMENTOS',
        manual_justification = 'Aplicação / Resgate Automático',
        updated_at = now()
    WHERE target_date = v_target_date AND type = 'in' AND matched_os_number IS NULL
      AND (COALESCE(counterpart_name, '') ILIKE '%REND%' OR COALESCE(counterpart_name, '') ILIKE '%APLIC%' OR COALESCE(counterpart_name, '') ILIKE '%RESG%');

    SELECT count(*) INTO v_corporate_tagged
    FROM public.ofx_transactions
    WHERE target_date = v_target_date
      AND type = 'in'
      AND manual_category IN ('EMPRÉSTIMO', 'OUTROS', 'TRANSFERÊNCIA', 'Transferência Entre Lojas [Apenas Conciliar]', 'RENDIMENTOS');

    -- =========================================================================
    -- FASE 1: REDE x OS (CANÔNICO: MESMA FILIAL, VALOR BRUTO, IDEMPOTÊNCIA)
    -- =========================================================================
    FOR v_pos_record IN 
        SELECT id, store_id, net_amount, gross_amount, payment_method, machine_name, target_date, occurred_at, settlement_status
        FROM public.pos_transactions
        WHERE target_date = v_target_date
          AND matched_os_number IS NULL
          AND store_id IS NOT NULL
          AND (transaction_type IS NULL OR transaction_type = 'venda')
          AND gross_amount > 0
        ORDER BY gross_amount DESC
    LOOP
        v_os_record := NULL;
        v_count_candidates := 0;

        -- 1A. Procura OS na mesma filial cujo crédito/débito bata exatamente com o BRUTO
        -- Spec 443: Janela de ciclo operacional de vida da OS (entre abertura e fechamento/último pagamento)
        SELECT count(*) INTO v_count_candidates
        FROM public.patio_os
        WHERE store_id = v_pos_record.store_id
          AND COALESCE(match_status, '') <> 'MATCHED'
          AND os_number NOT ILIKE '%faturamento%'
          AND os_number NOT ILIKE '%fat%'
          AND (
              (opened_at::date = v_target_date OR last_payment_date = v_target_date OR closed_at::date = v_target_date)
              OR (
                  opened_at::date <= v_target_date
                  AND (
                      closed_at IS NULL 
                      OR closed_at::date >= v_target_date - INTERVAL '7 days'
                      OR last_payment_date >= v_target_date - INTERVAL '7 days'
                  )
                  AND opened_at >= (v_target_date - INTERVAL '60 days')
              )
          )
          AND (
              ABS(COALESCE(credit_value, 0) - v_pos_record.gross_amount) <= 0.05
              OR ABS(COALESCE(debit_value, 0) - v_pos_record.gross_amount) <= 0.05
              OR ABS(COALESCE(credit_debit_value, 0) - v_pos_record.gross_amount) <= 0.05
          );

        IF v_count_candidates = 1 THEN
            SELECT * INTO v_os_record
            FROM public.patio_os
            WHERE store_id = v_pos_record.store_id
              AND COALESCE(match_status, '') <> 'MATCHED'
              AND os_number NOT ILIKE '%faturamento%'
              AND os_number NOT ILIKE '%fat%'
              AND (
                  (opened_at::date = v_target_date OR last_payment_date = v_target_date OR closed_at::date = v_target_date)
                  OR (
                      opened_at::date <= v_target_date
                      AND (
                          closed_at IS NULL 
                          OR closed_at::date >= v_target_date - INTERVAL '7 days'
                          OR last_payment_date >= v_target_date - INTERVAL '7 days'
                      )
                      AND opened_at >= (v_target_date - INTERVAL '60 days')
                  )
              )
              AND (
                  ABS(COALESCE(credit_value, 0) - v_pos_record.gross_amount) <= 0.05
                  OR ABS(COALESCE(debit_value, 0) - v_pos_record.gross_amount) <= 0.05
                  OR ABS(COALESCE(credit_debit_value, 0) - v_pos_record.gross_amount) <= 0.05
              )
            LIMIT 1;
        ELSIF v_count_candidates > 1 THEN
            v_collision_count := v_collision_count + 1;
        END IF;

        -- 1B. Fallback para OS em aberto/pendente batendo por saldo pendente (total_value - paid_value)
        IF v_os_record.id IS NULL AND v_count_candidates = 0 THEN
            SELECT count(*) INTO v_count_candidates
            FROM public.patio_os
            WHERE store_id = v_pos_record.store_id
              AND COALESCE(match_status, '') <> 'MATCHED'
              AND os_number NOT ILIKE '%faturamento%'
              AND os_number NOT ILIKE '%fat%'
              AND (
                  status ILIKE '%abert%' 
                  OR status ILIKE '%parcial%' 
                  OR status ILIKE '%pendent%' 
                  OR (total_value - paid_value) > 0.05
              )
              AND (opened_at >= (v_target_date - INTERVAL '60 days') AND opened_at::date <= v_target_date)
              AND ABS((total_value - paid_value) - v_pos_record.gross_amount) <= 0.05;

            IF v_count_candidates = 1 THEN
                SELECT * INTO v_os_record
                FROM public.patio_os
                WHERE store_id = v_pos_record.store_id
                  AND COALESCE(match_status, '') <> 'MATCHED'
                  AND os_number NOT ILIKE '%faturamento%'
                  AND os_number NOT ILIKE '%fat%'
                  AND (
                      status ILIKE '%abert%' 
                      OR status ILIKE '%parcial%' 
                      OR status ILIKE '%pendent%' 
                      OR (total_value - paid_value) > 0.05
                  )
                  AND (opened_at >= (v_target_date - INTERVAL '60 days') AND opened_at::date <= v_target_date)
                  AND ABS((total_value - paid_value) - v_pos_record.gross_amount) <= 0.05
                LIMIT 1;
            ELSIF v_count_candidates > 1 THEN
                v_collision_count := v_collision_count + 1;
            END IF;
        END IF;

        -- 1C. Aplicação Segura e Idempotente do Vínculo
        -- Spec 443: Vínculo informativo de OS já paga sem duplicar paid_value e sem liquidar banco indevidamente
        IF v_os_record.id IS NOT NULL THEN
            UPDATE public.pos_transactions
            SET matched_os_number = v_os_record.os_number,
                settlement_status = COALESCE(settlement_status, 'a_compensar'),
                updated_at = now()
            WHERE id = v_pos_record.id;

            IF v_os_record.status NOT ILIKE '%finalizad%' AND v_os_record.status NOT ILIKE '%pago%' AND (v_os_record.total_value - v_os_record.paid_value) > 0.05 THEN
                UPDATE public.patio_os
                SET paid_value = LEAST(total_value, paid_value + v_pos_record.gross_amount),
                    status = CASE 
                        WHEN (paid_value + v_pos_record.gross_amount) >= total_value - 0.05 THEN 'finalizada'
                        ELSE 'pago_parcial'
                    END,
                    closed_at = CASE 
                        WHEN (paid_value + v_pos_record.gross_amount) >= total_value - 0.05 THEN COALESCE(closed_at, v_target_date::timestamptz)
                        ELSE closed_at 
                    END,
                    last_payment_date = v_target_date,
                    match_status = 'MATCHED',
                    updated_at = now()
                WHERE id = v_os_record.id;
            ELSE
                UPDATE public.patio_os
                SET match_status = 'MATCHED',
                    last_payment_date = COALESCE(last_payment_date, v_target_date),
                    updated_at = now()
                WHERE id = v_os_record.id;
            END IF;

            BEGIN
                INSERT INTO public.conciliation_matches (
                    store_id, system_os_number, rede_transaction_id, status, target_date
                ) VALUES (
                    v_pos_record.store_id,
                    v_os_record.os_number,
                    v_pos_record.id,
                    'matched',
                    v_target_date
                );
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;

            v_pos_matched := v_pos_matched + 1;
        END IF;
    END LOOP;

    -- =========================================================================
    -- FASE 2: PIX OFX x OS: PARCELA + IDENTIDADE + FILIAL (CANÔNICO E ESTRITO)
    -- =========================================================================
    FOR v_ofx_record IN 
        SELECT id, store_id, amount, counterpart_name, fitid, bank_name, target_date, occurred_at, cnpj_cpf
        FROM public.ofx_transactions
        WHERE target_date = v_target_date
          AND type = 'in'
          AND matched_os_number IS NULL
          AND (manual_category IS NULL OR manual_category = 'PIX / Recebimento OS')
          AND NOT (
              COALESCE(counterpart_name, '') ILIKE '%REDE%'
              OR COALESCE(counterpart_name, '') ILIKE '%CARD%'
              OR COALESCE(counterpart_name, '') ILIKE '%CIELO%'
              OR COALESCE(counterpart_name, '') ILIKE '%STONE%'
              OR COALESCE(counterpart_name, '') ILIKE '%PAGSEGURO%'
              OR COALESCE(counterpart_name, '') ILIKE '%EMPORIO DO OLEO%'
              OR COALESCE(counterpart_name, '') ILIKE '%HOLDING%'
              OR COALESCE(counterpart_name, '') ILIKE '%TRANSFERENCIA ENTRE%'
              OR COALESCE(counterpart_name, '') ILIKE '%MP AUTO MECANICA%'
              OR COALESCE(counterpart_name, '') ILIKE '%MP JABAQUARA%'
              OR COALESCE(counterpart_name, '') ILIKE '%MECANICA POPULAR%'
              OR COALESCE(counterpart_name, '') ILIKE '%AUTO MECANICA POPULAR%'
              OR COALESCE(counterpart_name, '') ILIKE '%HD CENTRO AUTOMOTIVO%'
              OR COALESCE(counterpart_name, '') ILIKE '%REI DO MODULO%'
          )
        ORDER BY amount DESC
    LOOP
        v_os_record := NULL;

        -- 2A. Busca por número da OS explícito contido no descritivo bancário
        IF v_ofx_record.store_id IS NOT NULL THEN
            SELECT * INTO v_os_record
            FROM public.patio_os
            WHERE store_id = v_ofx_record.store_id
              AND (
                  (LENGTH(os_number) >= 3 AND (
                      COALESCE(v_ofx_record.fitid, '') ~ ('\\y' || os_number || '\\y')
                      OR COALESCE(v_ofx_record.counterpart_name, '') ~ ('\\y' || os_number || '\\y')
                      OR COALESCE(v_ofx_record.bank_name, '') ~ ('\\y' || os_number || '\\y')
                  ))
              )
            LIMIT 1;
        END IF;

        -- 2B. Busca estrita por pix_transfer_value + IDENTIDADE FORTE DO CLIENTE
        IF v_os_record.id IS NULL AND v_ofx_record.store_id IS NOT NULL THEN
            SELECT * INTO v_os_record
            FROM public.patio_os
            WHERE store_id = v_ofx_record.store_id
              AND COALESCE(pix_transfer_value, 0) > 0
              AND ABS(COALESCE(pix_transfer_value, 0) - v_ofx_record.amount) <= 0.05
              AND client_name IS NOT NULL
              AND (
                  (
                      LENGTH(REGEXP_REPLACE(COALESCE(v_ofx_record.cnpj_cpf, ''), '\\D', '', 'g')) >= 11
                      AND REGEXP_REPLACE(COALESCE(v_ofx_record.cnpj_cpf, ''), '\\D', '', 'g') = REGEXP_REPLACE(COALESCE(client_name, ''), '\\D', '', 'g')
                  )
                  OR (
                      LENGTH(SPLIT_PART(TRIM(client_name), ' ', 1)) >= 4
                      AND SPLIT_PART(TRIM(client_name), ' ', 1) NOT IN ('AUTO', 'CENTRO', 'POSTO', 'LTDA', 'MECANICA', 'SERVICOS', 'RECEBIMENTO', 'TRANSFERENCIA', 'CLIENTE')
                      AND v_ofx_record.counterpart_name ILIKE ('%' || SPLIT_PART(TRIM(client_name), ' ', 1) || '%')
                  )
              )
            ORDER BY opened_at DESC
            LIMIT 1;
        END IF;

        IF v_os_record.id IS NOT NULL THEN
            UPDATE public.ofx_transactions
            SET matched_os_number = v_os_record.os_number,
                manual_category = COALESCE(manual_category, 'PIX / Recebimento OS'),
                updated_at = now()
            WHERE id = v_ofx_record.id;

            IF v_os_record.status NOT ILIKE '%finalizad%' AND v_os_record.status NOT ILIKE '%pago%' AND (v_os_record.total_value - v_os_record.paid_value) > 0.05 THEN
                UPDATE public.patio_os
                SET paid_value = LEAST(total_value, paid_value + v_ofx_record.amount),
                    status = CASE 
                        WHEN (paid_value + v_ofx_record.amount) >= total_value - 0.05 THEN 'finalizada'
                        ELSE 'pago_parcial'
                    END,
                    closed_at = CASE 
                        WHEN (paid_value + v_ofx_record.amount) >= total_value - 0.05 THEN COALESCE(closed_at, v_target_date::timestamptz)
                        ELSE closed_at 
                    END,
                    last_payment_date = v_target_date,
                    match_status = 'MATCHED',
                    updated_at = now()
                WHERE id = v_os_record.id;
            ELSE
                UPDATE public.patio_os
                SET match_status = 'MATCHED',
                    last_payment_date = COALESCE(last_payment_date, v_target_date),
                    updated_at = now()
                WHERE id = v_os_record.id;
            END IF;

            BEGIN
                INSERT INTO public.conciliation_matches (
                    store_id, system_os_number, ofx_transaction_id, status, target_date
                ) VALUES (
                    v_ofx_record.store_id,
                    v_os_record.os_number,
                    v_ofx_record.id,
                    'matched',
                    v_target_date
                );
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;

            v_pix_matched := v_pix_matched + 1;
        END IF;
    END LOOP;

    -- =========================================================================
    -- FASE 3: AUTO-MATCH DE SAÍDAS (DESPESAS E PARES RESTANTES)
    -- =========================================================================
    BEGIN
        v_saidas_result := public.auto_match_saidas(v_target_date::text);
    EXCEPTION WHEN OTHERS THEN
        v_saidas_result := jsonb_build_object('success', false, 'error', SQLERRM);
    END;

    -- =========================================================================
    -- FASE 4: AUTO-MATCH DE RECEBÍVEIS PROTEGIDO
    -- =========================================================================
    BEGIN
        v_receivables_result := public.auto_match_receivables(v_target_date::text, NULL);
    EXCEPTION WHEN OTHERS THEN
        v_receivables_result := jsonb_build_object('success', false, 'error', SQLERRM);
    END;

    -- =========================================================================
    -- FASE 5: RECALCULAR RESUMO CANÔNICO APÓS TODAS AS MUTAÇÕES
    -- =========================================================================
    BEGIN
        v_summary_result := public.get_daily_reconciliation_summary(v_target_date::text, true);
    EXCEPTION WHEN OTHERS THEN
        v_summary_result := jsonb_build_object('success', false, 'error', SQLERRM);
    END;

    RETURN jsonb_build_object(
        'success', true,
        'date', v_target_date,
        'pos_matched', v_pos_matched,
        'pix_matched', v_pix_matched,
        'collisions_prevented', v_collision_count,
        'corporate_tagged', v_corporate_tagged,
        'saidas_result', v_saidas_result,
        'receivables_result', v_receivables_result
    );
END;
$function$;

-- =========================================================================
-- 3. match_stage2_rede_os: Espelhamento exato do matcher com ciclo de vida
--    e sem liquidação bancária indevida
-- =========================================================================
CREATE OR REPLACE FUNCTION public.match_stage2_rede_os(p_target_date date, p_store_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_pos RECORD;
    v_chosen_os_id UUID;
    v_chosen_os_number TEXT;
    v_chosen_os_total_value NUMERIC;
    v_chosen_os_paid_value NUMERIC;
    v_chosen_os_status TEXT;
    v_matched_os_ids UUID[] := '{}';
    v_candidates_count INT;
    v_target_day_candidates_count INT;
    v_matched_count INT := 0;
    v_collision_count INT := 0;
    v_collisions JSONB := '[]'::jsonb;
    v_candidate_samples JSONB;
    v_tier INT;
    
    v_total_rede_bruto NUMERIC := 0;
    v_total_rede_liquido NUMERIC := 0;
    v_total_rede_taxas NUMERIC := 0;
    v_unmatched_pos_count INT := 0;
    v_unmatched_pos_sample JSONB := '[]'::jsonb;
    v_unmatched_os_cards_count INT := 0;
    v_unmatched_os_cards_sample JSONB := '[]'::jsonb;
BEGIN
    IF p_target_date IS NULL THEN
        RAISE EXCEPTION 'p_target_date é obrigatório.';
    END IF;

    -- 1. Pré-carregar IDs de OSs que já possuem vínculo na data alvo para evitar reutilização
    SELECT COALESCE(ARRAY_AGG(id), '{}') INTO v_matched_os_ids
    FROM public.patio_os
    WHERE store_id = COALESCE(p_store_id, store_id)
      AND (
          match_status = 'MATCHED'
          OR os_number IN (
              SELECT matched_os_number 
              FROM public.pos_transactions 
              WHERE target_date = p_target_date 
                AND matched_os_number IS NOT NULL
                AND (p_store_id IS NULL OR store_id = p_store_id)
          )
      );

    IF v_matched_os_ids IS NULL THEN
        v_matched_os_ids := '{}';
    END IF;

    -- 2. Iterar sobre POS transactions não pareadas da data
    FOR v_pos IN 
        SELECT id, store_id, net_amount, gross_amount, fee_amount, payment_method, machine_name, occurred_at, settlement_status
        FROM public.pos_transactions
        WHERE target_date = p_target_date
          AND matched_os_number IS NULL
          AND (p_store_id IS NULL OR store_id = p_store_id)
          AND store_id IS NOT NULL
          AND (transaction_type IS NULL OR transaction_type = 'venda')
          AND gross_amount > 0
        ORDER BY gross_amount DESC
    LOOP
        v_chosen_os_id := NULL;
        v_chosen_os_number := NULL;
        v_chosen_os_total_value := NULL;
        v_chosen_os_paid_value := NULL;
        v_chosen_os_status := NULL;
        v_candidates_count := 0;
        v_candidate_samples := '[]'::jsonb;
        v_tier := 0;

        -- =====================================================================
        -- TIER 1: Match Específico de Cartão por Valor BRUTO
        -- =====================================================================
        SELECT COUNT(*), jsonb_agg(jsonb_build_object(
            'id', id, 
            'os_number', os_number, 
            'client_name', COALESCE(client_name, 'Cliente'), 
            'total_value', total_value, 
            'pending_value', GREATEST(0, total_value - paid_value),
            'opened_at', opened_at
        ))
        INTO v_candidates_count, v_candidate_samples
        FROM public.patio_os
        WHERE store_id = v_pos.store_id
          AND NOT (id = ANY(v_matched_os_ids))
          AND COALESCE(match_status, '') <> 'MATCHED'
          AND os_number NOT ILIKE '%faturamento%'
          AND os_number NOT ILIKE '%fat%'
          AND (
              (opened_at::date = p_target_date OR last_payment_date = p_target_date OR closed_at::date = p_target_date)
              OR (
                  opened_at::date <= p_target_date
                  AND (
                      closed_at IS NULL 
                      OR closed_at::date >= p_target_date - INTERVAL '7 days'
                      OR last_payment_date >= p_target_date - INTERVAL '7 days'
                  )
                  AND opened_at >= (p_target_date - INTERVAL '60 days')
              )
          )
          AND (
              ABS(COALESCE(credit_value, 0) - v_pos.gross_amount) <= 0.05
              OR ABS(COALESCE(debit_value, 0) - v_pos.gross_amount) <= 0.05
              OR ABS(COALESCE(credit_debit_value, 0) - v_pos.gross_amount) <= 0.05
          );

        IF v_candidates_count > 0 THEN
            v_tier := 1;
        END IF;

        -- =====================================================================
        -- TIER 2: Match por Saldo Pendente (total_value - paid_value) via BRUTO
        -- =====================================================================
        IF v_tier = 0 THEN
            SELECT COUNT(*), jsonb_agg(jsonb_build_object(
                'id', id, 
                'os_number', os_number, 
                'client_name', COALESCE(client_name, 'Cliente'), 
                'total_value', total_value, 
                'pending_value', GREATEST(0, total_value - paid_value),
                'opened_at', opened_at
            ))
            INTO v_candidates_count, v_candidate_samples
            FROM public.patio_os
            WHERE store_id = v_pos.store_id
              AND NOT (id = ANY(v_matched_os_ids))
              AND COALESCE(match_status, '') <> 'MATCHED'
              AND os_number NOT ILIKE '%faturamento%'
              AND os_number NOT ILIKE '%fat%'
              AND (
                  (opened_at::date = p_target_date OR last_payment_date = p_target_date OR closed_at::date = p_target_date)
                  OR (
                      opened_at >= (p_target_date - INTERVAL '60 days')
                      AND opened_at::date <= p_target_date
                      AND (
                          status ILIKE '%abert%' 
                          OR status ILIKE '%parcial%' 
                          OR status ILIKE '%pendent%' 
                          OR (total_value - paid_value) > 0.05
                      )
                  )
              )
              AND (total_value - paid_value) > 0.05
              AND ABS((total_value - paid_value) - v_pos.gross_amount) <= 0.05;

            IF v_candidates_count > 0 THEN
                v_tier := 2;
            END IF;
        END IF;

        -- =====================================================================
        -- RESOLUÇÃO DE DECISÃO E DESEMPATE INTELIGENTE
        -- =====================================================================
        IF v_candidates_count = 1 THEN
            SELECT id, os_number, total_value, paid_value, status
            INTO v_chosen_os_id, v_chosen_os_number, v_chosen_os_total_value, v_chosen_os_paid_value, v_chosen_os_status
            FROM public.patio_os
            WHERE id = (v_candidate_samples->0->>'id')::uuid;

        ELSIF v_candidates_count > 1 THEN
            SELECT COUNT(*), jsonb_agg(cand)
            INTO v_target_day_candidates_count, v_candidate_samples
            FROM jsonb_array_elements(v_candidate_samples) cand
            WHERE (cand->>'opened_at')::date = p_target_date;

            IF v_target_day_candidates_count = 1 THEN
                SELECT id, os_number, total_value, paid_value, status
                INTO v_chosen_os_id, v_chosen_os_number, v_chosen_os_total_value, v_chosen_os_paid_value, v_chosen_os_status
                FROM public.patio_os
                WHERE id = (v_candidate_samples->0->>'id')::uuid;
            ELSIF v_target_day_candidates_count > 1 AND v_pos.occurred_at IS NOT NULL THEN
                SELECT id, os_number, total_value, paid_value, status
                INTO v_chosen_os_id, v_chosen_os_number, v_chosen_os_total_value, v_chosen_os_paid_value, v_chosen_os_status
                FROM public.patio_os
                WHERE id IN (
                    SELECT (cand->>'id')::uuid 
                    FROM jsonb_array_elements(v_candidate_samples) cand
                )
                ORDER BY ABS(EXTRACT(EPOCH FROM (v_pos.occurred_at - opened_at))) ASC
                LIMIT 1;
            ELSE
                v_collision_count := v_collision_count + 1;
                v_collisions := v_collisions || jsonb_build_object(
                    'pos_id', v_pos.id,
                    'store_id', v_pos.store_id,
                    'gross_amount', v_pos.gross_amount,
                    'net_amount', v_pos.net_amount,
                    'payment_method', v_pos.payment_method,
                    'candidates', v_candidate_samples
                );
            END IF;
        END IF;

        -- =====================================================================
        -- APLICAÇÃO ATÔMICA DO CASAMENTO
        -- Spec 443: Vínculo informativo de OS sem dupla baixa e sem liquidar banco
        -- =====================================================================
        IF v_chosen_os_id IS NOT NULL THEN
            UPDATE public.pos_transactions
            SET matched_os_number = v_chosen_os_number,
                settlement_status = COALESCE(settlement_status, 'a_compensar'),
                updated_at = now()
            WHERE id = v_pos.id;

            IF v_chosen_os_status NOT ILIKE '%finalizad%' AND v_chosen_os_status NOT ILIKE '%pago%' AND (v_chosen_os_total_value - v_chosen_os_paid_value) > 0.05 THEN
                UPDATE public.patio_os
                SET paid_value = LEAST(total_value, paid_value + v_pos.gross_amount),
                    status = CASE 
                        WHEN (paid_value + v_pos.gross_amount) >= total_value - 0.05 THEN 'finalizada' 
                        ELSE 'pago_parcial' 
                    END,
                    closed_at = CASE 
                        WHEN (paid_value + v_pos.gross_amount) >= total_value - 0.05 THEN COALESCE(closed_at, p_target_date::timestamptz)
                        ELSE closed_at 
                    END,
                    last_payment_date = p_target_date,
                    match_status = 'MATCHED',
                    updated_at = now()
                WHERE id = v_chosen_os_id;
            ELSE
                UPDATE public.patio_os
                SET match_status = 'MATCHED',
                    last_payment_date = COALESCE(last_payment_date, p_target_date),
                    updated_at = now()
                WHERE id = v_chosen_os_id;
            END IF;

            BEGIN
                INSERT INTO public.conciliation_matches (
                    store_id, system_os_number, rede_transaction_id, status, target_date
                ) VALUES (
                    v_pos.store_id, v_chosen_os_number, v_pos.id, 'matched', p_target_date
                );
            EXCEPTION WHEN OTHERS THEN NULL; END;

            v_matched_os_ids := array_append(v_matched_os_ids, v_chosen_os_id);
            v_matched_count := v_matched_count + 1;
        END IF;
    END LOOP;

    -- Totalizadores da Adquirente no dia
    SELECT 
        COALESCE(SUM(gross_amount), 0),
        COALESCE(SUM(net_amount), 0),
        COALESCE(SUM(fee_amount), 0)
    INTO v_total_rede_bruto, v_total_rede_liquido, v_total_rede_taxas
    FROM public.pos_transactions
    WHERE target_date = p_target_date
      AND (p_store_id IS NULL OR store_id = p_store_id);

    -- Resíduos A: Cartões sem OS
    SELECT count(*), COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'store_id', store_id, 'gross_amount', gross_amount, 'net_amount', net_amount, 'machine_name', machine_name, 'payment_method', payment_method
    )), '[]'::jsonb)
    INTO v_unmatched_pos_count, v_unmatched_pos_sample
    FROM (
        SELECT id, store_id, gross_amount, net_amount, machine_name, payment_method
        FROM public.pos_transactions
        WHERE target_date = p_target_date
          AND matched_os_number IS NULL
          AND (p_store_id IS NULL OR store_id = p_store_id)
        ORDER BY gross_amount DESC
        LIMIT 20
    ) t;

    -- Resíduos B: OSs com Cartão não passado
    SELECT count(*), COALESCE(jsonb_agg(jsonb_build_object(
        'id', id, 'store_id', store_id, 'os_number', os_number, 'client_name', client_name, 
        'credit_value', credit_value, 'debit_value', debit_value, 'credit_debit_value', credit_debit_value
    )), '[]'::jsonb)
    INTO v_unmatched_os_cards_count, v_unmatched_os_cards_sample
    FROM (
        SELECT id, store_id, os_number, client_name, credit_value, debit_value, credit_debit_value
        FROM public.patio_os
        WHERE (opened_at::date = p_target_date OR last_payment_date = p_target_date)
          AND (COALESCE(credit_value, 0) > 0 OR COALESCE(debit_value, 0) > 0 OR COALESCE(credit_debit_value, 0) > 0)
          AND COALESCE(match_status, '') <> 'MATCHED'
          AND (p_store_id IS NULL OR store_id = p_store_id)
        ORDER BY os_number ASC
        LIMIT 20
    ) o;

    RETURN jsonb_build_object(
        'success', true,
        'target_date', p_target_date,
        'matched_count', v_matched_count,
        'collisions_count', v_collision_count,
        'collisions', v_collisions,
        'unmatched_pos_count', v_unmatched_pos_count,
        'unmatched_pos_sample', v_unmatched_pos_sample,
        'unmatched_os_cards_count', v_unmatched_os_cards_count,
        'unmatched_os_cards_sample', v_unmatched_os_cards_sample,
        'totals', jsonb_build_object(
            'rede_bruto', v_total_rede_bruto,
            'rede_liquido', v_total_rede_liquido,
            'rede_taxas', v_total_rede_taxas
        )
    );
END;
$function$;

-- =========================================================================
-- 4. close_daily_snapshot: Bloqueio de fechamento de dias vazios e
--    persistência fiel de cartoes_a_compensar e filiais com revisão
-- =========================================================================
CREATE OR REPLACE FUNCTION public.close_daily_snapshot(p_date text, p_notes text DEFAULT 'Fechamento homologado via Central de Conciliação'::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_target_date date := COALESCE(p_date::date, CURRENT_DATE);
    v_summary jsonb;
    v_stores_count int;
    v_is_all_empty boolean := true;
    v_store jsonb;
    v_existing_rev int := 0;
BEGIN
    -- Forçar cálculo dinâmico para capturar todas as mutações e arquivos reais
    v_summary := public.get_daily_reconciliation_summary(v_target_date::text, true);

    v_stores_count := jsonb_array_length(COALESCE(v_summary->'stores', '[]'::jsonb));
    IF v_stores_count = 0 AND (COALESCE((v_summary->>'total_saldo_banco')::numeric, 0) > 0 OR COALESCE((v_summary->>'faturamento_periodo')::numeric, 0) > 0) THEN
        RAISE EXCEPTION 'SNAPSHOT_FECHAMENTO_BLOQUEADO: O detalhamento por filiais está zerado enquanto há movimentação consolidada. Operação abortada.';
    END IF;

    -- Verificar se todas as lojas estão completamente vazias de movimento bancário e operacional
    FOR v_store IN SELECT * FROM jsonb_array_elements(COALESCE(v_summary->'stores', '[]'::jsonb))
    LOOP
        IF NOT COALESCE((v_store->>'is_empty_store')::boolean, false) THEN
            v_is_all_empty := false;
            EXIT;
        END IF;
    END LOOP;

    IF v_is_all_empty 
       AND COALESCE((v_summary->>'faturamento_periodo')::numeric, 0) = 0 
       AND COALESCE((v_summary->>'total_saldo_banco')::numeric, 0) = 0 
       AND NOT COALESCE((p_metadata->>'is_marco_zero')::boolean, false) THEN
        RAISE EXCEPTION 'SNAPSHOT_FECHAMENTO_BLOQUEADO: Nenhuma movimentação bancária (OFX), cartões (Rede) ou contas foi registrada para esta data. Fechamento de dia vazio abortado.';
    END IF;

    SELECT COALESCE((metadata->>'revision')::int, 0) INTO v_existing_rev
    FROM public.daily_snapshots
    WHERE date = v_target_date;

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
            'revision', v_existing_rev + 1,
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
$function$;
