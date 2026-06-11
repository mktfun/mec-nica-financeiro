-- Fix: store_id in the database is TEXT/VARCHAR, not UUID. 
-- The previous functions assumed UUID, causing casting errors with mock string IDs like "st-05".

DROP FUNCTION IF EXISTS delete_import_batch(UUID, TEXT[], BOOLEAN, UUID[], TIMESTAMPTZ[]);

CREATE OR REPLACE FUNCTION delete_import_batch(
    p_store_id TEXT,
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

CREATE OR REPLACE FUNCTION update_reconciliation_bank_total()
RETURNS TRIGGER AS $$
DECLARE
  v_store_id TEXT;
  v_date DATE;
  v_total NUMERIC;
  v_source VARCHAR;
BEGIN
  -- Determine store_id and date based on the operation
  IF TG_OP = 'DELETE' THEN
    v_store_id := OLD.store_id;
    v_date := DATE(OLD.occurred_at);
    v_source := OLD.source;
  ELSE
    v_store_id := NEW.store_id;
    v_date := DATE(NEW.occurred_at);
    v_source := NEW.source;
  END IF;

  -- Only process if it belongs to a store (not global)
  IF v_store_id IS NOT NULL AND v_source = 'ofx' THEN
    -- Calculate the total sum of OFX transactions for this store and date
    -- Credit (type = 'in') is positive, Debit (type = 'out') is negative
    SELECT COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE -amount END), 0)
    INTO v_total
    FROM transactions
    WHERE store_id = v_store_id
      AND DATE(occurred_at) = v_date
      AND source = 'ofx';

    -- Upsert the calculated total into reconciliations
    -- We use an UPSERT (INSERT ... ON CONFLICT) to update or create
    INSERT INTO reconciliations (store_id, date, bank_total, status)
    VALUES (v_store_id, v_date, v_total, 'pending')
    ON CONFLICT (store_id, date)
    DO UPDATE SET bank_total = EXCLUDED.bank_total;
  END IF;

  RETURN NULL; -- AFTER trigger can return NULL
END;
$$ LANGUAGE plpgsql;
