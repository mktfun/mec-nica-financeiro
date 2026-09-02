-- ============================================================================
-- Migration: 20260902000020_create_batch_upsert_patio_os.sql
-- Description: RPC batch_upsert_patio_os para ingestão em lote de OSs via Mistral OCR/Vision.
--              Merge não-regressivo de quitação, gravação de métodos de pagamento,
--              sincronização de cofre e cálculo do pátio remanescente da filial.
-- ============================================================================

DROP FUNCTION IF EXISTS public.batch_upsert_patio_os(text, date, jsonb);

CREATE OR REPLACE FUNCTION public.batch_upsert_patio_os(
    p_store_id TEXT,
    p_target_date DATE,
    p_os_records JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_item JSONB;
    v_os_number TEXT;
    v_plate TEXT;
    v_client_name TEXT;
    v_total_val NUMERIC;
    v_paid_val NUMERIC;
    v_credit_val NUMERIC;
    v_debit_val NUMERIC;
    v_pix_val NUMERIC;
    v_cash_val NUMERIC;
    v_raw_status TEXT;
    v_canonical_status TEXT;
    v_opened_at TIMESTAMPTZ;
    v_closed_at TIMESTAMPTZ;
    v_payment_method TEXT;
    
    v_existing RECORD;
    v_store_name TEXT;
    v_final_paid NUMERIC;
    v_final_total NUMERIC;
    v_is_patio_anterior BOOLEAN;
    v_changes JSONB;
    v_history JSONB;
    
    v_count_inserted INT := 0;
    v_count_updated INT := 0;
    v_count_patio_liquidated INT := 0;
    v_count_patio_retained INT := 0;
    v_total_patio_remanescente NUMERIC := 0;
BEGIN
    IF p_store_id IS NULL OR p_target_date IS NULL OR p_os_records IS NULL THEN
        RAISE EXCEPTION 'Parâmetros p_store_id, p_target_date e p_os_records são obrigatórios.';
    END IF;

    -- 1. Resolução do nome da loja
    SELECT name INTO v_store_name FROM public.stores WHERE id = p_store_id;
    IF v_store_name IS NULL THEN
        v_store_name := p_store_id;
    END IF;

    -- 2. Iteração sobre o array JSON de OSs
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_os_records)
    LOOP
        v_os_number := TRIM(COALESCE(v_item->>'os_number', ''));
        IF v_os_number = '' THEN
            CONTINUE;
        END IF;

        v_plate := UPPER(TRIM(COALESCE(v_item->>'plate', 'N/I')));
        v_client_name := TRIM(COALESCE(v_item->>'client_name', 'Cliente'));
        v_total_val := COALESCE((v_item->>'total_value')::numeric, 0);
        v_paid_val := COALESCE((v_item->>'paid_value')::numeric, 0);
        v_credit_val := COALESCE((v_item->>'credit_value')::numeric, (v_item->>'parsed_credit')::numeric, 0);
        v_debit_val := COALESCE((v_item->>'debit_value')::numeric, (v_item->>'parsed_debit')::numeric, 0);
        v_pix_val := COALESCE((v_item->>'pix_transfer_value')::numeric, (v_item->>'parsed_pix_transfer')::numeric, 0);
        v_cash_val := COALESCE((v_item->>'cash_value')::numeric, (v_item->>'parsed_cash')::numeric, 0);
        v_raw_status := COALESCE(v_item->>'raw_status', v_item->>'status', 'Em Aberto');
        v_payment_method := COALESCE(v_item->>'payment_method', 'NÃO INFORMADO');

        -- Resolução de datas
        IF v_item->>'opened_at' IS NOT NULL AND TRIM(v_item->>'opened_at') <> '' THEN
            BEGIN
                v_opened_at := (v_item->>'opened_at')::timestamptz;
            EXCEPTION WHEN OTHERS THEN
                v_opened_at := (p_target_date::text || ' 08:00:00')::timestamptz;
            END;
        ELSE
            v_opened_at := (p_target_date::text || ' 08:00:00')::timestamptz;
        END IF;

        IF v_item->>'closed_at' IS NOT NULL AND TRIM(v_item->>'closed_at') <> '' THEN
            BEGIN
                v_closed_at := (v_item->>'closed_at')::timestamptz;
            EXCEPTION WHEN OTHERS THEN
                v_closed_at := (p_target_date::text || ' 18:00:00')::timestamptz;
            END;
        ELSE
            v_closed_at := NULL;
        END IF;

        -- Normalização de status
        IF LOWER(v_raw_status) IN ('finalizada', 'finalizado', 'faturado', 'concluida', 'concluido', 'pago') 
           OR (v_paid_val >= (v_total_val - 0.05) AND v_total_val > 0) THEN
            v_canonical_status := 'finalizada';
            IF v_closed_at IS NULL THEN
                v_closed_at := (p_target_date::text || ' 18:00:00')::timestamptz;
            END IF;
        ELSIF v_paid_val > 0 AND v_paid_val < (v_total_val - 0.05) THEN
            v_canonical_status := 'pago_parcial';
        ELSE
            v_canonical_status := 'em_aberto';
        END IF;

        -- 3. Verifica existência prévia em patio_os para a mesma filial
        SELECT * INTO v_existing 
        FROM public.patio_os 
        WHERE store_id = p_store_id AND os_number = v_os_number
        FOR UPDATE;

        IF v_existing.id IS NOT NULL THEN
            -- Merge defensivo: quitação prévia nunca regride
            v_final_paid := GREATEST(COALESCE(v_existing.paid_value, 0), v_paid_val);
            v_final_total := GREATEST(COALESCE(v_existing.total_value, 0), v_total_val);
            v_is_patio_anterior := (v_existing.opened_at::date < p_target_date);

            IF v_final_paid >= (v_final_total - 0.05) AND v_final_total > 0 THEN
                v_canonical_status := 'finalizada';
                v_closed_at := COALESCE(v_closed_at, v_existing.closed_at, (p_target_date::text || ' 18:00:00')::timestamptz);
            END IF;

            -- Rastreamento de modificações no history_log
            v_changes := '[]'::jsonb;
            IF COALESCE(v_existing.total_value, 0) <> v_final_total THEN
                v_changes := v_changes || jsonb_build_object('field', 'total_value', 'from', v_existing.total_value, 'to', v_final_total);
            END IF;
            IF COALESCE(v_existing.paid_value, 0) <> v_final_paid THEN
                v_changes := v_changes || jsonb_build_object('field', 'paid_value', 'from', v_existing.paid_value, 'to', v_final_paid);
            END IF;
            IF COALESCE(v_existing.status, '') <> v_canonical_status THEN
                v_changes := v_changes || jsonb_build_object('field', 'status', 'from', v_existing.status, 'to', v_canonical_status);
            END IF;

            v_history := COALESCE(v_existing.history_log, '[]'::jsonb);
            IF jsonb_array_length(v_changes) > 0 THEN
                v_history := v_history || jsonb_build_object('date', now(), 'target_date', p_target_date, 'changes', v_changes);
            END IF;

            UPDATE public.patio_os
            SET 
                total_value = v_final_total,
                paid_value = v_final_paid,
                status = v_canonical_status,
                raw_status = v_raw_status,
                plate = CASE WHEN v_plate <> 'N/I' THEN v_plate ELSE v_existing.plate END,
                client_name = CASE WHEN v_client_name <> 'Cliente' THEN v_client_name ELSE v_existing.client_name END,
                payment_method = COALESCE(v_payment_method, v_existing.payment_method),
                credit_value = GREATEST(COALESCE(v_existing.credit_value, 0), v_credit_val),
                debit_value = GREATEST(COALESCE(v_existing.debit_value, 0), v_debit_val),
                pix_transfer_value = GREATEST(COALESCE(v_existing.pix_transfer_value, 0), v_pix_val),
                cash_value = GREATEST(COALESCE(v_existing.cash_value, 0), v_cash_val),
                closed_at = COALESCE(v_closed_at, v_existing.closed_at),
                last_payment_date = CASE WHEN v_final_paid > COALESCE(v_existing.paid_value, 0) THEN p_target_date ELSE v_existing.last_payment_date END,
                history_log = v_history,
                updated_at = now()
            WHERE id = v_existing.id;

            v_count_updated := v_count_updated + 1;
            IF v_is_patio_anterior THEN
                IF v_canonical_status = 'finalizada' THEN
                    v_count_patio_liquidated := v_count_patio_liquidated + 1;
                ELSE
                    v_count_patio_retained := v_count_patio_retained + 1;
                END IF;
            END IF;
        ELSE
            -- 4. Inserção de Nova OS (sem created_at)
            INSERT INTO public.patio_os (
                store_id,
                store_name,
                os_number,
                client_name,
                plate,
                total_value,
                paid_value,
                credit_value,
                debit_value,
                pix_transfer_value,
                cash_value,
                payment_method,
                status,
                raw_status,
                opened_at,
                closed_at,
                last_payment_date,
                days_open,
                match_status,
                history_log,
                updated_at
            ) VALUES (
                p_store_id,
                v_store_name,
                v_os_number,
                v_client_name,
                v_plate,
                v_total_val,
                v_paid_val,
                v_credit_val,
                v_debit_val,
                v_pix_val,
                v_cash_val,
                v_payment_method,
                v_canonical_status,
                v_raw_status,
                v_opened_at,
                v_closed_at,
                CASE WHEN v_paid_val > 0 THEN p_target_date ELSE NULL END,
                0,
                'PENDENTE',
                jsonb_build_array(jsonb_build_object('date', now(), 'action', 'ocr_ingestion', 'target_date', p_target_date)),
                now()
            );

            v_count_inserted := v_count_inserted + 1;
        END IF;

        -- 5. Sincronização automática com store_cash_vault para OS paga em dinheiro físico
        IF v_cash_val > 0 THEN
            INSERT INTO public.store_cash_vault (
                store_id,
                os_number_ref,
                amount,
                description,
                entry_date,
                status,
                notes
            ) VALUES (
                p_store_id,
                v_os_number,
                v_cash_val,
                format('OS #%s - %s (Dinheiro Espécie)', v_os_number, v_store_name),
                p_target_date,
                'em_transito',
                'Importado via Esteira OCR Oficina Inteligente'
            )
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;

    -- 6. Cálculo do Pátio Remanescente para a Filial
    SELECT COALESCE(SUM(total_value - paid_value), 0) INTO v_total_patio_remanescente
    FROM public.patio_os
    WHERE store_id = p_store_id
      AND status IN ('em_aberto', 'pago_parcial')
      AND opened_at::date <= p_target_date;

    RETURN jsonb_build_object(
        'success', true,
        'store_id', p_store_id,
        'target_date', p_target_date,
        'total_processed', jsonb_array_length(p_os_records),
        'inserted_new_os', v_count_inserted,
        'updated_existing_os', v_count_updated,
        'patio_anterior_liquidado', v_count_patio_liquidated,
        'patio_anterior_retido', v_count_patio_retained,
        'saldo_patio_remanescente', ROUND(v_total_patio_remanescente, 2)
    );
END;
$$;
