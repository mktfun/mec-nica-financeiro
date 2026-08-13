-- Migration: purge_corrupted_snapshot
-- Description: Purge corrupted data from August 11, 2026

DO $$
BEGIN
    DELETE FROM dashboard_daily_logs WHERE date = '2026-08-11';
    DELETE FROM conciliation_daily_logs WHERE date = '2026-08-11';
    DELETE FROM reconciliations WHERE date = '2026-08-11';
    DELETE FROM transactions WHERE target_date = '2026-08-11' AND source = 'ofx';
END $$;
