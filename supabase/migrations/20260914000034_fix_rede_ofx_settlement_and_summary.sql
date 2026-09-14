-- ============================================================================
-- Migration: 20260914000034_fix_rede_ofx_settlement_and_summary.sql
-- Description:
-- 1. Corrige get_daily_reconciliation_summary: v_cartoes_a_compensar deve somar
--    APENAS pos_transactions com settlement_status IN ('nao_entrou', 'a_compensar').
--    Vendas já creditadas no banco (status = 'entrou') NÃO entram em a compensar,
--    eliminando duplicação e saldo inflado.
-- 2. No detalhamento de lojas (rede_agg), calcula nao_entrou_valor e status_compensacao
--    reais por loja.
-- 3. Corrige auto_match_daily_transactions: casar uma venda da Rede com a OS do
--    cliente NÃO altera settlement_status para 'entrou' (quem dita a liquidação
--    bancária é o extrato OFX).
-- ============================================================================

-- =========================================================================
-- PARTE 1: CORREÇÃO DE auto_match_daily_transactions
-- =========================================================================
CREATE OR REPLACE FUNCTION public.auto_match_daily_transactions(p_date text)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
BEGIN
    IF p_date IS NULL THEN
        RAISE EXCEPTION 'p_date não pode ser nulo';
    END IF;

    v_target_date := p_date::date;

    -- =========================================================================
    -- FASE 0: AUTO-TAGGING E ROTEAMENTO DE TRANSAÇÕES CORPORATIVAS / NÃO-OS
    -- =========================================================================
    -- 0A. Empréstimos e Capital de Giro
    UPDATE public.ofx_transactions
    SET manual_category = 'EMPRÉSTIMO',
        manual_justification = 'Empréstimo Capital de Giro (Corporativo / Não-OS)',
        updated_at = now()
    WHERE target_date = v_target_date
      AND type = 'in'
      AND matched_os_number IS NULL
      AND (
          COALESCE(counterpart_name, '') ILIKE '%EMPREST%'
          OR COALESCE(counterpart_name, '') ILIKE '%CAPITAL DE GIRO%'
          OR COALESCE(bank_name, '') ILIKE '%EMPREST%'
          OR COALESCE(fitid, '') ILIKE '%EMPREST%'
      );

    -- 0B. Seguros e Sinistros
    UPDATE public.ofx_transactions
    SET manual_category = 'OUTROS',
        manual_justification = 'Recebimento de Seguros / Sinistro (Não-OS)',
        updated_at = now()
    WHERE target_date = v_target_date
      AND type = 'in'
      AND matched_os_number IS NULL
      AND (
          COALESCE(counterpart_name, '') ILIKE '%SEGURO%'
          OR COALESCE(counterpart_name, '') ILIKE '%ITAU SEGUROS%'
          OR COALESCE(counterpart_name, '') ILIKE '%PORTO SEGURO%'
          OR COALESCE(bank_name, '') ILIKE '%SEGUROS%'
      );

    -- 0C. Transferências entre Lojas e Holding
    UPDATE public.ofx_transactions
    SET manual_category = 'TRANSFERÊNCIA',
        manual_justification = 'Transferência entre Lojas / Holding (Não-OS)',
        updated_at = now()
    WHERE target_date = v_target_date
      AND type = 'in'
      AND matched_os_number IS NULL
      AND (
          COALESCE(counterpart_name, '') ILIKE '%EMPORIO DO OLEO%'
          OR COALESCE(counterpart_name, '') ILIKE '%HOLDING%'
          OR COALESCE(counterpart_name, '') ILIKE '%TRANSFERENCIA ENTRE%'
      );

    -- 0D. Rendimentos e Resgates Automáticos
    UPDATE public.ofx_transactions
    SET manual_category = 'RENDIMENTOS',
        manual_justification = 'Aplicação / Resgate Automático',
        updated_at = now()
    WHERE target_date = v_target_date
      AND type = 'in'
      AND matched_os_number IS NULL
      AND (
          COALESCE(counterpart_name, '') ILIKE '%REND%'
          OR COALESCE(counterpart_name, '') ILIKE '%APLIC%'
          OR COALESCE(counterpart_name, '') ILIKE '%RESG%'
      );

    SELECT count(*) INTO v_corporate_tagged
    FROM public.ofx_transactions
    WHERE target_date = v_target_date
      AND type = 'in'
      AND manual_category IN ('EMPRÉSTIMO', 'OUTROS', 'TRANSFERÊNCIA', 'RENDIMENTOS');

    -- =========================================================================
    -- FASE 1: PAREAMENTO DETERMINÍSTICO DE POS (REDE) x PATIO_OS DA MESMA FILIAL
    -- =========================================================================
    FOR v_pos_record IN 
        SELECT id, store_id, net_amount, gross_amount, payment_method, machine_name, target_date, occurred_at
        FROM public.pos_transactions
        WHERE target_date = v_target_date
          AND matched_os_number IS NULL
          AND store_id IS NOT NULL
        ORDER BY net_amount DESC
    LOOP
        v_os_record := NULL;

        -- 1A. Procura OS em aberto ou parcial na mesma filial cujo valor bate com o líquido ou bruto
        SELECT count(*) INTO v_count_candidates
        FROM public.patio_os
        WHERE store_id = v_pos_record.store_id
          AND (status ILIKE '%aberto%' OR status ILIKE '%parcial%' OR status ILIKE '%pendente%' OR status = 'ABERTA' OR status = 'PENDENTE')
          AND (
              ABS(COALESCE(credit_value, 0) - v_pos_record.net_amount) <= 0.05
              OR ABS(COALESCE(debit_value, 0) - v_pos_record.net_amount) <= 0.05
              OR ABS(COALESCE(credit_debit_value, 0) - v_pos_record.net_amount) <= 0.05
              OR ABS((total_value - paid_value) - v_pos_record.net_amount) <= 0.05
              OR ABS(total_value - v_pos_record.gross_amount) <= 0.05
              OR ABS(total_value - v_pos_record.net_amount) <= 0.05
          );

        IF v_count_candidates = 1 THEN
            SELECT *
            INTO v_os_record
            FROM public.patio_os
            WHERE store_id = v_pos_record.store_id
              AND (status ILIKE '%aberto%' OR status ILIKE '%parcial%' OR status ILIKE '%pendente%' OR status = 'ABERTA' OR status = 'PENDENTE')
              AND (
                  ABS(COALESCE(credit_value, 0) - v_pos_record.net_amount) <= 0.05
                  OR ABS(COALESCE(debit_value, 0) - v_pos_record.net_amount) <= 0.05
                  OR ABS(COALESCE(credit_debit_value, 0) - v_pos_record.net_amount) <= 0.05
                  OR ABS((total_value - paid_value) - v_pos_record.net_amount) <= 0.05
                  OR ABS(total_value - v_pos_record.gross_amount) <= 0.05
                  OR ABS(total_value - v_pos_record.net_amount) <= 0.05
              )
            LIMIT 1;
        ELSIF v_count_candidates > 1 THEN
            v_collision_count := v_collision_count + 1;
            v_os_record := NULL;
        END IF;

        -- 1B. Se não achou em aberto único, busca em OSs com credit_value ou debit_value batendo na mesma filial
        IF v_os_record.id IS NULL AND v_count_candidates = 0 THEN
            SELECT count(*) INTO v_count_candidates
            FROM public.patio_os
            WHERE store_id = v_pos_record.store_id
              AND (
                  ABS(COALESCE(credit_value, 0) - v_pos_record.gross_amount) <= 0.05
                  OR ABS(COALESCE(debit_value, 0) - v_pos_record.gross_amount) <= 0.05
                  OR ABS(COALESCE(credit_debit_value, 0) - v_pos_record.gross_amount) <= 0.05
                  OR ABS(COALESCE(credit_value, 0) - v_pos_record.net_amount) <= 0.05
                  OR ABS(COALESCE(debit_value, 0) - v_pos_record.net_amount) <= 0.05
                  OR ABS(total_value - v_pos_record.gross_amount) <= 0.05
                  OR ABS(total_value - v_pos_record.net_amount) <= 0.05
              );

            IF v_count_candidates = 1 THEN
                SELECT *
                INTO v_os_record
                FROM public.patio_os
                WHERE store_id = v_pos_record.store_id
                  AND (
                      ABS(COALESCE(credit_value, 0) - v_pos_record.gross_amount) <= 0.05
                      OR ABS(COALESCE(debit_value, 0) - v_pos_record.gross_amount) <= 0.05
                      OR ABS(COALESCE(credit_debit_value, 0) - v_pos_record.gross_amount) <= 0.05
                      OR ABS(COALESCE(credit_value, 0) - v_pos_record.net_amount) <= 0.05
                      OR ABS(COALESCE(debit_value, 0) - v_pos_record.net_amount) <= 0.05
                      OR ABS(total_value - v_pos_record.gross_amount) <= 0.05
                      OR ABS(total_value - v_pos_record.net_amount) <= 0.05
                  )
                LIMIT 1;
            ELSIF v_count_candidates > 1 THEN
                v_collision_count := v_collision_count + 1;
                v_os_record := NULL;
            END IF;
        END IF;

        IF v_os_record.id IS NOT NULL THEN
            -- NOTA: settlement_status NÃO é alterado aqui. Ele pertence ao reconciliador bancário!
            UPDATE public.pos_transactions
            SET matched_os_number = v_os_record.os_number
            WHERE id = v_pos_record.id;

            IF v_os_record.status NOT ILIKE '%finalizad%' AND v_os_record.status NOT ILIKE '%pago%' THEN
                UPDATE public.patio_os
                SET paid_value = LEAST(total_value, paid_value + v_pos_record.net_amount),
                    status = CASE 
                        WHEN (paid_value + v_pos_record.net_amount) >= total_value - 0.05 THEN 'finalizada'
                        ELSE 'pago_parcial'
                    END,
                    match_status = 'MATCHED',
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
            EXCEPTION WHEN unique_violation THEN
                -- Já vinculado anteriormente
            END;

            v_pos_matched := v_pos_matched + 1;
        END IF;
    END LOOP;

    -- =========================================================================
    -- FASE 2: PAREAMENTO DE PIX / RECEBIMENTOS OFX x PATIO_OS
    -- =========================================================================
    FOR v_ofx_record IN 
        SELECT id, store_id, amount, counterpart_name, bank_name, target_date, occurred_at
        FROM public.ofx_transactions
        WHERE target_date = v_target_date
          AND type = 'in'
          AND matched_os_number IS NULL
          AND manual_category IS NULL
          AND store_id IS NOT NULL
        ORDER BY amount DESC
    LOOP
        v_os_record := NULL;

        -- 2A. Procura OS em aberto na mesma filial com saldo residual batendo com PIX
        SELECT count(*) INTO v_count_candidates
        FROM public.patio_os
        WHERE store_id = v_ofx_record.store_id
          AND (status ILIKE '%aberto%' OR status ILIKE '%parcial%' OR status ILIKE '%pendente%' OR status = 'ABERTA' OR status = 'PENDENTE')
          AND (
              ABS((total_value - paid_value) - v_ofx_record.amount) <= 0.05
              OR ABS(total_value - v_ofx_record.amount) <= 0.05
              OR ABS(COALESCE(pix_value, 0) - v_ofx_record.amount) <= 0.05
          );

        IF v_count_candidates = 1 THEN
            SELECT *
            INTO v_os_record
            FROM public.patio_os
            WHERE store_id = v_ofx_record.store_id
              AND (status ILIKE '%aberto%' OR status ILIKE '%parcial%' OR status ILIKE '%pendente%' OR status = 'ABERTA' OR status = 'PENDENTE')
              AND (
                  ABS((total_value - paid_value) - v_ofx_record.amount) <= 0.05
                  OR ABS(total_value - v_ofx_record.amount) <= 0.05
                  OR ABS(COALESCE(pix_value, 0) - v_ofx_record.amount) <= 0.05
              )
            LIMIT 1;
        ELSIF v_count_candidates > 1 THEN
            v_collision_count := v_collision_count + 1;
            v_os_record := NULL;
        END IF;

        IF v_os_record.id IS NOT NULL THEN
            UPDATE public.ofx_transactions
            SET matched_os_number = v_os_record.os_number,
                manual_category = 'PIX / Recebimento OS',
                manual_justification = 'Pareado automaticamente com OS ' || v_os_record.os_number,
                updated_at = now()
            WHERE id = v_ofx_record.id;

            IF v_os_record.status NOT ILIKE '%finalizad%' AND v_os_record.status NOT ILIKE '%pago%' THEN
                UPDATE public.patio_os
                SET paid_value = LEAST(total_value, paid_value + v_ofx_record.amount),
                    status = CASE 
                        WHEN (paid_value + v_ofx_record.amount) >= total_value - 0.05 THEN 'finalizada'
                        ELSE 'pago_parcial'
                    END,
                    match_status = 'MATCHED',
                    updated_at = now()
                WHERE id = v_os_record.id;
            END IF;

            BEGIN
                INSERT INTO public.conciliation_matches (
                    store_id, system_os_number, bank_transaction_id, status, target_date
                ) VALUES (
                    v_ofx_record.store_id,
                    v_os_record.os_number,
                    v_ofx_record.id,
                    'matched',
                    v_target_date
                );
            EXCEPTION WHEN unique_violation THEN
                -- Já vinculado
            END;

            v_pix_matched := v_pix_matched + 1;
        END IF;
    END LOOP;

    -- =========================================================================
    -- FASE 3: BATIMENTO DETERMINÍSTICO DE SAÍDAS OFX x CONTAS A PAGAR (ESTRITO)
    -- =========================================================================
    BEGIN
        SELECT public.auto_match_saidas(p_date) INTO v_saidas_result;
    EXCEPTION WHEN OTHERS THEN
        v_saidas_result := jsonb_build_object('success', false, 'error', SQLERRM);
    END;

    RETURN jsonb_build_object(
        'success', true,
        'target_date', v_target_date,
        'matched_pos_count', v_pos_matched,
        'matched_pix_count', v_pix_matched,
        'corporate_tagged_count', v_corporate_tagged,
        'collisions_detected', v_collision_count,
        'saidas_result', v_saidas_result
    );
END;
$$;


-- =========================================================================
-- PARTE 2: CORREÇÃO DE get_daily_reconciliation_summary
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
    
    IF FOUND THEN
        v_caixa_anterior := COALESCE(v_prev_snapshot.caixa_atual, 0);
        v_faturamento_anterior := COALESCE(v_prev_snapshot.faturamento, 0);
        v_na_loja_os_anterior := COALESCE(v_prev_snapshot.total_patio, 0);
    ELSE
        v_caixa_anterior := 0;
        v_faturamento_anterior := 0;
        v_na_loja_os_anterior := 0;
    END IF;

    -- =========================================================================
    -- DETALHAMENTO POR LOJA (SPLIT DUAL)
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
            -- Apenas o que NÃO entrou no banco conta como a compensar / pendente
            COALESCE(SUM(CASE WHEN settlement_status IN ('nao_entrou', 'a_compensar') THEN net_amount ELSE 0 END), 0) as nao_entrou_valor,
            COALESCE(SUM(CASE WHEN transaction_type = 'devolucao' THEN gross_amount ELSE 0 END), 0) as rede_devolucoes
        FROM pos_transactions
        WHERE COALESCE(target_date, occurred_at::date) = v_target_date::date
        GROUP BY TRIM(store_id::text)
    ),
    ofx_entradas_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(amount), 0) as ofx_entradas_total,
            COALESCE(SUM(CASE WHEN manual_category ILIKE '%REDE%' OR counterpart_name ILIKE '%REDE%' OR counterpart_name ILIKE '%CARD%' THEN amount ELSE 0 END), 0) as ofx_maquininhas,
            COALESCE(SUM(CASE WHEN matched_os_number IS NOT NULL OR manual_category = 'PIX / Recebimento OS' THEN amount ELSE 0 END), 0) as pix_total,
            COALESCE(SUM(CASE WHEN manual_category NOT IN ('PIX / Recebimento OS', 'REDE') AND manual_category IS NOT NULL THEN amount ELSE 0 END), 0) as entradas_justificadas,
            COALESCE(SUM(CASE WHEN matched_os_number IS NULL AND manual_category IS NULL THEN amount ELSE 0 END), 0) as entradas_orfas
        FROM ofx_transactions
        WHERE target_date = v_target_date::date AND type = 'in'
        GROUP BY TRIM(store_id::text)
    ),
    ofx_saidas_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(amount), 0) as ofx_saidas_total,
            COALESCE(SUM(CASE WHEN matched_bill_id IS NOT NULL OR manual_category IS NOT NULL THEN amount ELSE 0 END), 0) as saidas_justificadas,
            COALESCE(SUM(CASE WHEN matched_bill_id IS NULL AND manual_category IS NULL THEN amount ELSE 0 END), 0) as saidas_orfas
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
        WHERE entry_date = v_target_date::date
        GROUP BY TRIM(store_id::text)
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'store_id', s.id,
        'store_name', s.name,
        'saldo_banco', COALESCE(rt.bank_total, rl.bank_total, 0),
        'saldo_banco_ofx', COALESCE(rt.bank_total, rl.bank_total, 0),
        'maquininha', COALESCE(rd.rede_liquido, 0),
        'rede_bruto', COALESCE(rd.rede_bruto, 0),
        'rede_liquido', COALESCE(rd.rede_liquido, 0),
        'nao_entrou_valor', COALESCE(rd.nao_entrou_valor, 0),
        'cartao_nao_entrou', COALESCE(rd.nao_entrou_valor, 0),
        'status_compensacao', CASE WHEN COALESCE(rd.nao_entrou_valor, 0) <= 0.05 THEN 'entrou' ELSE 'nao_entrou' END,
        'devolucoes_rede', COALESCE(rd.rede_devolucoes, 0),
        'dinheiro_loja', COALESCE(v.vault_total, 0),
        'pix', COALESCE(oe.pix_total, 0),
        'pix_total', COALESCE(oe.pix_total, 0),
        'ofx_entradas_total', COALESCE(oe.ofx_entradas_total, 0),
        'ofx_maquininhas', COALESCE(oe.ofx_maquininhas, 0),
        'entradas_justificadas', COALESCE(oe.entradas_justificadas, 0),
        'entradas_orfas', COALESCE(oe.entradas_orfas, 0),
        'entradas_conciliadas', (COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0) + COALESCE(oe.entradas_justificadas, 0)),
        'dif_entradas', (COALESCE(oe.ofx_entradas_total, 0) - (COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0) + COALESCE(oe.entradas_justificadas, 0))),
        'ofx_saidas_total', COALESCE(sofx.ofx_saidas_total, 0),
        'saidas_justificadas', COALESCE(sofx.saidas_justificadas, 0),
        'saidas_orfas', COALESCE(sofx.saidas_orfas, 0),
        'contas_loja_total', COALESCE(bst.contas_loja_total, 0),
        'contas_conciliadas', (COALESCE(bst.contas_loja_total, 0) + COALESCE(sofx.saidas_justificadas, 0)),
        'dif_saidas', (COALESCE(sofx.ofx_saidas_total, 0) - (COALESCE(bst.contas_loja_total, 0) + COALESCE(sofx.saidas_justificadas, 0))),
        'na_loja_os', COALESCE(rt.na_loja_os, p.patio_total, rl.na_loja_os, 0),
        'patio_os', COALESCE(rt.na_loja_os, p.patio_total, rl.na_loja_os, 0),
        'diferenca_total', (COALESCE(oe.ofx_entradas_total, 0) - (COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0) + COALESCE(oe.entradas_justificadas, 0))) - (COALESCE(sofx.ofx_saidas_total, 0) - (COALESCE(bst.contas_loja_total, 0) + COALESCE(sofx.saidas_justificadas, 0))),
        'diferenca', (COALESCE(oe.ofx_entradas_total, 0) - (COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0) + COALESCE(oe.entradas_justificadas, 0))) - (COALESCE(sofx.ofx_saidas_total, 0) - (COALESCE(bst.contas_loja_total, 0) + COALESCE(sofx.saidas_justificadas, 0))),
        'status', CASE 
            WHEN ABS((COALESCE(oe.ofx_entradas_total, 0) - (COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0) + COALESCE(oe.entradas_justificadas, 0))) - (COALESCE(sofx.ofx_saidas_total, 0) - (COALESCE(bst.contas_loja_total, 0) + COALESCE(sofx.saidas_justificadas, 0)))) <= 0.05 THEN 'approved' 
            ELSE 'divergence' 
        END
    )), '[]'::jsonb) INTO v_stores_detail
    FROM stores_list s
    LEFT JOIN rede_agg rd ON rd.store_id = s.id
    LEFT JOIN ofx_entradas_agg oe ON oe.store_id = s.id
    LEFT JOIN ofx_saidas_agg sofx ON sofx.store_id = s.id
    LEFT JOIN bills_store_agg bst ON bst.store_id = s.id
    LEFT JOIN recon_today rt ON rt.store_id = s.id
    LEFT JOIN recon_latest rl ON rl.store_id = s.id
    LEFT JOIN patio_agg p ON p.store_id = s.id
    LEFT JOIN vault_agg v ON v.store_id = s.id;

    -- Avalia se há lojas divergentes
    SELECT EXISTS(
        SELECT 1 FROM jsonb_array_elements(v_stores_detail) elem 
        WHERE elem->>'status' = 'divergence'
    ) INTO v_has_divergent_stores;

    -- =========================================================================
    -- APURAÇÃO DOS 5 PILARES E ARQUITETURA BICANAL
    -- =========================================================================
    -- 1. Saldos Bancários
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

    -- 2. Dinheiro em Lojas e Maquininhas (Apenas o que NÃO ENTROU no banco)
    SELECT COALESCE(SUM(amount), 0) INTO v_dinheiro_lojas
    FROM store_cash_vault
    WHERE entry_date = v_target_date::date;

    SELECT 
        COALESCE(SUM(CASE WHEN settlement_status IN ('nao_entrou', 'a_compensar') THEN net_amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN transaction_type = 'devolucao' THEN gross_amount ELSE 0 END), 0)
    INTO v_cartoes_a_compensar, v_devolucoes_rede
    FROM pos_transactions
    WHERE COALESCE(target_date, occurred_at::date) = v_target_date::date;

    v_total_saldo_banco_positivo := v_saldo_bancos_positivo + v_dinheiro_lojas + v_cartoes_a_compensar - v_devolucoes_rede;
    v_total_saldo_banco := v_saldo_bancos;

    -- 3. Ativos Operacionais (Dinheiro MP e A Receber - Carry-over seguro)
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

    -- CANAL 1: TESOURARIA LÍQUIDA REAL (Sem WIP Pátio)
    v_caixa_tesouraria := (v_saldo_bancos_positivo + v_dinheiro_lojas + v_dinheiro_mp) - v_saldo_negativo_itau;
    v_status_tesouraria := CASE WHEN v_caixa_tesouraria >= 0 THEN 'equilibrado' ELSE 'descoberto' END;

    -- CANAL 2: PRODUÇÃO WIP & NEUTRALIZAÇÃO TEMPORAL (ΔP4)
    v_patio_wip := v_na_loja_os;
    v_variacao_patio_delta_p4 := v_na_loja_os - v_na_loja_os_anterior;

    -- Caixa Atual Consolidado (5 Pilares Canônicos)
    IF v_snapshot_found AND v_snapshot.is_closed AND NOT p_force_dynamic THEN
        v_caixa_atual := v_snapshot.caixa_atual;
    ELSE
        v_caixa_atual := (v_total_saldo_banco_positivo + v_dinheiro_mp + v_a_receber + v_na_loja_os) - v_saldo_negativo_itau;
    END IF;

    v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;

    -- =========================================================================
    -- FATURAMENTO DRE COM RECEITAS EXTRAS
    -- =========================================================================
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', id,
            'title', title,
            'description', description,
            'amount', amount,
            'store_id', store_id
        )), '[]'::jsonb)
    INTO v_faturamento_ajustes, v_faturamento_itens
    FROM daily_revenue_adjustments
    WHERE date = v_target_date::date;

    IF v_snapshot_found AND v_snapshot.faturamento > 0 THEN
        IF (v_snapshot.metadata->>'faturamento_oi_base')::numeric > 0 THEN
            v_faturamento_oi_base := (v_snapshot.metadata->>'faturamento_oi_base')::numeric;
        ELSIF v_faturamento_anterior > 0 AND v_snapshot.faturamento >= v_faturamento_anterior THEN
            v_faturamento_oi_base := v_snapshot.faturamento - v_faturamento_anterior;
        ELSE
            v_faturamento_oi_base := v_snapshot.faturamento;
        END IF;
    ELSE
        SELECT COALESCE(SUM(gross_amount), 0) INTO v_faturamento_oi_base
        FROM pos_transactions
        WHERE COALESCE(target_date, occurred_at::date) = v_target_date::date;
    END IF;

    v_faturamento_periodo := v_faturamento_oi_base + v_faturamento_ajustes;
    v_valor_disp_contas := v_faturamento_periodo - v_fluxo_caixa;

    -- =========================================================================
    -- CONTAS A PAGAR (REATIVIDADE DE DAILY_MANUAL_BILLS)
    -- =========================================================================
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN category IN ('Pró-Labore', 'Distribuição Lucros', 'Extra') OR title ILIKE '%Pró-Labore%' OR title ILIKE '%Extra%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN category NOT IN ('Pró-Labore', 'Distribuição Lucros', 'Extra') AND title NOT ILIKE '%Pró-Labore%' AND title NOT ILIKE '%Extra%' THEN amount ELSE 0 END), 0),
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', id,
            'title', title,
            'description', description,
            'amount', amount,
            'store_id', store_id,
            'category', category,
            'is_paid', (payment_date IS NOT NULL OR match_status = 'matched' OR matched_ofx_id IS NOT NULL),
            'external_code', external_code,
            'contabilizar_no_subtotal', COALESCE(contabilizar_no_subtotal, true)
        )), '[]'::jsonb)
    INTO v_total_bills, v_contas_extras, v_contas_imported_bills, v_contas_itens
    FROM daily_manual_bills
    WHERE date = v_target_date::date AND COALESCE(contabilizar_no_subtotal, true) = true;

    IF v_total_bills > 0 THEN
        v_contas_base := v_contas_imported_bills;
        v_contas_manual := v_contas_base + v_contas_extras;
        v_juros_rede := COALESCE(v_snapshot.juros_rede, 0);
        IF v_snapshot_found AND (v_snapshot.metadata->>'has_contas_override')::boolean = true AND (v_snapshot.metadata->>'contas_manual_override')::numeric > 0 THEN
            v_contas_manual := (v_snapshot.metadata->>'contas_manual_override')::numeric;
        END IF;
        v_subtotal_contas := v_contas_manual + v_juros_rede;
    ELSIF v_snapshot_found AND (v_snapshot.metadata->>'subtotal_contas')::numeric > 0 THEN
        v_subtotal_contas := (v_snapshot.metadata->>'subtotal_contas')::numeric;
        v_contas_base := COALESCE((v_snapshot.metadata->>'contas_base')::numeric, v_subtotal_contas);
        v_contas_manual := v_subtotal_contas;
        v_juros_rede := COALESCE(v_snapshot.juros_rede, 0);
    ELSIF v_snapshot_found AND v_snapshot.contas_a_pagar > 0 THEN
        v_subtotal_contas := v_snapshot.contas_a_pagar;
        v_contas_base := v_snapshot.contas_a_pagar;
        v_contas_manual := v_snapshot.contas_a_pagar;
        v_juros_rede := COALESCE(v_snapshot.juros_rede, 0);
    ELSE
        v_contas_base := 0;
        v_contas_manual := 0;
        v_juros_rede := COALESCE(v_snapshot.juros_rede, 0);
        v_subtotal_contas := v_contas_manual + v_juros_rede;
    END IF;

    v_diferenca_final := v_valor_disp_contas - v_subtotal_contas;
    
    IF v_snapshot_found AND v_snapshot.is_closed AND NOT p_force_dynamic AND (v_snapshot.metadata->>'status_geral') IS NOT NULL THEN
        v_status_geral := (v_snapshot.metadata->>'status_geral');
    ELSE
        v_status_geral := CASE WHEN ABS(v_diferenca_final) <= 50.00 THEN 'approved' ELSE 'divergent' END;
    END IF;

    v_fast_path_eligible := (NOT v_has_divergent_stores) AND (ABS(v_diferenca_final) <= 50.00);

    RETURN jsonb_build_object(
        'date', v_target_date,
        'is_closed', COALESCE(v_snapshot.is_closed, false),
        'saldo_bancos_ofx', v_saldo_bancos,
        'saldo_bancos_positivo', v_saldo_bancos_positivo,
        'saldo_negativo_itau', v_saldo_negativo_itau,
        'dinheiro_lojas', v_dinheiro_lojas,
        'dinheiro_em_lojas', v_dinheiro_lojas,
        'cartoes_a_compensar', v_cartoes_a_compensar,
        'devolucoes_rede', v_devolucoes_rede,
        'total_saldo_banco_positivo', v_total_saldo_banco_positivo,
        'total_saldo_banco', v_total_saldo_banco,
        'dinheiro_mp', v_dinheiro_mp,
        'a_receber', v_a_receber,
        'a_receber_manual', v_a_receber,
        'na_loja_os', v_na_loja_os,
        'total_patio', v_na_loja_os,
        'caixa_atual', v_caixa_atual,
        'caixa_anterior', v_caixa_anterior,
        'fluxo_caixa', v_fluxo_caixa,
        'odometro_hoje', COALESCE((v_snapshot.metadata->>'odometro_hoje')::numeric, 0),
        'faturamento_oi_base', v_faturamento_oi_base,
        'faturamento_anterior', v_faturamento_anterior,
        'faturamento_ajustes', v_faturamento_ajustes,
        'faturamento_periodo', v_faturamento_periodo,
        'faturamento', v_faturamento_periodo,
        'valor_disp_contas', v_valor_disp_contas,
        'contas_base', v_contas_base,
        'contas_extras', v_contas_extras,
        'contas_manual', v_contas_manual,
        'contas_a_pagar', v_subtotal_contas,
        'juros_rede', v_juros_rede,
        'subtotal_contas', v_subtotal_contas,
        'v_subtotal_contas', v_subtotal_contas,
        'diferenca_final', v_diferenca_final,
        'status_geral', v_status_geral,
        'faturamento_itens', v_faturamento_itens,
        'contas_itens', v_contas_itens,
        'stores_detail', v_stores_detail,
        'stores', v_stores_detail,
        'caixa_tesouraria', v_caixa_tesouraria,
        'status_tesouraria', v_status_tesouraria,
        'patio_wip', v_patio_wip,
        'variacao_patio_delta_p4', v_variacao_patio_delta_p4,
        'fast_path_eligible', v_fast_path_eligible
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_match_daily_transactions(text) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.get_daily_reconciliation_summary(text, boolean) TO authenticated, service_role, anon;
