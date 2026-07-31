-- Migration: Enrich patio_os with raw payment breakdown and original status
-- Adds: raw_status, credit_debit_value, pix_transfer_value

ALTER TABLE patio_os
  ADD COLUMN IF NOT EXISTS raw_status text,
  ADD COLUMN IF NOT EXISTS credit_debit_value numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pix_transfer_value numeric DEFAULT 0;

COMMENT ON COLUMN patio_os.raw_status IS 'Original status text from the OS spreadsheet (e.g. "Finalizada", "Faturado", "Em Aberto")';
COMMENT ON COLUMN patio_os.credit_debit_value IS 'Amount paid via credit/debit card (parsed from payment_method column)';
COMMENT ON COLUMN patio_os.pix_transfer_value IS 'Amount paid via PIX, transfer or deposit (parsed from payment_method column)';
