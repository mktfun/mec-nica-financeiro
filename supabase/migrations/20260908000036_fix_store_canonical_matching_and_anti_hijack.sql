-- ============================================================================
-- Migration: 20260908000036_fix_store_canonical_matching_and_anti_hijack.sql
-- Spec: 376 - Correção Canônica de Conciliado vs OFX por Filial e Desreversão de Lotes
-- Description:
-- 1. Descontaminação Anti-Hijack: Reverte falsos vínculos de adquirentes (REDE, CARD, etc.) com OS.
-- 2. Atualização em daily_manual_bills para classificar títulos de folha como retirada_socios.
-- 3. Atualização de public.auto_match_daily_transactions: Bloqueio de adquirentes na busca por PIX.
-- 4. Atualização de public.auto_match_saidas: Algoritmo Subset Sum combinatório (1 a 6 títulos) para SISPAG.
-- 5. Atualização canônica de public.get_daily_reconciliation_summary:
--    - saidas_conciliadas e dif_saidas baseadas estritamente em débitos com lastro/justificativa.
--    - pix_total e entradas_conciliadas excluindo adquirentes para eliminar contagem dupla.
-- ============================================================================

-- ============================================================================
-- PARTE 1: DESCONTAMINAÇÃO E SANEAMENTO DE DADOS
-- ============================================================================
-- 1A. Reverte créditos de maquininha/adquirente erroneamente associados a OS como PIX
UPDATE public.ofx_transactions
SET matched_os_number = NULL,
    manual_category = NULL,
    updated_at = now()
WHERE type = 'in'
  AND (
      COALESCE(counterpart_name, '') ILIKE '%REDE%' 
      OR COALESCE(counterpart_name, '') ILIKE '%CARD%' 
      OR COALESCE(counterpart_name, '') ILIKE '%CIELO%'
      OR COALESCE(counterpart_name, '') ILIKE '%STONE%'
      OR COALESCE(counterpart_name, '') ILIKE '%PAGSEGURO%'
      OR COALESCE(bank_name, '') ILIKE '%REDE%' 
      OR COALESCE(bank_name, '') ILIKE '%CARD%'
  )
  AND (matched_os_number IS NOT NULL OR manual_category = 'PIX / Recebimento OS');

-- 1B. Reclassifica títulos de folha de pagamento / salários em daily_manual_bills
UPDATE public.daily_manual_bills
SET category = 'retirada_socios',
    updated_at = now()
WHERE category = 'outros'
  AND (
      UPPER(COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(recipient_name, '')) ~* 'SALARIO|SALÁRIO|RESCISAO|RESCISÃO|FERIAS|FÉRIAS|PREMIO|PRÊMIO|VALE'
  );


-- ============================================================================
-- PARTE 2: ATUALIZAÇÃO DA RPC public.auto_match_saidas COM SUBSET SUM
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_match_saidas(p_date text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_date date;
    v_matched_count int := 0;
    v_sispag_batch_count int := 0;
    v_intercompany_count int := 0;
    v_unmatched_bills int := 0;
    v_orphan_outflows int := 0;
    bill_rec RECORD;
    ofx_rec RECORD;
    sispag_ofx RECORD;
    v_store_salary_sum numeric;
    v_primary_bill_id uuid;
    v_bills_in_batch int;
    v_matched_bill_ids uuid[];
BEGIN
    IF p_date IS NULL THEN
        RAISE EXCEPTION 'Data obrigatória para pareamento de saídas.';
    END IF;

    v_target_date := p_date::date;

    -- ========================================================================
    -- FASE 0: SANEAR VÍNCULOS ESPÚRIOS DE CROSS-STORE LEGADOS NA DATA
    -- ========================================================================
    UPDATE public.daily_manual_bills b
    SET matched_ofx_id = NULL,
        match_status = 'unmatched',
        updated_at = now()
    FROM public.ofx_transactions o
    WHERE b.matched_ofx_id = o.id
      AND b.date = v_target_date
      AND b.store_id IS NOT NULL 
      AND b.store_id != 'master'
      AND o.store_id IS NOT NULL 
      AND o.store_id != b.store_id;

    UPDATE public.ofx_transactions o
    SET matched_bill_id = NULL,
        match_status = NULL,
        updated_at = now()
    FROM public.daily_manual_bills b
    WHERE o.matched_bill_id = b.id
      AND (o.target_date = v_target_date OR o.occurred_at::date = v_target_date)
      AND b.store_id IS NOT NULL 
      AND b.store_id != 'master'
      AND o.store_id IS NOT NULL 
      AND o.store_id != b.store_id;

    -- ========================================================================
    -- FASE A: AUTO-CANCELAMENTO DE BLOQUEIO / DESBLOQUEIO PIX (Mesma Conta)
    -- ========================================================================
    UPDATE public.ofx_transactions o_deb
    SET manual_category = 'Estorno / Ajuste [Apenas Conciliar]',
        manual_justification = 'Bloqueio e Desbloqueio PIX simultâneo (Efeito Nulo)',
        match_status = 'auto_cancelled',
        contabilizar_no_subtotal = false,
        updated_at = now()
    FROM public.ofx_transactions o_cred
    WHERE (o_deb.target_date = v_target_date OR o_deb.occurred_at::date = v_target_date)
      AND (o_cred.target_date = v_target_date OR o_cred.occurred_at::date = v_target_date)
      AND o_deb.type = 'out'
      AND o_cred.type = 'in'
      AND o_deb.store_id = o_cred.store_id
      AND ABS(ABS(o_deb.amount) - o_cred.amount) < 0.05
      AND (UPPER(COALESCE(o_deb.counterpart_name, '') || ' ' || COALESCE(o_deb.bank_name, '')) ILIKE '%BLOQUEIO PIX%')
      AND (UPPER(COALESCE(o_cred.counterpart_name, '') || ' ' || COALESCE(o_cred.bank_name, '')) ILIKE '%DESBLOQUEIO PIX%')
      AND o_deb.match_status IS NULL
      AND o_cred.match_status IS NULL;

    -- ========================================================================
    -- FASE B: PAREAMENTO DETERMINÍSTICO INTERCOMPANY (Transferência entre Lojas)
    -- ========================================================================
    UPDATE public.ofx_transactions o_deb
    SET manual_category = 'Transferência Entre Lojas [Apenas Conciliar]',
        manual_justification = 'Transferência Intercompany Automática entre Filiais',
        match_status = 'intercompany_paired',
        contabilizar_no_subtotal = false,
        updated_at = now()
    FROM public.ofx_transactions o_cred
    WHERE (o_deb.target_date = v_target_date OR o_deb.occurred_at::date = v_target_date)
      AND (o_cred.target_date = v_target_date OR o_cred.occurred_at::date = v_target_date)
      AND o_deb.type = 'out'
      AND o_cred.type = 'in'
      AND o_deb.store_id IS NOT NULL
      AND o_cred.store_id IS NOT NULL
      AND o_deb.store_id != o_cred.store_id
      AND ABS(ABS(o_deb.amount) - o_cred.amount) < 0.05
      AND o_deb.match_status IS NULL
      AND o_cred.match_status IS NULL
      AND (
          UPPER(COALESCE(o_deb.counterpart_name, '') || ' ' || COALESCE(o_deb.bank_name, '')) ~* 'BRASICAR|EMPORIO|POPULAR|HD CENTRO|MHE|PRIME|MODULO|DOMPEDRO|JABAQUARA|DHJV'
          OR UPPER(COALESCE(o_cred.counterpart_name, '') || ' ' || COALESCE(o_cred.bank_name, '')) ~* 'BRASICAR|EMPORIO|POPULAR|HD CENTRO|MHE|PRIME|MODULO|DOMPEDRO|JABAQUARA|DHJV'
      );

    -- Atualiza contraparte de crédito intercompany
    UPDATE public.ofx_transactions o_cred
    SET manual_category = 'Transferência Entre Lojas [Apenas Conciliar]',
        manual_justification = 'Transferência Intercompany Recebida Automática',
        match_status = 'intercompany_paired',
        contabilizar_no_subtotal = false,
        updated_at = now()
    FROM public.ofx_transactions o_deb
    WHERE (o_deb.target_date = v_target_date OR o_deb.occurred_at::date = v_target_date)
      AND (o_cred.target_date = v_target_date OR o_cred.occurred_at::date = v_target_date)
      AND o_deb.type = 'out'
      AND o_cred.type = 'in'
      AND o_deb.store_id IS NOT NULL
      AND o_cred.store_id IS NOT NULL
      AND o_deb.store_id != o_cred.store_id
      AND ABS(ABS(o_deb.amount) - o_cred.amount) < 0.05
      AND o_deb.match_status = 'intercompany_paired'
      AND o_cred.match_status IS NULL;

    -- ========================================================================
    -- FASE C: BLINDAGEM DE SAQUES ATM EM DINHEIRO (Não casar com fornecedores)
    -- ========================================================================
    UPDATE public.ofx_transactions
    SET manual_category = 'Retirada de Sócios / Sangria / Saque em Dinheiro',
        contabilizar_no_subtotal = false,
        updated_at = now()
    WHERE (target_date = v_target_date OR occurred_at::date = v_target_date)
      AND type = 'out'
      AND matched_bill_id IS NULL
      AND manual_category IS NULL
      AND UPPER(COALESCE(counterpart_name, '') || ' ' || COALESCE(bank_name, '')) ~* 'SAQUE DIN|SAQUE ATM|CART00';

    -- ========================================================================
    -- FASE D: MOTOR 1-PARA-N DE LOTES SISPAG SALÁRIOS COM SUBSET SUM COMBINATÓRIO
    -- ========================================================================
    FOR sispag_ofx IN
        SELECT id, ABS(amount) as deb_amount, store_id
        FROM public.ofx_transactions
        WHERE (target_date = v_target_date OR occurred_at::date = v_target_date)
          AND type = 'out'
          AND matched_bill_id IS NULL
          AND (match_status IS NULL OR match_status = 'unmatched')
          AND UPPER(COALESCE(counterpart_name, '') || ' ' || COALESCE(bank_name, '')) ~* 'SISPAG|SALARIO'
        ORDER BY ABS(amount) DESC
    LOOP
        -- D1: Testa se todos os títulos de salário da filial em aberto batem exatamente com o débito
        SELECT COALESCE(SUM(amount), 0), COUNT(*)
        INTO v_store_salary_sum, v_bills_in_batch
        FROM public.daily_manual_bills
        WHERE date = v_target_date
          AND matched_ofx_id IS NULL
          AND store_id = sispag_ofx.store_id
          AND (
              category = 'retirada_socios'
              OR UPPER(COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(recipient_name, '')) ~* 'SALARIO|SALÁRIO|RESCISAO|FERIAS|FÉRIAS|PREMIO|VALE'
          );

        IF v_bills_in_batch > 0 AND ABS(v_store_salary_sum - sispag_ofx.deb_amount) <= 0.10 THEN
            SELECT id INTO v_primary_bill_id
            FROM public.daily_manual_bills
            WHERE date = v_target_date
              AND matched_ofx_id IS NULL
              AND store_id = sispag_ofx.store_id
              AND (
                  category = 'retirada_socios'
                  OR UPPER(COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(recipient_name, '')) ~* 'SALARIO|SALÁRIO|RESCISAO|FERIAS|FÉRIAS|PREMIO|VALE'
              )
            LIMIT 1;

            UPDATE public.daily_manual_bills
            SET matched_ofx_id = sispag_ofx.id,
                match_status = CASE WHEN v_bills_in_batch = 1 THEN 'matched' ELSE 'matched_batch' END,
                updated_at = now()
            WHERE date = v_target_date
              AND matched_ofx_id IS NULL
              AND store_id = sispag_ofx.store_id
              AND (
                  category = 'retirada_socios'
                  OR UPPER(COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(recipient_name, '')) ~* 'SALARIO|SALÁRIO|RESCISAO|FERIAS|FÉRIAS|PREMIO|VALE'
              );

            UPDATE public.ofx_transactions
            SET matched_bill_id = v_primary_bill_id,
                match_status = CASE WHEN v_bills_in_batch = 1 THEN 'matched' ELSE 'matched_batch' END,
                manual_category = 'Folha de Pagamento / Salários',
                contabilizar_no_subtotal = true,
                updated_at = now()
            WHERE id = sispag_ofx.id;

            v_matched_count := v_matched_count + 1;
            IF v_bills_in_batch > 1 THEN
                v_sispag_batch_count := v_sispag_batch_count + 1;
            END IF;
            CONTINUE;
        END IF;

        -- D2: Subset Sum Combinatório (1 a 6 títulos) na mesma filial
        v_matched_bill_ids := NULL;
        WITH RECURSIVE combos AS (
            SELECT 
                ARRAY[id] as bill_ids,
                amount as total_amount,
                1 as item_count,
                id as last_id
            FROM public.daily_manual_bills
            WHERE date = v_target_date
              AND matched_ofx_id IS NULL
              AND store_id = sispag_ofx.store_id
              AND (
                  category = 'retirada_socios'
                  OR UPPER(COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(recipient_name, '')) ~* 'SALARIO|SALÁRIO|RESCISAO|FERIAS|FÉRIAS|PREMIO|VALE'
              )
            
            UNION ALL
            
            SELECT 
                c.bill_ids || b.id,
                c.total_amount + b.amount,
                c.item_count + 1,
                b.id
            FROM combos c
            JOIN public.daily_manual_bills b 
              ON b.date = v_target_date
             AND b.matched_ofx_id IS NULL
             AND b.store_id = sispag_ofx.store_id
             AND (
                 b.category = 'retirada_socios'
                 OR UPPER(COALESCE(b.title, '') || ' ' || COALESCE(b.description, '') || ' ' || COALESCE(b.recipient_name, '')) ~* 'SALARIO|SALÁRIO|RESCISAO|FERIAS|FÉRIAS|PREMIO|VALE'
             )
             AND b.id > c.last_id
            WHERE c.item_count < 6
              AND c.total_amount < sispag_ofx.deb_amount + 0.10
        )
        SELECT bill_ids INTO v_matched_bill_ids
        FROM combos
        WHERE ABS(total_amount - sispag_ofx.deb_amount) <= 0.05
        ORDER BY item_count ASC
        LIMIT 1;

        IF v_matched_bill_ids IS NOT NULL AND array_length(v_matched_bill_ids, 1) > 0 THEN
            UPDATE public.daily_manual_bills
            SET matched_ofx_id = sispag_ofx.id,
                match_status = CASE WHEN array_length(v_matched_bill_ids, 1) = 1 THEN 'matched' ELSE 'matched_batch' END,
                updated_at = now()
            WHERE id = ANY(v_matched_bill_ids);

            UPDATE public.ofx_transactions
            SET matched_bill_id = v_matched_bill_ids[1],
                match_status = CASE WHEN array_length(v_matched_bill_ids, 1) = 1 THEN 'matched' ELSE 'matched_batch' END,
                manual_category = 'Folha de Pagamento / Salários',
                contabilizar_no_subtotal = true,
                updated_at = now()
            WHERE id = sispag_ofx.id;

            v_matched_count := v_matched_count + 1;
            IF array_length(v_matched_bill_ids, 1) > 1 THEN
                v_sispag_batch_count := v_sispag_batch_count + 1;
            END IF;
            CONTINUE;
        END IF;

        -- D3: Subset Sum Combinatório Filial + Matriz/Holding
        v_matched_bill_ids := NULL;
        WITH RECURSIVE combos_master AS (
            SELECT 
                ARRAY[id] as bill_ids,
                amount as total_amount,
                1 as item_count,
                id as last_id
            FROM public.daily_manual_bills
            WHERE date = v_target_date
              AND matched_ofx_id IS NULL
              AND (store_id = sispag_ofx.store_id OR store_id = 'master' OR store_id IS NULL)
              AND (
                  category = 'retirada_socios'
                  OR UPPER(COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(recipient_name, '')) ~* 'SALARIO|SALÁRIO|RESCISAO|FERIAS|FÉRIAS|PREMIO|VALE'
              )
            
            UNION ALL
            
            SELECT 
                c.bill_ids || b.id,
                c.total_amount + b.amount,
                c.item_count + 1,
                b.id
            FROM combos_master c
            JOIN public.daily_manual_bills b 
              ON b.date = v_target_date
             AND b.matched_ofx_id IS NULL
             AND (b.store_id = sispag_ofx.store_id OR b.store_id = 'master' OR b.store_id IS NULL)
             AND (
                 b.category = 'retirada_socios'
                 OR UPPER(COALESCE(b.title, '') || ' ' || COALESCE(b.description, '') || ' ' || COALESCE(b.recipient_name, '')) ~* 'SALARIO|SALÁRIO|RESCISAO|FERIAS|FÉRIAS|PREMIO|VALE'
             )
             AND b.id > c.last_id
            WHERE c.item_count < 6
              AND c.total_amount < sispag_ofx.deb_amount + 0.10
        )
        SELECT bill_ids INTO v_matched_bill_ids
        FROM combos_master
        WHERE ABS(total_amount - sispag_ofx.deb_amount) <= 0.05
        ORDER BY item_count ASC
        LIMIT 1;

        IF v_matched_bill_ids IS NOT NULL AND array_length(v_matched_bill_ids, 1) > 0 THEN
            UPDATE public.daily_manual_bills
            SET matched_ofx_id = sispag_ofx.id,
                match_status = CASE WHEN array_length(v_matched_bill_ids, 1) = 1 THEN 'matched' ELSE 'matched_batch' END,
                updated_at = now()
            WHERE id = ANY(v_matched_bill_ids);

            UPDATE public.ofx_transactions
            SET matched_bill_id = v_matched_bill_ids[1],
                match_status = CASE WHEN array_length(v_matched_bill_ids, 1) = 1 THEN 'matched' ELSE 'matched_batch' END,
                manual_category = 'Folha de Pagamento / Salários',
                contabilizar_no_subtotal = true,
                updated_at = now()
            WHERE id = sispag_ofx.id;

            v_matched_count := v_matched_count + 1;
            IF array_length(v_matched_bill_ids, 1) > 1 THEN
                v_sispag_batch_count := v_sispag_batch_count + 1;
            END IF;
            CONTINUE;
        END IF;

        -- D4: Colaborador com valor único em qualquer loja
        SELECT id INTO v_primary_bill_id
        FROM public.daily_manual_bills
        WHERE date = v_target_date
          AND matched_ofx_id IS NULL
          AND ABS(amount - sispag_ofx.deb_amount) <= 0.05
          AND (
              category = 'retirada_socios'
              OR UPPER(COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(recipient_name, '')) ~* 'SALARIO|SALÁRIO|RESCISAO|FERIAS|VALE'
          )
        LIMIT 1;

        IF v_primary_bill_id IS NOT NULL THEN
            UPDATE public.daily_manual_bills
            SET matched_ofx_id = sispag_ofx.id,
                match_status = 'matched',
                updated_at = now()
            WHERE id = v_primary_bill_id;

            UPDATE public.ofx_transactions
            SET matched_bill_id = v_primary_bill_id,
                match_status = 'matched',
                manual_category = 'Folha de Pagamento / Salários',
                contabilizar_no_subtotal = true,
                updated_at = now()
            WHERE id = sispag_ofx.id;

            v_matched_count := v_matched_count + 1;
        END IF;
    END LOOP;

    -- ========================================================================
    -- CAMADA 1: MATCH EXATO POR CÓDIGO EXTERNO / FITID / DOC (100% Confiança)
    -- ========================================================================
    FOR bill_rec IN
        SELECT b.id, b.amount, b.store_id, b.recipient_name, b.title, b.external_code
        FROM public.daily_manual_bills b
        WHERE b.date = v_target_date
          AND b.matched_ofx_id IS NULL
          AND COALESCE(b.contabilizar_no_subtotal, true) = true
          AND b.external_code IS NOT NULL
          AND TRIM(b.external_code) != ''
        ORDER BY b.amount DESC
    LOOP
        SELECT o.id, o.amount, o.store_id
        INTO ofx_rec
        FROM public.ofx_transactions o
        WHERE (o.target_date = v_target_date OR o.occurred_at::date = v_target_date)
          AND o.type = 'out'
          AND o.matched_bill_id IS NULL
          AND o.match_status IS NULL
          AND (
              bill_rec.store_id IS NULL 
              OR o.store_id IS NULL 
              OR o.store_id = bill_rec.store_id
          )
          AND (
              o.fitid ILIKE ('%' || bill_rec.external_code || '%')
              OR bill_rec.external_code ILIKE ('%' || o.fitid || '%')
          )
          AND ABS(ABS(o.amount) - bill_rec.amount) < 0.05
        ORDER BY 
            CASE WHEN o.store_id = bill_rec.store_id THEN 0 ELSE 1 END,
            ABS(ABS(o.amount) - bill_rec.amount) ASC
        LIMIT 1;

        IF ofx_rec.id IS NOT NULL THEN
            UPDATE public.daily_manual_bills
            SET matched_ofx_id = ofx_rec.id,
                match_status = 'matched',
                updated_at = now()
            WHERE id = bill_rec.id;

            UPDATE public.ofx_transactions
            SET matched_bill_id = bill_rec.id,
                contabilizar_no_subtotal = true,
                match_status = 'matched',
                updated_at = now()
            WHERE id = ofx_rec.id;

            v_matched_count := v_matched_count + 1;
        END IF;
    END LOOP;

    -- ========================================================================
    -- CAMADA 2: MATCH EXATO DE VALOR ESTRITAMENTE NA MESMA FILIAL (99% Confiança)
    -- ========================================================================
    FOR bill_rec IN
        SELECT b.id, b.amount, b.store_id, b.recipient_name, b.title
        FROM public.daily_manual_bills b
        WHERE b.date = v_target_date
          AND b.matched_ofx_id IS NULL
          AND COALESCE(b.contabilizar_no_subtotal, true) = true
          AND b.store_id IS NOT NULL
          AND b.store_id != 'master'
        ORDER BY b.amount DESC
    LOOP
        SELECT o.id, o.amount
        INTO ofx_rec
        FROM public.ofx_transactions o
        WHERE (o.target_date = v_target_date OR o.occurred_at::date = v_target_date)
          AND o.type = 'out'
          AND o.matched_bill_id IS NULL
          AND o.match_status IS NULL
          AND o.store_id = bill_rec.store_id
          AND ABS(ABS(o.amount) - bill_rec.amount) < 0.05
        ORDER BY 
            CASE 
                WHEN (
                    UPPER(COALESCE(o.counterpart_name, '') || ' ' || COALESCE(o.bank_name, '') || ' ' || COALESCE(o.fitid, '')) 
                    ILIKE ('%' || UPPER(SPLIT_PART(COALESCE(bill_rec.recipient_name, bill_rec.title), ' ', 1)) || '%')
                ) THEN 0 
                ELSE 1 
            END,
            ABS(ABS(o.amount) - bill_rec.amount) ASC
        LIMIT 1;

        IF ofx_rec.id IS NOT NULL THEN
            UPDATE public.daily_manual_bills
            SET matched_ofx_id = ofx_rec.id,
                match_status = 'matched',
                updated_at = now()
            WHERE id = bill_rec.id;

            UPDATE public.ofx_transactions
            SET matched_bill_id = bill_rec.id,
                contabilizar_no_subtotal = true,
                match_status = 'matched',
                updated_at = now()
            WHERE id = ofx_rec.id;

            v_matched_count := v_matched_count + 1;
        END IF;
    END LOOP;

    -- ========================================================================
    -- CAMADA 3: MATCH DE CONTAS DA MATRIZ / COMPARTILHADAS (85% Confiança)
    -- ========================================================================
    FOR bill_rec IN
        SELECT b.id, b.amount, b.store_id, b.recipient_name, b.title
        FROM public.daily_manual_bills b
        WHERE b.date = v_target_date
          AND b.matched_ofx_id IS NULL
          AND COALESCE(b.contabilizar_no_subtotal, true) = true
          AND (b.store_id IS NULL OR b.store_id = 'master')
        ORDER BY b.amount DESC
    LOOP
        SELECT o.id, o.amount
        INTO ofx_rec
        FROM public.ofx_transactions o
        WHERE (o.target_date = v_target_date OR o.occurred_at::date = v_target_date)
          AND o.type = 'out'
          AND o.matched_bill_id IS NULL
          AND o.match_status IS NULL
          AND ABS(ABS(o.amount) - bill_rec.amount) < 0.05
        ORDER BY 
            CASE 
                WHEN (
                    UPPER(COALESCE(o.counterpart_name, '') || ' ' || COALESCE(o.bank_name, '') || ' ' || COALESCE(o.fitid, '')) 
                    ILIKE ('%' || UPPER(SPLIT_PART(COALESCE(bill_rec.recipient_name, bill_rec.title), ' ', 1)) || '%')
                ) THEN 0 
                ELSE 1 
            END,
            ABS(ABS(o.amount) - bill_rec.amount) ASC
        LIMIT 1;

        IF ofx_rec.id IS NOT NULL THEN
            UPDATE public.daily_manual_bills
            SET matched_ofx_id = ofx_rec.id,
                match_status = 'matched',
                updated_at = now()
            WHERE id = bill_rec.id;

            UPDATE public.ofx_transactions
            SET matched_bill_id = bill_rec.id,
                contabilizar_no_subtotal = true,
                match_status = 'matched',
                updated_at = now()
            WHERE id = ofx_rec.id;

            v_matched_count := v_matched_count + 1;
        END IF;
    END LOOP;

    -- ========================================================================
    -- TOTALIZADORES PARA FEEDBACK AUDITÁVEL
    -- ========================================================================
    SELECT count(*) INTO v_unmatched_bills
    FROM public.daily_manual_bills
    WHERE date = v_target_date
      AND matched_ofx_id IS NULL
      AND COALESCE(contabilizar_no_subtotal, true) = true;

    SELECT count(*) INTO v_orphan_outflows
    FROM public.ofx_transactions
    WHERE (target_date = v_target_date OR occurred_at::date = v_target_date)
      AND type = 'out'
      AND matched_bill_id IS NULL
      AND match_status IS NULL
      AND manual_category IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'date', v_target_date,
        'matched_count', v_matched_count,
        'sispag_batch_count', v_sispag_batch_count,
        'unmatched_bills_count', v_unmatched_bills,
        'orphan_outflows_count', v_orphan_outflows
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_match_saidas(text) TO authenticated, service_role, anon;


-- ============================================================================
-- PARTE 3: ATUALIZAÇÃO DE public.auto_match_daily_transactions COM ANTI-HIJACK
-- ============================================================================
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
    -- FASE 2: PAREAMENTO DETERMINÍSTICO DE OFX (PIX / ENTRADAS) x PATIO_OS
    -- BLINDAGEM ANTI-HIJACK: Transações de adquirentes (REDE/CARD) NUNCA casam com OS como PIX
    -- =========================================================================
    FOR v_ofx_record IN 
        SELECT id, store_id, amount, counterpart_name, fitid, bank_name, target_date, occurred_at
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
              OR COALESCE(bank_name, '') ILIKE '%REDE%' 
              OR COALESCE(bank_name, '') ILIKE '%CARD%'
          )
        ORDER BY amount DESC
    LOOP
        v_os_record := NULL;

        -- 2A. Busca por número da OS contido no texto (FITID ou counterpart_name ou bank_name)
        IF v_ofx_record.store_id IS NOT NULL THEN
            SELECT *
            INTO v_os_record
            FROM public.patio_os
            WHERE store_id = v_ofx_record.store_id
              AND (
                  (LENGTH(os_number) >= 3 AND (
                      COALESCE(v_ofx_record.fitid, '') ILIKE ('%' || os_number || '%')
                      OR COALESCE(v_ofx_record.counterpart_name, '') ILIKE ('%' || os_number || '%')
                      OR COALESCE(v_ofx_record.bank_name, '') ILIKE ('%' || os_number || '%')
                  ))
              )
            LIMIT 1;
        END IF;

        -- 2B. Busca por valor exato de pix_transfer_value na mesma filial COM CHECAGEM DE UNICIDADE
        IF v_os_record.id IS NULL AND v_ofx_record.store_id IS NOT NULL THEN
            SELECT count(*) INTO v_count_candidates
            FROM public.patio_os
            WHERE store_id = v_ofx_record.store_id
              AND ABS(COALESCE(pix_transfer_value, 0) - v_ofx_record.amount) <= 0.05;

            IF v_count_candidates = 1 THEN
                SELECT *
                INTO v_os_record
                FROM public.patio_os
                WHERE store_id = v_ofx_record.store_id
                  AND ABS(COALESCE(pix_transfer_value, 0) - v_ofx_record.amount) <= 0.05
                LIMIT 1;
            ELSIF v_count_candidates > 1 THEN
                v_collision_count := v_collision_count + 1;
                v_os_record := NULL;
            END IF;
        END IF;

        -- 2C. Se não achou, busca por valor total ou em aberto na mesma filial COM CHECAGEM DE UNICIDADE
        IF v_os_record.id IS NULL AND v_count_candidates = 0 AND v_ofx_record.store_id IS NOT NULL THEN
            SELECT count(*) INTO v_count_candidates
            FROM public.patio_os
            WHERE store_id = v_ofx_record.store_id
              AND (
                  ABS((total_value - paid_value) - v_ofx_record.amount) <= 0.05
                  OR ABS(total_value - v_ofx_record.amount) <= 0.05
              );

            IF v_count_candidates = 1 THEN
                SELECT *
                INTO v_os_record
                FROM public.patio_os
                WHERE store_id = v_ofx_record.store_id
                  AND (
                      ABS((total_value - paid_value) - v_ofx_record.amount) <= 0.05
                      OR ABS(total_value - v_ofx_record.amount) <= 0.05
                  )
                LIMIT 1;
            ELSIF v_count_candidates > 1 THEN
                v_collision_count := v_collision_count + 1;
                v_os_record := NULL;
            END IF;
        END IF;

        -- 2D. Se não achou por valor, busca por primeiro nome do cliente (se tiver pelo menos 4 caracteres)
        IF v_os_record.id IS NULL AND v_count_candidates = 0 AND v_ofx_record.store_id IS NOT NULL AND LENGTH(COALESCE(v_ofx_record.counterpart_name, '')) >= 4 THEN
            SELECT *
            INTO v_os_record
            FROM public.patio_os
            WHERE store_id = v_ofx_record.store_id
              AND client_name IS NOT NULL
              AND (
                  client_name ILIKE ('%' || SPLIT_PART(TRIM(v_ofx_record.counterpart_name), ' ', 1) || '%')
                  OR v_ofx_record.counterpart_name ILIKE ('%' || SPLIT_PART(TRIM(client_name), ' ', 1) || '%')
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

    -- FASE 3: Auto-match de Saídas
    BEGIN
        v_saidas_result := public.auto_match_saidas(v_target_date::text);
    EXCEPTION WHEN OTHERS THEN
        v_saidas_result := jsonb_build_object('success', false, 'error', SQLERRM);
    END;

    RETURN jsonb_build_object(
        'success', true,
        'date', v_target_date,
        'pos_matched', v_pos_matched,
        'pix_matched', v_pix_matched,
        'collisions_prevented', v_collision_count,
        'corporate_tagged', v_corporate_tagged,
        'saidas_result', v_saidas_result
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_match_daily_transactions(text) TO authenticated, service_role, anon;


-- ============================================================================
-- PARTE 4: ATUALIZAÇÃO CANÔNICA DE public.get_daily_reconciliation_summary
-- ============================================================================
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
    -- DETALHAMENTO POR LOJA (SPLIT DUAL COM CORREÇÃO CANÔNICA)
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
            COALESCE(SUM(CASE 
                WHEN manual_category ILIKE '%REDE%' 
                  OR counterpart_name ILIKE '%REDE%' 
                  OR counterpart_name ILIKE '%CARD%' 
                  OR bank_name ILIKE '%REDE%' 
                  OR bank_name ILIKE '%CARD%' 
                THEN amount ELSE 0 
            END), 0) as ofx_maquininhas,
            COALESCE(SUM(CASE 
                WHEN (matched_os_number IS NOT NULL OR manual_category = 'PIX / Recebimento OS')
                 AND NOT (
                     counterpart_name ILIKE '%REDE%' 
                     OR counterpart_name ILIKE '%CARD%' 
                     OR counterpart_name ILIKE '%CIELO%' 
                     OR counterpart_name ILIKE '%STONE%' 
                     OR counterpart_name ILIKE '%PAGSEGURO%'
                     OR bank_name ILIKE '%REDE%' 
                     OR bank_name ILIKE '%CARD%'
                 )
                THEN amount ELSE 0 
            END), 0) as pix_total,
            COALESCE(SUM(CASE 
                WHEN manual_category IS NOT NULL 
                 AND manual_category NOT IN ('PIX / Recebimento OS', 'REDE')
                 AND NOT (
                     counterpart_name ILIKE '%REDE%' 
                     OR counterpart_name ILIKE '%CARD%' 
                     OR counterpart_name ILIKE '%CIELO%' 
                     OR counterpart_name ILIKE '%STONE%' 
                     OR counterpart_name ILIKE '%PAGSEGURO%'
                     OR bank_name ILIKE '%REDE%' 
                     OR bank_name ILIKE '%CARD%'
                 )
                THEN amount ELSE 0 
            END), 0) as entradas_justificadas,
            COALESCE(SUM(CASE 
                WHEN matched_os_number IS NULL 
                 AND manual_category IS NULL 
                 AND NOT (
                     counterpart_name ILIKE '%REDE%' 
                     OR counterpart_name ILIKE '%CARD%' 
                     OR counterpart_name ILIKE '%CIELO%' 
                     OR counterpart_name ILIKE '%STONE%' 
                     OR counterpart_name ILIKE '%PAGSEGURO%'
                     OR bank_name ILIKE '%REDE%' 
                     OR bank_name ILIKE '%CARD%'
                 )
                THEN amount ELSE 0 
            END), 0) as entradas_orfas
        FROM ofx_transactions
        WHERE target_date = v_target_date::date AND type = 'in'
        GROUP BY TRIM(store_id::text)
    ),
    ofx_saidas_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(ABS(amount)), 0) as ofx_saidas_total,
            COALESCE(SUM(CASE 
                WHEN matched_bill_id IS NOT NULL 
                  OR manual_category IS NOT NULL 
                  OR match_status IN ('matched', 'matched_batch', 'intercompany_paired', 'auto_cancelled') 
                THEN ABS(amount) ELSE 0 
            END), 0) as saidas_conciliadas,
            COALESCE(SUM(CASE 
                WHEN matched_bill_id IS NULL 
                 AND manual_category IS NULL 
                 AND (match_status IS NULL OR match_status = 'unmatched') 
                THEN ABS(amount) ELSE 0 
            END), 0) as saidas_orfas
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
        'saldo_banco_itau', COALESCE(rt.bank_total, rl.bank_total, 0),
        'saldo_bancos_positivo', CASE WHEN COALESCE(rt.bank_total, rl.bank_total, 0) > 0 THEN COALESCE(rt.bank_total, rl.bank_total, 0) ELSE 0 END,
        'saldo_negativo_itau', CASE WHEN COALESCE(rt.bank_total, rl.bank_total, 0) < 0 THEN ABS(COALESCE(rt.bank_total, rl.bank_total, 0)) ELSE 0 END,
        'maquininha', COALESCE(rd.rede_liquido, 0),
        'rede_bruto', COALESCE(rd.rede_bruto, 0),
        'rede_liquido', COALESCE(rd.rede_liquido, 0),
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
        'saidas_justificadas', COALESCE(sofx.saidas_conciliadas, 0),
        'saidas_orfas', COALESCE(sofx.saidas_orfas, 0),
        'contas_loja_total', COALESCE(bst.contas_loja_total, 0),
        'contas_conciliadas', COALESCE(sofx.saidas_conciliadas, 0),
        'dif_saidas', COALESCE(sofx.saidas_orfas, 0),
        'diferenca_saidas', COALESCE(sofx.saidas_orfas, 0),
        'na_loja_os', COALESCE(rt.na_loja_os, p.patio_total, rl.na_loja_os, 0),
        'patio_os', COALESCE(rt.na_loja_os, p.patio_total, rl.na_loja_os, 0),
        'diferenca_total', (COALESCE(oe.ofx_entradas_total, 0) - (COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0) + COALESCE(oe.entradas_justificadas, 0))) - COALESCE(sofx.saidas_orfas, 0),
        'diferenca', (COALESCE(oe.ofx_entradas_total, 0) - (COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0) + COALESCE(oe.entradas_justificadas, 0))) - COALESCE(sofx.saidas_orfas, 0),
        'status', CASE 
            WHEN ABS(COALESCE(oe.ofx_entradas_total, 0) - (COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0) + COALESCE(oe.entradas_justificadas, 0))) <= 0.05 
             AND ABS(COALESCE(sofx.saidas_orfas, 0)) <= 0.05 THEN 'approved' 
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
        v_saldo_bancos_positivo := COALESCE(v_snapshot.saldo_bancario, 0);
        v_saldo_negativo_itau := COALESCE(v_snapshot.saldo_negativo_itau, 0);
    END IF;

    -- 2. Dinheiro em Lojas e Maquininhas
    SELECT COALESCE(SUM(amount), 0) INTO v_dinheiro_lojas
    FROM store_cash_vault
    WHERE entry_date = v_target_date::date;

    SELECT 
        COALESCE(SUM(net_amount), 0),
        COALESCE(SUM(CASE WHEN transaction_type = 'devolucao' THEN gross_amount ELSE 0 END), 0)
    INTO v_cartoes_a_compensar, v_devolucoes_rede
    FROM pos_transactions
    WHERE COALESCE(target_date, occurred_at::date) = v_target_date::date;

    v_total_saldo_banco_positivo := v_saldo_bancos_positivo + v_dinheiro_lojas + v_cartoes_a_compensar - v_devolucoes_rede;
    v_total_saldo_banco := v_saldo_bancos;

    -- 3. Ativos Operacionais
    IF v_snapshot_found THEN
        v_dinheiro_mp := COALESCE(v_snapshot.dinheiro_mp, 0);
        v_a_receber := COALESCE(v_snapshot.a_receber_manual, 0);
    ELSE
        v_dinheiro_mp := 0;
        v_a_receber := 0;
    END IF;

    -- Pátio Ativo (WIP)
    SELECT COALESCE(SUM(total_value - paid_value), 0) INTO v_na_loja_os
    FROM patio_os
    WHERE (status ILIKE '%aberto%' OR status ILIKE '%parcial%' OR status ILIKE '%pendente%' OR status = 'ABERTA' OR status = 'PENDENTE')
      AND opened_at::date <= v_target_date::date;

    IF (v_na_loja_os = 0 OR v_na_loja_os IS NULL) AND v_snapshot_found THEN
        v_na_loja_os := COALESCE(v_snapshot.total_patio, 0);
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
        IF v_faturamento_anterior > 0 AND v_snapshot.faturamento >= v_faturamento_anterior THEN
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
    -- CONTAS A PAGAR
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
    WHERE date = v_target_date::date;

    IF v_snapshot_found AND (v_snapshot.metadata->>'subtotal_contas')::numeric > 0 THEN
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
        IF v_snapshot_found AND (v_snapshot.metadata->>'contas_base')::numeric > 0 THEN
            v_contas_base := (v_snapshot.metadata->>'contas_base')::numeric;
        ELSIF v_contas_imported_bills > 0 THEN
            v_contas_base := v_contas_imported_bills;
        ELSE
            v_contas_base := 0;
        END IF;

        v_contas_manual := v_contas_base + v_contas_extras;
        v_juros_rede := COALESCE(v_snapshot.juros_rede, 0);
        v_subtotal_contas := v_contas_manual + v_juros_rede;
    END IF;

    v_diferenca_final := v_valor_disp_contas - v_subtotal_contas;
    
    -- Respeita status_geral do snapshot fechado apenas se p_force_dynamic for falso
    IF v_snapshot_found AND v_snapshot.is_closed AND NOT p_force_dynamic AND (v_snapshot.metadata->>'status_geral') IS NOT NULL THEN
        v_status_geral := (v_snapshot.metadata->>'status_geral');
    ELSE
        v_status_geral := CASE WHEN ABS(v_diferenca_final) <= 50.00 THEN 'approved' ELSE 'divergent' END;
    END IF;

    -- Fast-Path Condicional Seguro (1-clique viável se todas as lojas alinhadas e sem desfalques)
    v_fast_path_eligible := (NOT v_has_divergent_stores) AND (ABS(v_diferenca_final) <= 50.00);

    RETURN jsonb_build_object(
        'date', v_target_date,
        'is_closed', COALESCE(v_snapshot.is_closed, false),
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
        -- Extensões Bicanais (Spec 359)
        'caixa_tesouraria', v_caixa_tesouraria,
        'status_tesouraria', v_status_tesouraria,
        'patio_wip', v_patio_wip,
        'variacao_patio_delta_p4', v_variacao_patio_delta_p4,
        'fast_path_eligible', v_fast_path_eligible
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_daily_reconciliation_summary(text, boolean) TO authenticated, service_role, anon;
