-- Migration: Add na_loja_os to reconciliations table
-- This allows historical snapshotting of the "Na Loja OS" (Pending patio OSs)
-- so it doesn't change when viewed retrospectively.

ALTER TABLE public.reconciliations
ADD COLUMN IF NOT EXISTS na_loja_os NUMERIC DEFAULT 0;
