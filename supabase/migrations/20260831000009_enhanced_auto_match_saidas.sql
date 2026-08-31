-- ============================================================================
-- Migration: 20260831000009_enhanced_auto_match_saidas.sql
-- Description: Motor canônico multi-camadas de pareamento de Saídas (OFX x Contas a Pagar)
-- ============================================================================

DROP FUNCTION IF EXISTS public.auto_match_saidas(date);
DROP FUNCTION IF EXISTS public.auto_match_saidas(text);

CREATE OR REPLACE FUNCTION public.auto_match_saidas(p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_matched_count int := 0;
    bill_rec RECORD;
    ofx_rec RECORD;
BEGIN
    IF p_date IS NULL THEN
        RAISE EXCEPTION 'Data obrigatória para o pareamento de saídas.';
    END IF;

    -- ========================================================================
    -- CAMADA 1: MATCH EXATO POR CÓDIGO EXTERNO / FITID (100% Confiança)
    -- ========================================================================
    FOR bill_rec IN
        SELECT b.id, b.amount, b.store_id, b.recipient_name, b.title, b.external_code
        FROM public.daily_manual_bills b
        WHERE b.date = p_date
          AND b.matched_ofx_id IS NULL
          AND COALESCE(b.contabilizar_no_subtotal, true) = true
          AND b.external_code IS NOT NULL
          AND TRIM(b.external_code) != ''
        ORDER BY b.amount DESC
    LOOP
        SELECT o.id, o.amount, o.store_id
        INTO ofx_rec
        FROM public.ofx_transactions o
        WHERE (o.target_date = p_date OR o.occurred_at::date = p_date)
          AND o.type = 'out'
          AND o.matched_bill_id IS NULL
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
                updated_at = now()
            WHERE id = ofx_rec.id;

            v_matched_count := v_matched_count + 1;
        END IF;
    END LOOP;

    -- ========================================================================
    -- CAMADA 2: MATCH EXATO DE VALOR + MESMA LOJA (99% Confiança)
    -- ========================================================================
    FOR bill_rec IN
        SELECT b.id, b.amount, b.store_id, b.recipient_name, b.title
        FROM public.daily_manual_bills b
        WHERE b.date = p_date
          AND b.matched_ofx_id IS NULL
          AND COALESCE(b.contabilizar_no_subtotal, true) = true
          AND b.store_id IS NOT NULL
        ORDER BY b.amount DESC
    LOOP
        SELECT o.id, o.amount
        INTO ofx_rec
        FROM public.ofx_transactions o
        WHERE (o.target_date = p_date OR o.occurred_at::date = p_date)
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
                updated_at = now()
            WHERE id = ofx_rec.id;

            v_matched_count := v_matched_count + 1;
        END IF;
    END LOOP;

    -- ========================================================================
    -- CAMADA 3: MATCH EXATO DE VALOR COM LOJA MATRIZ / NULA (95% Confiança)
    -- ========================================================================
    FOR bill_rec IN
        SELECT b.id, b.amount, b.store_id, b.recipient_name, b.title
        FROM public.daily_manual_bills b
        WHERE b.date = p_date
          AND b.matched_ofx_id IS NULL
          AND COALESCE(b.contabilizar_no_subtotal, true) = true
        ORDER BY b.amount DESC
    LOOP
        SELECT o.id, o.amount
        INTO ofx_rec
        FROM public.ofx_transactions o
        WHERE (o.target_date = p_date OR o.occurred_at::date = p_date)
          AND o.type = 'out'
          AND o.matched_bill_id IS NULL
          AND (bill_rec.store_id IS NULL OR o.store_id IS NULL)
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
                updated_at = now()
            WHERE id = ofx_rec.id;

            v_matched_count := v_matched_count + 1;
        END IF;
    END LOOP;

    -- ========================================================================
    -- CAMADA 4: MATCH GLOBAL DE VALOR ÚNICO NO DIA (90% Confiança)
    -- Se existe exatamente 1 conta e 1 débito com aquele valor em todo o dia
    -- ========================================================================
    FOR bill_rec IN
        WITH single_bills AS (
            SELECT amount
            FROM public.daily_manual_bills
            WHERE date = p_date
              AND matched_ofx_id IS NULL
              AND COALESCE(contabilizar_no_subtotal, true) = true
            GROUP BY amount
            HAVING count(*) = 1
        ),
        single_ofx AS (
            SELECT ABS(amount) as amount
            FROM public.ofx_transactions
            WHERE (target_date = p_date OR occurred_at::date = p_date)
              AND type = 'out'
              AND matched_bill_id IS NULL
            GROUP BY ABS(amount)
            HAVING count(*) = 1
        )
        SELECT b.id, b.amount, b.store_id, b.recipient_name, b.title
        FROM public.daily_manual_bills b
        JOIN single_bills sb ON sb.amount = b.amount
        JOIN single_ofx so ON ABS(so.amount - b.amount) < 0.05
        WHERE b.date = p_date
          AND b.matched_ofx_id IS NULL
          AND COALESCE(b.contabilizar_no_subtotal, true) = true
        ORDER BY b.amount DESC
    LOOP
        SELECT o.id, o.amount
        INTO ofx_rec
        FROM public.ofx_transactions o
        WHERE (o.target_date = p_date OR o.occurred_at::date = p_date)
          AND o.type = 'out'
          AND o.matched_bill_id IS NULL
          AND ABS(ABS(o.amount) - bill_rec.amount) < 0.05
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
                updated_at = now()
            WHERE id = ofx_rec.id;

            v_matched_count := v_matched_count + 1;
        END IF;
    END LOOP;

    -- ========================================================================
    -- CAMADA 5: MATCH FUZZY BIDIRECIONAL POR TOKEN/FAVORECIDO CONHECIDO (85% Confiança)
    -- Cobre: 'PRPK', 'RAVEN', 'OFICINA INTELIGENTE', 'SISPAG', 'DANIEL', 'ROGERIO', etc.
    -- ========================================================================
    FOR bill_rec IN
        SELECT b.id, b.amount, b.store_id, b.recipient_name, b.title
        FROM public.daily_manual_bills b
        WHERE b.date = p_date
          AND b.matched_ofx_id IS NULL
          AND COALESCE(b.contabilizar_no_subtotal, true) = true
        ORDER BY b.amount DESC
    LOOP
        SELECT o.id, o.amount
        INTO ofx_rec
        FROM public.ofx_transactions o
        WHERE (o.target_date = p_date OR o.occurred_at::date = p_date)
          AND o.type = 'out'
          AND o.matched_bill_id IS NULL
          AND (
              -- Tolerância de até R$ 5.00 ou 2% do valor
              ABS(ABS(o.amount) - bill_rec.amount) < 5.00
              OR (bill_rec.amount > 0 AND ABS(ABS(o.amount) - bill_rec.amount) / bill_rec.amount <= 0.02)
          )
          AND (
              -- 1. Oficina Inteligente
              (
                  (UPPER(COALESCE(bill_rec.recipient_name, '')) || ' ' || UPPER(COALESCE(bill_rec.title, ''))) ILIKE '%OFICINA%INTELIGENTE%'
                  AND (UPPER(COALESCE(o.counterpart_name, '')) || ' ' || UPPER(COALESCE(o.bank_name, '')) || ' ' || UPPER(COALESCE(o.fitid, ''))) ILIKE '%OFICINA%'
              )
              -- 2. Raven Scanner / Ferramentas
              OR (
                  (UPPER(COALESCE(bill_rec.recipient_name, '')) || ' ' || UPPER(COALESCE(bill_rec.title, ''))) ILIKE '%RAVEN%'
                  AND (UPPER(COALESCE(o.counterpart_name, '')) || ' ' || UPPER(COALESCE(o.bank_name, '')) || ' ' || UPPER(COALESCE(o.fitid, ''))) ILIKE '%RAVEN%'
              )
              -- 3. PRPK Auto Peças
              OR (
                  (UPPER(COALESCE(bill_rec.recipient_name, '')) || ' ' || UPPER(COALESCE(bill_rec.title, ''))) ILIKE '%PRPK%'
                  AND (UPPER(COALESCE(o.counterpart_name, '')) || ' ' || UPPER(COALESCE(o.bank_name, '')) || ' ' || UPPER(COALESCE(o.fitid, ''))) ILIKE '%PRPK%'
              )
              -- 4. SISPAG / Salários / Funcionários
              OR (
                  (
                      UPPER(COALESCE(bill_rec.recipient_name, '')) ILIKE ANY(ARRAY['%SALARIO%', '%FOLHA%', '%SISPAG%', '%ADIANTAMENTO%'])
                      OR UPPER(COALESCE(bill_rec.title, '')) ILIKE ANY(ARRAY['%SALARIO%', '%FOLHA%', '%SISPAG%', '%ADIANTAMENTO%'])
                  )
                  AND (
                      UPPER(COALESCE(o.counterpart_name, '')) || ' ' || UPPER(COALESCE(o.bank_name, ''))
                  ) ILIKE '%SISPAG%'
              )
              -- 5. Sócios: Daniel / Rogério / Raphael
              OR (
                  (UPPER(COALESCE(bill_rec.recipient_name, '')) || ' ' || UPPER(COALESCE(bill_rec.title, ''))) ILIKE '%DANIEL%'
                  AND (UPPER(COALESCE(o.counterpart_name, '')) || ' ' || UPPER(COALESCE(o.bank_name, '')) || ' ' || UPPER(COALESCE(o.fitid, ''))) ILIKE '%DANIEL%'
              )
              OR (
                  (UPPER(COALESCE(bill_rec.recipient_name, '')) || ' ' || UPPER(COALESCE(bill_rec.title, ''))) ILIKE '%ROGERIO%'
                  AND (UPPER(COALESCE(o.counterpart_name, '')) || ' ' || UPPER(COALESCE(o.bank_name, '')) || ' ' || UPPER(COALESCE(o.fitid, ''))) ILIKE '%ROGERIO%'
              )
              -- 6. Token genérico do primeiro termo (mínimo 4 caracteres)
              OR (
                  LENGTH(SPLIT_PART(TRIM(COALESCE(bill_rec.recipient_name, bill_rec.title)), ' ', 1)) >= 4
                  AND (UPPER(COALESCE(o.counterpart_name, '')) || ' ' || UPPER(COALESCE(o.bank_name, '')) || ' ' || UPPER(COALESCE(o.fitid, ''))) 
                      ILIKE ('%' || UPPER(SPLIT_PART(TRIM(COALESCE(bill_rec.recipient_name, bill_rec.title)), ' ', 1)) || '%')
              )
          )
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
                updated_at = now()
            WHERE id = ofx_rec.id;

            v_matched_count := v_matched_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'date', p_date,
        'matched_saidas_count', v_matched_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_match_saidas TO authenticated, service_role, anon;
