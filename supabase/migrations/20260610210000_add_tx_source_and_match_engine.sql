-- Migration: Add source column to transactions and match_bank_transactions RPC

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS source VARCHAR DEFAULT 'system';

-- Update existing records to 'system' just to be safe
UPDATE transactions SET source = 'system' WHERE source IS NULL;

-- Create Stored Procedure (RPC) to match bank transactions
CREATE OR REPLACE FUNCTION match_bank_transactions(p_store_id UUID, p_date DATE)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_ofx_record RECORD;
  v_system_record RECORD;
  v_matched BOOLEAN;
BEGIN
  -- 1. For each SYSTEM transaction of p_date, find if there is a matching OFX (Bank) transaction in p_date or p_date + 1
  FOR v_system_record IN
    SELECT * FROM transactions
    WHERE store_id = p_store_id
      AND DATE(occurred_at) = p_date
      AND source = 'system'
  LOOP
    v_matched := FALSE;

    -- Look for OFX in D+0 or D+1 with max 10.00 difference
    FOR v_ofx_record IN
      SELECT * FROM transactions
      WHERE store_id = p_store_id
        AND DATE(occurred_at) >= p_date
        AND DATE(occurred_at) <= p_date + INTERVAL '1 day'
        AND source = 'ofx'
        AND type = v_system_record.type
        AND ABS(amount - v_system_record.amount) <= 10
      LIMIT 1
    LOOP
      v_matched := TRUE;
    END LOOP;

    -- If not matched, system transaction not showing up in the bank
    IF NOT v_matched THEN
      INSERT INTO alerts (
        store_id,
        store_name,
        title,
        description,
        severity,
        amount,
        date,
        resolved,
        created_at
      )
      VALUES (
        p_store_id,
        v_system_record.store_name,
        'Transação do sistema não encontrada no banco',
        'Foi identificada uma transação no sistema (' || v_system_record.title || ') sem correspondência no extrato bancário (D+0 ou D+1).',
        'warning',
        v_system_record.amount,
        p_date,
        false,
        NOW()
      );
    END IF;
  END LOOP;

  -- 2. For each OFX transaction of p_date, find if there is a matching SYSTEM transaction in p_date or p_date - 1
  FOR v_ofx_record IN
    SELECT * FROM transactions
    WHERE store_id = p_store_id
      AND DATE(occurred_at) = p_date
      AND source = 'ofx'
  LOOP
    v_matched := FALSE;

    -- Look for SYSTEM in D-1 or D+0 with max 10.00 difference
    FOR v_system_record IN
      SELECT * FROM transactions
      WHERE store_id = p_store_id
        AND DATE(occurred_at) >= p_date - INTERVAL '1 day'
        AND DATE(occurred_at) <= p_date
        AND source = 'system'
        AND type = v_ofx_record.type
        AND ABS(amount - v_ofx_record.amount) <= 10
      LIMIT 1
    LOOP
      v_matched := TRUE;
    END LOOP;

    -- If not matched, bank transaction that doesn't exist in the system
    IF NOT v_matched THEN
      INSERT INTO alerts (
        store_id,
        store_name,
        title,
        description,
        severity,
        amount,
        date,
        resolved,
        created_at
      )
      VALUES (
        p_store_id,
        v_ofx_record.store_name,
        'Transação bancária não encontrada no sistema',
        'Foi identificada uma transação bancária (' || v_ofx_record.title || ') sem correspondência no sistema (D-1 ou D+0).',
        'critical',
        v_ofx_record.amount,
        p_date,
        false,
        NOW()
      );
    END IF;
  END LOOP;

END;
$$;
