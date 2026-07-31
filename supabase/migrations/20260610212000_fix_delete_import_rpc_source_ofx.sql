CREATE OR REPLACE FUNCTION delete_import_batch(
    p_store_id UUID,
    p_target_dates TEXT[],
    p_is_expense BOOLEAN,
    p_log_ids UUID[],
    p_batch_created_ats TIMESTAMPTZ[] DEFAULT '{}'::TIMESTAMPTZ[]
)
RETURNS VOID AS $$
BEGIN
    IF p_is_expense THEN
        IF p_store_id IS NULL THEN
            DELETE FROM public.transactions 
            WHERE store_id IS NULL 
              AND created_at = ANY(p_batch_created_ats);
        ELSE
            DELETE FROM public.transactions 
            WHERE store_id = p_store_id 
              AND created_at = ANY(p_batch_created_ats);
        END IF;
    ELSE
        IF p_store_id IS NOT NULL THEN
            -- Apaga as originadas do pátio
            DELETE FROM public.transactions
            WHERE store_id = p_store_id
              AND DATE(occurred_at) = ANY(p_target_dates::DATE[])
              AND (title LIKE 'OS #%' OR source = 'ofx');

            DELETE FROM public.receivables
            WHERE store_id = p_store_id
              AND DATE(date) = ANY(p_target_dates::DATE[]);

            DELETE FROM public.reconciliations
            WHERE store_id = p_store_id
              AND DATE(date) = ANY(p_target_dates::DATE[]);

            DELETE FROM public.patio_os
            WHERE store_id = p_store_id
              AND (
                  DATE(closed_at) = ANY(p_target_dates::DATE[])
                  OR status IN ('em_aberto', 'pago_parcial')
              );
        END IF;
    END IF;

    IF p_log_ids IS NOT NULL AND array_length(p_log_ids, 1) > 0 THEN
        DELETE FROM public.import_logs
        WHERE id = ANY(p_log_ids);
    END IF;

END;
$$ LANGUAGE plpgsql;
