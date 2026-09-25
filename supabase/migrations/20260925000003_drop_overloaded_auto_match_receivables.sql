-- Migration: drop overloaded auto_match_receivables to avoid PostgREST ambiguity
DROP FUNCTION IF EXISTS public.auto_match_receivables(p_store_id text, p_date date);
DROP FUNCTION IF EXISTS public.auto_match_receivables(p_date date, p_store_id text);
