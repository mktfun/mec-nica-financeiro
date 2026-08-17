-- Migration: 20260817093000_purge_legacy_pre_marco_zero.sql
-- Description: Purgar transações de testes geradas antes do Marco Zero (13/08/2026).

DELETE FROM public.ofx_transactions WHERE target_date < '2026-08-13';
DELETE FROM public.pos_transactions WHERE target_date < '2026-08-13';
DELETE FROM public.manual_transactions WHERE target_date < '2026-08-13';
DELETE FROM public.reconciliations WHERE date < '2026-08-13';
DELETE FROM public.daily_snapshots WHERE date < '2026-08-13';
