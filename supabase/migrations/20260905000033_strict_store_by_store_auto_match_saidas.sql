-- ============================================================================
-- Migration: 20260905000033_strict_store_by_store_auto_match_saidas.sql
-- Spec: 373 - Matching Estrito de Saídas OFX x Contas a Pagar (Loja a Loja)
-- Description:
-- 1. Garante coluna match_status em ofx_transactions.
-- 2. Saneamento automático de vínculos espúrios de cross-store legados.
-- 3. Reformulação estrita da RPC auto_match_saidas:
--    - Batimento 100% determinístico entre débitos OFX e títulos de contas a pagar.
--    - Restrição estrita intra-loja (o.store_id = bill_rec.store_id).
--    - Expurgo total de matching cruzado cego entre filiais distintas.
--    - Permite cross-store apenas se a conta for da Matriz (store_id IS NULL ou 'master').
--    - Zero auto-categorização no escuro: saídas sem contas permanecem como órfãs
--      legítimas para justificativa controlada do operador.
-- 4. Assinatura única canônica: auto_match_saidas(p_date text).
-- ============================================================================

-- 1. Garante coluna match_status em ofx_transactions
ALTER TABLE public.ofx_transactions ADD COLUMN IF NOT EXISTS match_status TEXT;

-- 2. Dropa todas as sobrecargas antigas para desambiguação
DROP FUNCTION IF EXISTS public.auto_match_saidas(date);
DROP FUNCTION IF EXISTS public.auto_match_saidas(text);

CREATE OR REPLACE FUNCTION public.auto_match_saidas(p_date text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_date date;
    v_matched_count int := 0;
    v_unmatched_bills int := 0;
    v_orphan_outflows int := 0;
    v_cleaned_cross_store int := 0;
    bill_rec RECORD;
    ofx_rec RECORD;
BEGIN
    IF p_date IS NULL THEN
        RAISE EXCEPTION 'Data obrigatória para pareamento de saídas.';
    END IF;

    v_target_date := p_date::date;

    -- ========================================================================
    -- FASE 0: SANEAR VÍNCULOS ESPÚRIOS DE CROSS-STORE LEGADOS NA DATA
    -- Desfaz qualquer casamento indevido entre filiais distintas
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
    -- CAMADA 1: MATCH EXATO POR CÓDIGO EXTERNO / FITID / DOC (100% Confiança)
    -- Vínculo quando o código do título bate com o FITID ou memo do extrato
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
    -- Exige identicidade de loja: Loja A só bate com conta da Loja A!
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
    -- CAMADA 3: MATCH FUZZY DE FORNECEDOR / ENCARGOS NA MESMA FILIAL (90% Confiança)
    -- Tolerância de até R$ 5,00 para juros/descontos de boleto na MESMA FILIAL
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
          AND o.store_id = bill_rec.store_id
          AND (
              ABS(ABS(o.amount) - bill_rec.amount) <= 5.00
              OR (bill_rec.amount > 0 AND ABS(ABS(o.amount) - bill_rec.amount) / bill_rec.amount <= 0.02)
          )
          AND (
              (LENGTH(SPLIT_PART(TRIM(COALESCE(bill_rec.recipient_name, bill_rec.title)), ' ', 1)) >= 3
               AND (UPPER(COALESCE(o.counterpart_name, '') || ' ' || COALESCE(o.bank_name, '') || ' ' || COALESCE(o.fitid, ''))
                    ILIKE ('%' || UPPER(SPLIT_PART(TRIM(COALESCE(bill_rec.recipient_name, bill_rec.title)), ' ', 1)) || '%')))
              OR 
              (LENGTH(SPLIT_PART(TRIM(COALESCE(o.counterpart_name, '')), ' ', 1)) >= 3
               AND (UPPER(COALESCE(bill_rec.recipient_name, '') || ' ' || COALESCE(bill_rec.title, ''))
                    ILIKE ('%' || UPPER(SPLIT_PART(TRIM(COALESCE(o.counterpart_name, '')), ' ', 1)) || '%')))
          )
        ORDER BY 
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
    -- CAMADA 4: MATCH DE CONTAS DA MATRIZ / COMPARTILHADAS (85% Confiança)
    -- Contas onde store_id IS NULL ou 'master' pagas por contas holding/filiais
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
      AND manual_category IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'date', v_target_date,
        'matched_count', v_matched_count,
        'unmatched_bills_count', v_unmatched_bills,
        'orphan_outflows_count', v_orphan_outflows
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_match_saidas(text) TO authenticated, service_role, anon;
