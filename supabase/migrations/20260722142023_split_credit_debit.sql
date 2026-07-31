-- Migration to split credit and debit from credit_debit_value

ALTER TABLE patio_os ADD COLUMN IF NOT EXISTS credit_value numeric(10,2) DEFAULT 0;
ALTER TABLE patio_os ADD COLUMN IF NOT EXISTS debit_value numeric(10,2) DEFAULT 0;

-- Copy existing credit_debit_value to credit_value for now to avoid losing history
UPDATE patio_os SET credit_value = credit_debit_value WHERE credit_debit_value IS NOT NULL AND credit_debit_value > 0;

-- We don't drop credit_debit_value immediately to avoid breaking running clients until backend is fully deployed
-- But we can remove it from types and inserts
