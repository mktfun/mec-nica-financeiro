-- Migration: Add trigger to automatically calculate and update bank_total in reconciliations

CREATE OR REPLACE FUNCTION update_reconciliation_bank_total()
RETURNS TRIGGER AS $$
DECLARE
  v_store_id UUID;
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

DROP TRIGGER IF EXISTS trg_update_bank_total ON transactions;

CREATE TRIGGER trg_update_bank_total
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_reconciliation_bank_total();
