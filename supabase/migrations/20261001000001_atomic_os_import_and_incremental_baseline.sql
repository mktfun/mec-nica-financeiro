-- Migration: 20261001000001_atomic_os_import_and_incremental_baseline.sql
-- Description: Persistência atômica da ingestão de OSs e preservação da linha de base incremental (Spec 460)

-- 1. Evolução da tabela os_import_observations
ALTER TABLE public.os_import_observations
    ADD COLUMN IF NOT EXISTS baseline_source TEXT DEFAULT 'first_import',
    ADD COLUMN IF NOT EXISTS revision_count INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS is_negative_correction BOOLEAN DEFAULT false;

-- Garantir RLS permissivo para anon, authenticated e service_role
DROP POLICY IF EXISTS "Allow anon all on os_import_observations" ON public.os_import_observations;
CREATE POLICY "Allow anon all on os_import_observations"
    ON public.os_import_observations FOR ALL
    TO anon, authenticated, service_role
    USING (true) WITH CHECK (true);

-- 2. RPC Atômica para Ingestão de OSs e Cálculo de Linha de Base Imutável
CREATE OR REPLACE FUNCTION public.record_os_import_batch(
    p_store_id TEXT,
    p_target_date DATE,
    p_store_name TEXT,
    p_os_batch JSONB,
    p_receivables JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
    v_item JSONB;
    v_os_number TEXT;
    v_plate TEXT;
    v_client_name TEXT;
    v_total_value NUMERIC(15,2);
    v_paid_value NUMERIC(15,2);
    v_payment_method TEXT;
    v_status TEXT;
    v_raw_status TEXT;
    v_credit_val NUMERIC(15,2);
    v_debit_val NUMERIC(15,2);
    v_pix_val NUMERIC(15,2);
    v_cash_val NUMERIC(15,2);
    v_opened_at TIMESTAMPTZ;
    v_closed_at TIMESTAMPTZ;
    v_last_payment_date DATE;

    v_existing_os RECORD;
    v_existing_obs RECORD;

    v_credit_before NUMERIC(15,2);
    v_debit_before NUMERIC(15,2);
    v_pix_before NUMERIC(15,2);
    v_paid_before NUMERIC(15,2);

    v_delta_credit NUMERIC(15,2);
    v_delta_debit NUMERIC(15,2);
    v_delta_pix NUMERIC(15,2);
    v_delta_paid NUMERIC(15,2);

    v_baseline_source TEXT;
    v_revision_count INT;
    v_is_negative BOOLEAN;

    v_history JSONB;
    v_changes JSONB;
    v_new_history JSONB;

    v_inserted INT := 0;
    v_updated INT := 0;
    v_obs_count INT := 0;

    v_rec_item JSONB;
    v_rec_doc TEXT;
    v_rec_customer TEXT;
    v_rec_due DATE;
    v_rec_amount NUMERIC(15,2);
    v_rec_orig_amount NUMERIC(15,2);
    v_rec_status TEXT;
    v_rec_title TEXT;
BEGIN
    IF p_store_id IS NULL OR p_target_date IS NULL THEN
        RAISE EXCEPTION 'p_store_id e p_target_date são obrigatórios';
    END IF;

    -- Snapshot pré-importação do pátio para o dia caso ainda não exista (Spec 459)
    IF NOT EXISTS (
        SELECT 1 FROM public.patio_os_daily_backups 
        WHERE target_date = p_target_date AND store_id = p_store_id
    ) THEN
        INSERT INTO public.patio_os_daily_backups (target_date, store_id, os_data)
        SELECT 
            p_target_date, 
            p_store_id, 
            COALESCE(jsonb_agg(row_to_json(p)), '[]'::jsonb)
        FROM public.patio_os p
        WHERE p.store_id = p_store_id;
    END IF;

    -- Iterar sobre as OSs do lote
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_os_batch)
    LOOP
        v_os_number := TRIM(COALESCE(v_item->>'os_number', ''));
        IF v_os_number = '' THEN
            CONTINUE;
        END IF;

        v_plate := NULLIF(TRIM(COALESCE(v_item->>'plate', '')), '');
        v_client_name := NULLIF(TRIM(COALESCE(v_item->>'client_name', '')), '');
        v_total_value := COALESCE((v_item->>'total_value')::numeric, 0);
        v_paid_value := COALESCE((v_item->>'paid_value')::numeric, 0);
        v_payment_method := NULLIF(TRIM(COALESCE(v_item->>'payment_method', '')), '');
        v_status := COALESCE(v_item->>'status', 'em_aberto');
        v_raw_status := NULLIF(TRIM(COALESCE(v_item->>'raw_status', '')), '');
        v_credit_val := COALESCE((v_item->>'credit_value')::numeric, 0);
        v_debit_val := COALESCE((v_item->>'debit_value')::numeric, 0);
        v_pix_val := COALESCE((v_item->>'pix_transfer_value')::numeric, 0);
        v_cash_val := COALESCE((v_item->>'cash_value')::numeric, 0);

        BEGIN
            v_opened_at := (v_item->>'opened_at')::timestamptz;
        EXCEPTION WHEN OTHERS THEN
            v_opened_at := NULL;
        END;

        BEGIN
            v_closed_at := (v_item->>'closed_at')::timestamptz;
        EXCEPTION WHEN OTHERS THEN
            v_closed_at := NULL;
        END;

        BEGIN
            v_last_payment_date := (v_item->>'last_payment_date')::date;
        EXCEPTION WHEN OTHERS THEN
            v_last_payment_date := NULL;
        END;

        -- Buscar estado atual do pátio com row-locking
        SELECT id, total_value, paid_value, credit_value, debit_value, pix_transfer_value, cash_value, history_log, status, raw_status, last_payment_date, client_name, plate
        INTO v_existing_os
        FROM public.patio_os
        WHERE store_id = p_store_id AND os_number = v_os_number
        FOR UPDATE;

        -- Buscar observação já registrada para esta OS nesta mesma data contábil
        SELECT id, credit_before, debit_before, pix_before, paid_before, consumed_credit, consumed_debit, revision_count
        INTO v_existing_obs
        FROM public.os_import_observations
        WHERE store_id = p_store_id AND target_date = p_target_date AND os_number = v_os_number;

        -- Determinar linha de base imutável
        IF v_existing_obs.id IS NOT NULL THEN
            -- Preservar a primeiríssima base válida registrada para a data!
            v_credit_before := COALESCE(v_existing_obs.credit_before, 0);
            v_debit_before := COALESCE(v_existing_obs.debit_before, 0);
            v_pix_before := COALESCE(v_existing_obs.pix_before, 0);
            v_paid_before := COALESCE(v_existing_obs.paid_before, 0);
            v_baseline_source := 'preserved_first_import';
            v_revision_count := COALESCE(v_existing_obs.revision_count, 1) + 1;
        ELSIF v_existing_os.id IS NOT NULL THEN
            -- Primeira importação do dia para uma OS que já existia no pátio
            v_credit_before := COALESCE(v_existing_os.credit_value, 0);
            v_debit_before := COALESCE(v_existing_os.debit_value, 0);
            v_pix_before := COALESCE(v_existing_os.pix_transfer_value, 0);
            v_paid_before := COALESCE(v_existing_os.paid_value, 0);
            v_baseline_source := 'existing_patio';
            v_revision_count := 1;
        ELSE
            -- OS inteiramente nova introduzida hoje
            v_credit_before := 0;
            v_debit_before := 0;
            v_pix_before := 0;
            v_paid_before := 0;
            v_baseline_source := 'first_import';
            v_revision_count := 1;
        END IF;

        -- Calcular deltas reais em relação à base imutável
        v_delta_credit := ROUND((v_credit_val - v_credit_before)::numeric, 2);
        v_delta_debit := ROUND((v_debit_val - v_debit_before)::numeric, 2);
        v_delta_pix := ROUND((v_pix_val - v_pix_before)::numeric, 2);
        v_delta_paid := ROUND((v_paid_value - v_paid_before)::numeric, 2);

        v_is_negative := (v_delta_credit < 0 OR v_delta_debit < 0 OR v_delta_pix < 0 OR v_delta_paid < 0);

        -- Gravar / atualizar observação
        INSERT INTO public.os_import_observations (
            store_id,
            os_number,
            target_date,
            credit_before,
            credit_after,
            delta_credit,
            debit_before,
            debit_after,
            delta_debit,
            pix_before,
            pix_after,
            delta_pix,
            paid_before,
            paid_after,
            delta_paid,
            total_value,
            status,
            client_name,
            plate,
            consumed_credit,
            consumed_debit,
            baseline_source,
            revision_count,
            is_negative_correction,
            updated_at
        ) VALUES (
            p_store_id,
            v_os_number,
            p_target_date,
            v_credit_before,
            v_credit_val,
            v_delta_credit,
            v_debit_before,
            v_debit_val,
            v_delta_debit,
            v_pix_before,
            v_pix_val,
            v_delta_pix,
            v_paid_before,
            v_paid_value,
            v_delta_paid,
            v_total_value,
            v_status,
            COALESCE(v_client_name, v_existing_os.client_name),
            COALESCE(v_plate, v_existing_os.plate),
            COALESCE(v_existing_obs.consumed_credit, 0),
            COALESCE(v_existing_obs.consumed_debit, 0),
            v_baseline_source,
            v_revision_count,
            v_is_negative,
            now()
        )
        ON CONFLICT (store_id, target_date, os_number) DO UPDATE SET
            credit_after = EXCLUDED.credit_after,
            delta_credit = EXCLUDED.delta_credit,
            debit_after = EXCLUDED.debit_after,
            delta_debit = EXCLUDED.delta_debit,
            pix_after = EXCLUDED.pix_after,
            delta_pix = EXCLUDED.delta_pix,
            paid_after = EXCLUDED.paid_after,
            delta_paid = EXCLUDED.delta_paid,
            total_value = EXCLUDED.total_value,
            status = EXCLUDED.status,
            client_name = COALESCE(EXCLUDED.client_name, os_import_observations.client_name),
            plate = COALESCE(EXCLUDED.plate, os_import_observations.plate),
            revision_count = EXCLUDED.revision_count,
            is_negative_correction = EXCLUDED.is_negative_correction,
            updated_at = now();

        v_obs_count := v_obs_count + 1;

        -- Determinar last_payment_date
        IF v_delta_paid > 0 THEN
            v_last_payment_date := p_target_date;
        ELSIF v_existing_os.last_payment_date IS NOT NULL THEN
            v_last_payment_date := v_existing_os.last_payment_date;
        ELSIF v_paid_value > 0 THEN
            v_last_payment_date := p_target_date;
        END IF;

        -- Construir histórico se houve mudanças
        IF v_existing_os.id IS NOT NULL THEN
            v_history := COALESCE(v_existing_os.history_log, '[]'::jsonb);
            IF jsonb_typeof(v_history) <> 'array' THEN
                v_history := '[]'::jsonb;
            END IF;

            v_changes := '[]'::jsonb;
            IF v_existing_os.paid_value <> v_paid_value THEN
                v_changes := v_changes || jsonb_build_object('field', 'paid_value', 'from', v_existing_os.paid_value, 'to', v_paid_value);
            END IF;
            IF v_existing_os.status <> v_status THEN
                v_changes := v_changes || jsonb_build_object('field', 'status', 'from', v_existing_os.status, 'to', v_status);
            END IF;
            IF COALESCE(v_existing_os.credit_value, 0) <> v_credit_val THEN
                v_changes := v_changes || jsonb_build_object('field', 'credit_value', 'from', v_existing_os.credit_value, 'to', v_credit_val);
            END IF;
            IF COALESCE(v_existing_os.debit_value, 0) <> v_debit_val THEN
                v_changes := v_changes || jsonb_build_object('field', 'debit_value', 'from', v_existing_os.debit_value, 'to', v_debit_val);
            END IF;
            IF COALESCE(v_existing_os.pix_transfer_value, 0) <> v_pix_val THEN
                v_changes := v_changes || jsonb_build_object('field', 'pix_transfer_value', 'from', v_existing_os.pix_transfer_value, 'to', v_pix_val);
            END IF;

            IF jsonb_array_length(v_changes) > 0 THEN
                v_new_history := v_history || jsonb_build_object('date', now()::text, 'changes', v_changes);
            ELSE
                v_new_history := v_history;
            END IF;

            -- Atualizar patio_os
            UPDATE public.patio_os SET
                plate = COALESCE(v_plate, patio_os.plate),
                client_name = COALESCE(v_client_name, patio_os.client_name),
                total_value = v_total_value,
                paid_value = v_paid_value,
                payment_method = COALESCE(v_payment_method, patio_os.payment_method),
                status = v_status,
                raw_status = COALESCE(v_raw_status, patio_os.raw_status),
                credit_value = v_credit_val,
                debit_value = v_debit_val,
                pix_transfer_value = v_pix_val,
                cash_value = v_cash_val,
                opened_at = COALESCE(v_opened_at, patio_os.opened_at),
                closed_at = COALESCE(v_closed_at, patio_os.closed_at),
                last_payment_date = v_last_payment_date,
                history_log = v_new_history,
                updated_at = now()
            WHERE id = v_existing_os.id;

            v_updated := v_updated + 1;
        ELSE
            -- Inserir nova OS
            INSERT INTO public.patio_os (
                store_id,
                store_name,
                os_number,
                plate,
                client_name,
                total_value,
                paid_value,
                payment_method,
                status,
                raw_status,
                credit_value,
                debit_value,
                pix_transfer_value,
                cash_value,
                opened_at,
                closed_at,
                last_payment_date,
                history_log,
                created_at,
                updated_at
            ) VALUES (
                p_store_id,
                p_store_name,
                v_os_number,
                v_plate,
                v_client_name,
                v_total_value,
                v_paid_value,
                v_payment_method,
                v_status,
                v_raw_status,
                v_credit_val,
                v_debit_val,
                v_pix_val,
                v_cash_val,
                v_opened_at,
                v_closed_at,
                v_last_payment_date,
                '[]'::jsonb,
                now(),
                now()
            );

            v_inserted := v_inserted + 1;
        END IF;
    END LOOP;

    -- Processar recebíveis se fornecidos
    IF p_receivables IS NOT NULL AND jsonb_array_length(p_receivables) > 0 THEN
        FOR v_rec_item IN SELECT * FROM jsonb_array_elements(p_receivables)
        LOOP
            v_rec_doc := TRIM(COALESCE(v_rec_item->>'document_number', ''));
            IF v_rec_doc = '' THEN CONTINUE; END IF;

            v_rec_customer := TRIM(COALESCE(v_rec_item->>'customer_name', 'Cliente'));
            BEGIN v_rec_due := (v_rec_item->>'due_date')::date; EXCEPTION WHEN OTHERS THEN v_rec_due := p_target_date; END;
            v_rec_amount := COALESCE((v_rec_item->>'amount')::numeric, 0);
            v_rec_orig_amount := COALESCE((v_rec_item->>'original_amount')::numeric, v_rec_amount);
            v_rec_status := COALESCE(v_rec_item->>'status', 'pending');
            v_rec_title := COALESCE(v_rec_item->>'title', 'Duplicata');

            INSERT INTO public.receivables (
                store_id,
                customer_name,
                document_number,
                due_date,
                amount,
                original_amount,
                status,
                title,
                created_at
            ) VALUES (
                p_store_id,
                v_rec_customer,
                v_rec_doc,
                v_rec_due,
                v_rec_amount,
                v_rec_orig_amount,
                v_rec_status,
                v_rec_title,
                now()
            )
            ON CONFLICT (store_id, document_number) DO UPDATE SET
                amount = EXCLUDED.amount,
                status = EXCLUDED.status;
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'store_id', p_store_id,
        'target_date', p_target_date,
        'inserted_count', v_inserted,
        'updated_count', v_updated,
        'observations_count', v_obs_count
    );
END;
$func$;

-- Conceder permissão de execução
GRANT EXECUTE ON FUNCTION public.record_os_import_batch(TEXT, DATE, TEXT, JSONB, JSONB) TO anon, authenticated, service_role;

-- 3. Saneamento Pericial de 30/09/2026: OS 22622 (Mauá/MHE) e Venda Rede 2.327
DO $$
DECLARE
    v_maua_id TEXT := '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f';
    v_pos_id UUID;
BEGIN
    -- Atualizar observação da OS 22622 com a base anterior comprovada de 400.00
    UPDATE public.os_import_observations
    SET 
        credit_before = 400.00,
        credit_after = 2727.00,
        delta_credit = 2327.00,
        paid_before = 400.00,
        paid_after = 2727.00,
        delta_paid = 2327.00,
        consumed_credit = 2327.00,
        baseline_source = 'historical_log_restored',
        updated_at = now()
    WHERE store_id = v_maua_id 
      AND target_date = '2026-09-30' 
      AND os_number = '22622';

    -- Buscar transação da Rede NSU 171670498 (bruto 2.327,00)
    SELECT id INTO v_pos_id
    FROM public.pos_transactions
    WHERE store_id = v_maua_id 
      AND target_date = '2026-09-30'
      AND gross_amount = 2327
      AND machine_name ILIKE '%171670498%'
    LIMIT 1;

    IF v_pos_id IS NOT NULL THEN
        -- Vincular à OS 22622
        UPDATE public.pos_transactions
        SET 
            matched_os_number = '22622',
            settlement_status = 'a_compensar',
            updated_at = now()
        WHERE id = v_pos_id;

        -- Atualizar patio_os
        UPDATE public.patio_os
        SET 
            match_status = 'MATCHED',
            updated_at = now()
        WHERE store_id = v_maua_id AND os_number = '22622';
    END IF;
END $$;
