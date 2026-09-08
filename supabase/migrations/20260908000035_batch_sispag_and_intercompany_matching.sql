-- ============================================================================
-- Migration: 20260908000035_batch_sispag_and_intercompany_matching.sql
-- Spec: 375 - Diagnóstico e Resolução Automática de Saídas e Entradas Órfãs
-- Description:
-- 1. Auto-cancelamento de Bloqueio/Desbloqueio PIX de segurança (efeito líquido zero).
-- 2. Pareamento determinístico de transferências intercompany (débito Loja A <-> crédito Loja B).
-- 3. Batimento 1-para-N de lotes SISPAG Salários (1 débito consolidado = N colaboradores).
-- 4. Blindagem de saques ATM em dinheiro (não casar com duplicatas de fornecedores).
-- 5. Atualização da RPC public.auto_match_saidas(p_date text).
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
    v_diff numeric;
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

    -- Atualiza também a contraparte de crédito
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
    -- FASE D: MOTOR 1-PARA-N DE LOTES SISPAG SALÁRIOS
    -- ========================================================================
    FOR sispag_ofx IN
        SELECT id, ABS(amount) as deb_amount, store_id
        FROM public.ofx_transactions
        WHERE (target_date = v_target_date OR occurred_at::date = v_target_date)
          AND type = 'out'
          AND matched_bill_id IS NULL
          AND match_status IS NULL
          AND UPPER(COALESCE(counterpart_name, '') || ' ' || COALESCE(bank_name, '')) ~* 'SISPAG|SALARIO'
        ORDER BY ABS(amount) DESC
    LOOP
        -- D1: Testa se todos os títulos de salário em aberto da filial batem exatamente com o débito
        SELECT COALESCE(SUM(amount), 0), COUNT(*)
        INTO v_store_salary_sum, v_bills_in_batch
        FROM public.daily_manual_bills
        WHERE date = v_target_date
          AND matched_ofx_id IS NULL
          AND store_id = sispag_ofx.store_id
          AND (
              category = 'retirada_socios'
              OR UPPER(COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(recipient_name, '')) ~* 'SALARIO|SALÁRIO|RESCISAO|FERIAS|FÉRIAS|PREMIO'
          );

        IF v_bills_in_batch > 0 AND ABS(v_store_salary_sum - sispag_ofx.deb_amount) <= 0.10 THEN
            SELECT id INTO v_primary_bill_id
            FROM public.daily_manual_bills
            WHERE date = v_target_date
              AND matched_ofx_id IS NULL
              AND store_id = sispag_ofx.store_id
              AND (
                  category = 'retirada_socios'
                  OR UPPER(COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(recipient_name, '')) ~* 'SALARIO|SALÁRIO|RESCISAO|FERIAS|FÉRIAS|PREMIO'
              )
            LIMIT 1;
            -- Vincula todos os títulos da filial a este débito
            UPDATE public.daily_manual_bills
            SET matched_ofx_id = sispag_ofx.id,
                match_status = 'matched',
                updated_at = now()
            WHERE date = v_target_date
              AND matched_ofx_id IS NULL
              AND store_id = sispag_ofx.store_id
              AND (
                  category = 'retirada_socios'
                  OR UPPER(COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(recipient_name, '')) ~* 'SALARIO|SALÁRIO|RESCISAO|FERIAS|FÉRIAS|PREMIO'
              );

            -- Marca o débito OFX como lote SISPAG casado
            UPDATE public.ofx_transactions
            SET matched_bill_id = v_primary_bill_id,
                match_status = 'matched_batch',
                contabilizar_no_subtotal = true,
                updated_at = now()
            WHERE id = sispag_ofx.id;

            v_matched_count := v_matched_count + 1;
            v_sispag_batch_count := v_sispag_batch_count + 1;
            CONTINUE;
        END IF;

        -- D2: Testa se salários da filial + títulos da Matriz batem o valor
        v_diff := sispag_ofx.deb_amount - v_store_salary_sum;
        IF v_bills_in_batch > 0 AND v_diff > 0 THEN
            -- Procura na Matriz títulos que somam v_diff
            IF EXISTS (
                SELECT 1 FROM public.daily_manual_bills
                WHERE date = v_target_date
                  AND matched_ofx_id IS NULL
                  AND (store_id = 'master' OR store_id IS NULL)
                  AND ABS(amount - v_diff) <= 0.05
                  AND (category = 'retirada_socios' OR UPPER(COALESCE(title, '') || ' ' || COALESCE(description, '')) ~* 'SALARIO|SALÁRIO|FERIAS')
            ) THEN
                -- Vincula os da filial
                UPDATE public.daily_manual_bills
                SET matched_ofx_id = sispag_ofx.id,
                    match_status = 'matched',
                    updated_at = now()
                WHERE date = v_target_date
                  AND matched_ofx_id IS NULL
                  AND store_id = sispag_ofx.store_id
                  AND (
                      category = 'retirada_socios'
                      OR UPPER(COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(recipient_name, '')) ~* 'SALARIO|SALÁRIO|FERIAS'
                  );

                -- Vincula o título da matriz
                UPDATE public.daily_manual_bills
                SET matched_ofx_id = sispag_ofx.id,
                    match_status = 'matched',
                    updated_at = now()
                WHERE id = (
                    SELECT id FROM public.daily_manual_bills
                    WHERE date = v_target_date
                      AND matched_ofx_id IS NULL
                      AND (store_id = 'master' OR store_id IS NULL)
                      AND ABS(amount - v_diff) <= 0.05
                      AND (category = 'retirada_socios' OR UPPER(COALESCE(title, '') || ' ' || COALESCE(description, '')) ~* 'SALARIO|SALÁRIO|FERIAS')
                    LIMIT 1
                );

                UPDATE public.ofx_transactions
                SET matched_bill_id = v_primary_bill_id,
                    match_status = 'matched_batch',
                    contabilizar_no_subtotal = true,
                    updated_at = now()
                WHERE id = sispag_ofx.id;

                v_matched_count := v_matched_count + 1;
                v_sispag_batch_count := v_sispag_batch_count + 1;
                CONTINUE;
            END IF;
        END IF;

        -- D3: Caso seja 1 único funcionário
        SELECT id INTO v_primary_bill_id
        FROM public.daily_manual_bills
        WHERE date = v_target_date
          AND matched_ofx_id IS NULL
          AND ABS(amount - sispag_ofx.deb_amount) <= 0.05
          AND (
              category = 'retirada_socios'
              OR UPPER(COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(recipient_name, '')) ~* 'SALARIO|SALÁRIO'
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
