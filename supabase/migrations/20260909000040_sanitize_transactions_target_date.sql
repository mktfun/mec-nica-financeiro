-- Migration 20260909000040_sanitize_transactions_target_date.sql
-- Saneamento determinístico do target_date para refletir a data real de ocorrência

-- 1. Realinhar target_date com occurred_at::date::text em ofx_transactions
UPDATE public.ofx_transactions
SET target_date = (occurred_at AT TIME ZONE 'America/Sao_Paulo')::date::text
WHERE occurred_at IS NOT NULL
  AND target_date IS DISTINCT FROM (occurred_at AT TIME ZONE 'America/Sao_Paulo')::date::text;

-- 2. Realinhar target_date com occurred_at::date::text em pos_transactions se houver distorção
UPDATE public.pos_transactions
SET target_date = (occurred_at AT TIME ZONE 'America/Sao_Paulo')::date::text
WHERE occurred_at IS NOT NULL
  AND target_date IS DISTINCT FROM (occurred_at AT TIME ZONE 'America/Sao_Paulo')::date::text;
