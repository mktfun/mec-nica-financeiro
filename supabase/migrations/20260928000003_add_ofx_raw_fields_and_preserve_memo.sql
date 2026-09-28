-- ============================================================================
-- Migration: 20260928000003_add_ofx_raw_fields_and_preserve_memo.sql
-- Spec 442: Preservar e Exibir o MEMO de Boletos e SISPAG do OFX
-- ============================================================================

ALTER TABLE public.ofx_transactions 
ADD COLUMN IF NOT EXISTS raw_memo TEXT NULL,
ADD COLUMN IF NOT EXISTS raw_name TEXT NULL,
ADD COLUMN IF NOT EXISTS bank_reference TEXT NULL,
ADD COLUMN IF NOT EXISTS original_fitid TEXT NULL;

COMMENT ON COLUMN public.ofx_transactions.raw_memo IS 'Conteúdo bruto original da tag <MEMO> do extrato OFX';
COMMENT ON COLUMN public.ofx_transactions.raw_name IS 'Conteúdo bruto original da tag <NAME> do extrato OFX';
COMMENT ON COLUMN public.ofx_transactions.bank_reference IS 'Número de referência bancária (<CHECKNUM> ou documento do lançamento)';
COMMENT ON COLUMN public.ofx_transactions.original_fitid IS 'FITID original fornecido pelo banco no arquivo OFX';
