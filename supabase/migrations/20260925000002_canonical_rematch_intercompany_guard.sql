-- =========================================================================
-- MIGRATION: 20260925000002_canonical_rematch_intercompany_guard.sql
-- SPEC: 438 — Canonical Rematch, Intercompany Guard & Resumo por Filial
-- =========================================================================

-- 1. SANEAMENTO AUDITADO DE 24/09/2026
DO $$
BEGIN
    -- 1A. Desvincular transferências intercompany de OSs no dia 24/09/2026
    UPDATE public.ofx_transactions
    SET matched_os_number = NULL,
        manual_category = 'Transferência Entre Lojas [Apenas Conciliar]',
        manual_justification = 'Transferência Intercompany (Não-OS)',
        match_status = 'intercompany_paired',
        contabilizar_no_subtotal = false,
        updated_at = now()
    WHERE target_date = '2026-09-24'
      AND type = 'in'
      AND (
          counterpart_name ILIKE '%MP AUTO MECANICA%'
          OR counterpart_name ILIKE '%MP JABAQUARA%'
          OR counterpart_name ILIKE '%HD CENTRO AUTOMOTIVO%'
          OR counterpart_name ILIKE '%REI DO MODULO%'
          OR cnpj_cpf IN ('29.954.349/0001-44', '63.102.080/0001-06', '50.903.911/0001-05', '50.901.642/0001-30')
          OR abs(amount) IN (1510.00, 1000.00, 5000.00)
      );

    -- 1B. Remover do conciliation_matches os vínculos automáticos desfeitos de 24/09
    DELETE FROM public.conciliation_matches
    WHERE target_date = '2026-09-24'
      AND system_os_number IN ('619', '1894', '2439');
END $$;


-- 2. RECRIAÇÃO DE auto_match_receivables COM PROTEÇÃO INTERCOMPANY E FILIAL
CREATE OR REPLACE FUNCTION public.auto_match_receivables(
    p_date text DEFAULT NULL,
    p_store_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_matched_count integer := 0;
    v_matched_amount numeric(15,2) := 0.00;
    r_ofx record;
    r_rec record;
    v_details jsonb := '[]'::jsonb;
BEGIN
    -- Itera sobre transações de entrada do extrato OFX não conciliadas
    -- FILTRO NEGATIVO: Ignora adquirentes e transferências intercompany
    FOR r_ofx IN 
        SELECT id, store_id, target_date, amount, counterpart_name, fitid, cnpj_cpf
        FROM public.ofx_transactions
        WHERE type = 'in'
          AND (p_store_id IS NULL OR store_id = p_store_id)
          AND (p_date IS NULL OR target_date = p_date::date)
          AND matched_os_number IS NULL
          AND (manual_category IS NULL OR manual_category NOT IN ('TRANSFERÊNCIA', 'Transferência Entre Lojas [Apenas Conciliar]', 'EMPRÉSTIMO', 'RENDIMENTOS', 'OUTROS'))
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
              OR COALESCE(counterpart_name, '') ILIKE '%HD CENTRO AUTOMOTIVO%'
              OR COALESCE(counterpart_name, '') ILIKE '%REI DO MODULO%'
          )
        ORDER BY target_date ASC, amount DESC
    LOOP
        -- Busca um título em receivables que case por valor e loja
        SELECT id, os_number, installment, type, value, due_date, description
        INTO r_rec
        FROM public.receivables
        WHERE store_id = r_ofx.store_id
          AND status = 'pendente'
          AND (
            -- Match 1: Valor exato
            ROUND(value, 2) = ROUND(ABS(r_ofx.amount), 2)
            -- Match 2: Tolerância de tarifa bancária de boleto (até R$ 5,00)
            OR (type = 'Boleto' AND ROUND(ABS(r_ofx.amount), 2) BETWEEN (ROUND(value, 2) - 5.00) AND ROUND(value, 2))
          )
          AND (
            -- Janela de data: até 5 dias antes do vencimento ou até 30 dias após
            r_ofx.target_date BETWEEN (due_date - INTERVAL '5 days')::date AND (due_date + INTERVAL '30 days')::date
            -- Ou se o número da OS estiver explícito no descritivo do banco
            OR (os_number IS NOT NULL AND length(os_number) >= 3 AND COALESCE(r_ofx.counterpart_name, '') ILIKE '%' || os_number || '%')
          )
        ORDER BY 
          -- Prioriza quem tem número de OS no descritivo, depois menor diferença de data
          (CASE WHEN os_number IS NOT NULL AND length(os_number) >= 3 AND COALESCE(r_ofx.counterpart_name, '') ILIKE '%' || os_number || '%' THEN 0 ELSE 1 END),
          ABS(r_ofx.target_date - due_date) ASC
        LIMIT 1;

        IF FOUND THEN
            -- Atualiza o recebível dando baixa
            UPDATE public.receivables
            SET status = 'recebido',
                received_at = r_ofx.target_date::timestamptz,
                matched_ofx_id = r_ofx.id,
                paid_value = ABS(r_ofx.amount),
                discount_value = GREATEST(0, r_rec.value - ABS(r_ofx.amount)),
                updated_at = NOW()
            WHERE id = r_rec.id;

            -- Atualiza a transação OFX vinculando a OS
            UPDATE public.ofx_transactions
            SET matched_os_number = r_rec.os_number,
                manual_category = COALESCE(manual_category, 'Recebível ' || r_rec.type)
            WHERE id = r_ofx.id;

            v_matched_count := v_matched_count + 1;
            v_matched_amount := v_matched_amount + ABS(r_ofx.amount);

            v_details := v_details || jsonb_build_object(
                'ofx_id', r_ofx.id,
                'receivable_id', r_rec.id,
                'os_number', r_rec.os_number,
                'installment', r_rec.installment,
                'store_id', r_ofx.store_id,
                'amount', ABS(r_ofx.amount),
                'type', r_rec.type,
                'target_date', r_ofx.target_date
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'matched_count', v_matched_count,
        'matched_amount', v_matched_amount,
        'details', v_details
    );
END;
$$;


-- 3. RECRIAÇÃO DE auto_match_daily_transactions COM PIX ESTRITO E REORDENAÇÃO CANÔNICA
CREATE OR REPLACE FUNCTION public.auto_match_daily_transactions(p_date text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
    -- FASE 1: REDE x OS (NA MESMA FILIAL)
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
            SELECT * INTO v_os_record
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
        END IF;

        IF v_os_record.id IS NOT NULL THEN
            UPDATE public.pos_transactions
            SET matched_os_number = v_os_record.os_number,
                settlement_status = COALESCE(settlement_status, 'entrou')
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
        -- CRÍTICO: Não casa por total_value, não casa se pix_transfer_value <= 0
        IF v_os_record.id IS NULL AND v_ofx_record.store_id IS NOT NULL THEN
            SELECT * INTO v_os_record
            FROM public.patio_os
            WHERE store_id = v_ofx_record.store_id
              AND COALESCE(pix_transfer_value, 0) > 0
              AND ABS(COALESCE(pix_transfer_value, 0) - v_ofx_record.amount) <= 0.05
              AND client_name IS NOT NULL
              AND (
                  -- Match por documento (CPF/CNPJ limpo)
                  (
                      LENGTH(REGEXP_REPLACE(COALESCE(v_ofx_record.cnpj_cpf, ''), '\\D', '', 'g')) >= 11
                      AND REGEXP_REPLACE(COALESCE(v_ofx_record.cnpj_cpf, ''), '\\D', '', 'g') = REGEXP_REPLACE(COALESCE(client_name, ''), '\\D', '', 'g')
                  )
                  -- Ou match por nome forte (mínimo 4 caracteres úteis)
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
$$;


-- 4. RECRIAÇÃO DE get_daily_reconciliation_summary COM CONTRATO DE CÁLCULO ESTRITO EM CENTAVOS
CREATE OR REPLACE FUNCTION public.get_daily_reconciliation_summary(
    p_date text,
    p_force_dynamic boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
            END as dif_saidas_raw
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
        'status_banco', CASE WHEN cs.saldo_banco >= 0 THEN 'credor' ELSE 'devedor' END,
        'pix', cs.pix,
        'na_loja_os', cs.na_loja_os,
        'entradas_realizadas', cs.entradas_previsto, -- O que entrou no banco
        'entradas_previsto', (cs.entradas_conciliadas + LEAST(GREATEST(0, cs.entradas_previsto - cs.entradas_conciliadas), cs.dif_entradas_raw)),
        -- Normalização estrita de zeros para evitar resíduos flutuantes e troca indevida de sinal
        'dif_entradas', CASE WHEN ABS(cs.dif_entradas_raw) <= 0.05 THEN 0.00 ELSE cs.dif_entradas_raw END,
        'diferenca_entradas', CASE WHEN ABS(cs.dif_entradas_raw) <= 0.05 THEN 0.00 ELSE cs.dif_entradas_raw END,
        'saidas_ofx', cs.saidas_ofx,
        'contas_loja', cs.contas_loja,
        'dif_saidas', CASE WHEN ABS(cs.dif_saidas_raw) <= 0.05 THEN 0.00 ELSE cs.dif_saidas_raw END,
        'diferenca_saidas', CASE WHEN ABS(cs.dif_saidas_raw) <= 0.05 THEN 0.00 ELSE cs.dif_saidas_raw END,
        'diferenca', ROUND((CASE WHEN ABS(cs.dif_entradas_raw) <= 0.05 THEN 0.00 ELSE cs.dif_entradas_raw END) - 
                           (CASE WHEN ABS(cs.dif_saidas_raw) <= 0.05 THEN 0.00 ELSE cs.dif_saidas_raw END), 2),
        'status', CASE 
            WHEN ABS(cs.dif_entradas_raw) <= 0.05 AND ABS(cs.dif_saidas_raw) <= 0.05 THEN 'approved'
            ELSE 'divergence'
        END
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

    -- 3. Cartões a Compensar
    SELECT 
        COALESCE(SUM(net_amount), 0),
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
$$;
