ALTER TABLE reconciliations 
ADD COLUMN IF NOT EXISTS previous_balance NUMERIC;
