-- Migration: 20260922000001_harden_auto_match_saidas_and_intercompany.sql
-- Spec 430: Blindagem do auto_match_saidas contra casamentos cegos por valor e saneamento 22/09

-- 1. DESVINCULAR PAR ESPÚRIO LUIS HENRIQUE X CARTÃO DANIEL EM 22/09
UPDATE public.ofx_transactions
SET matched_bill_id = NULL,
    match_status = 'unmatched',
    updated_at = now()
WHERE id = 'c5d97d98-172a-4e6e-94c9-c6429cff569e'
  AND matched_bill_id = 'f0fa9f66-6511-4445-b0d6-0c58d8570417';

UPDATE public.daily_manual_bills
SET matched_ofx_id = NULL,
    match_status = 'unmatched',
    updated_at = now()
WHERE id = 'f0fa9f66-6511-4445-b0d6-0c58d8570417'
  AND matched_ofx_id = 'c5d97d98-172a-4e6e-94c9-c6429cff569e';

-- 2. RECRIAR public.auto_match_saidas COM FILTRAGEM SEMÂNTICA OBRIGATÓRIA NO WHERE
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

    -- FASE 0: Sanear vínculos espúrios de cross-store legados na data
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

    -- FASE A: AUTO-CANCELAMENTO DE BLOQUEIO / DESBLOQUEIO PIX
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

    -- FASE B: PAREAMENTO INTERCOMPANY ENTRE FILIAIS
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

    -- FASE C: BLINDAGEM DE SAQUES ATM
    UPDATE public.ofx_transactions
    SET manual_category = 'Retirada de Sócios / Sangria / Saque em Dinheiro',
        contabilizar_no_subtotal = false,
        updated_at = now()
    WHERE (target_date = v_target_date OR occurred_at::date = v_target_date)
      AND type = 'out'
      AND matched_bill_id IS NULL
      AND manual_category IS NULL
      AND UPPER(COALESCE(counterpart_name, '') || ' ' || COALESCE(bank_name, '')) ~* 'SAQUE DIN|SAQUE ATM|CART00';

    -- FASE D: SISPAG / SALÁRIOS COM SUBSET SUM
    FOR sispag_ofx IN
        SELECT id, ABS(amount) as deb_amount, store_id
        FROM public.ofx_transactions
        WHERE (target_date = v_target_date OR occurred_at::date = v_target_date)
          AND type = 'out'
          AND matched_bill_id IS NULL
          AND manual_category IS NULL
          AND (match_status IS NULL OR match_status = 'unmatched')
          AND UPPER(COALESCE(counterpart_name, '') || ' ' || COALESCE(bank_name, '')) ~* 'SISPAG|SALARIO'
        ORDER BY ABS(amount) DESC
    LOOP
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
    END LOOP;

    -- CAMADA 1: MATCH EXATO POR CÓDIGO EXTERNO / FITID / DOC
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
          AND o.manual_category IS NULL
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

    -- CAMADA 2: MATCH EXATO DE VALOR NA MESMA FILIAL (COM TOKEN NO WHERE)
    FOR bill_rec IN
        SELECT b.id, b.amount, b.store_id, b.recipient_name, b.title, b.external_code
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
          AND o.manual_category IS NULL
          AND o.store_id = bill_rec.store_id
          AND ABS(ABS(o.amount) - bill_rec.amount) < 0.05
          AND (
              (
                  LENGTH(SPLIT_PART(TRIM(COALESCE(bill_rec.recipient_name, bill_rec.title, '')), ' ', 1)) >= 3
                  AND UPPER(COALESCE(o.counterpart_name, '') || ' ' || COALESCE(o.bank_name, '') || ' ' || COALESCE(o.fitid, '')) 
                      ILIKE ('%' || UPPER(SPLIT_PART(TRIM(COALESCE(bill_rec.recipient_name, bill_rec.title, '')), ' ', 1)) || '%')
              )
              OR (
                  LENGTH(SPLIT_PART(TRIM(COALESCE(bill_rec.recipient_name, bill_rec.title, '')), ' ', 2)) >= 3
                  AND UPPER(COALESCE(o.counterpart_name, '') || ' ' || COALESCE(o.bank_name, '') || ' ' || COALESCE(o.fitid, '')) 
                      ILIKE ('%' || UPPER(SPLIT_PART(TRIM(COALESCE(bill_rec.recipient_name, bill_rec.title, '')), ' ', 2)) || '%')
              )
              OR (
                  bill_rec.external_code IS NOT NULL 
                  AND TRIM(bill_rec.external_code) != ''
                  AND (o.fitid ILIKE ('%' || bill_rec.external_code || '%') OR bill_rec.external_code ILIKE ('%' || o.fitid || '%'))
              )
          )
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

    -- CAMADA 3: MATCH DE CONTAS DA MATRIZ / COMPARTILHADAS (ESTRITAMENTE COM TOKEN NO WHERE)
    FOR bill_rec IN
        SELECT b.id, b.amount, b.store_id, b.recipient_name, b.title, b.external_code
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
          AND o.manual_category IS NULL
          AND ABS(ABS(o.amount) - bill_rec.amount) < 0.05
          AND (
              (
                  LENGTH(SPLIT_PART(TRIM(COALESCE(bill_rec.recipient_name, bill_rec.title, '')), ' ', 1)) >= 3
                  AND UPPER(COALESCE(o.counterpart_name, '') || ' ' || COALESCE(o.bank_name, '') || ' ' || COALESCE(o.fitid, '')) 
                      ILIKE ('%' || UPPER(SPLIT_PART(TRIM(COALESCE(bill_rec.recipient_name, bill_rec.title, '')), ' ', 1)) || '%')
              )
              OR (
                  LENGTH(SPLIT_PART(TRIM(COALESCE(bill_rec.recipient_name, bill_rec.title, '')), ' ', 2)) >= 3
                  AND UPPER(COALESCE(o.counterpart_name, '') || ' ' || COALESCE(o.bank_name, '') || ' ' || COALESCE(o.fitid, '')) 
                      ILIKE ('%' || UPPER(SPLIT_PART(TRIM(COALESCE(bill_rec.recipient_name, bill_rec.title, '')), ' ', 2)) || '%')
              )
              OR (
                  bill_rec.external_code IS NOT NULL 
                  AND TRIM(bill_rec.external_code) != ''
                  AND (o.fitid ILIKE ('%' || bill_rec.external_code || '%') OR bill_rec.external_code ILIKE ('%' || o.fitid || '%'))
              )
          )
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

    -- TOTALIZADORES
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
