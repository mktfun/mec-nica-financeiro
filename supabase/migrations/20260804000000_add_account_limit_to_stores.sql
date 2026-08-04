-- Add account_limit column to stores table
ALTER TABLE stores ADD COLUMN IF NOT EXISTS account_limit numeric DEFAULT NULL;
