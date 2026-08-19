-- Migration: 20260819000000_fix_devolucoes_rede_temporal.sql
-- Description: Adiciona coluna transaction_type em pos_transactions e last_payment_date em patio_os

ALTER TABLE public.pos_transactions 
ADD COLUMN IF NOT EXISTS transaction_type text NOT NULL DEFAULT 'venda' 
CHECK (transaction_type IN ('venda', 'devolucao'));

ALTER TABLE public.patio_os 
ADD COLUMN IF NOT EXISTS last_payment_date date;

CREATE INDEX IF NOT EXISTS idx_patio_os_last_payment_date 
ON public.patio_os (last_payment_date);

CREATE INDEX IF NOT EXISTS idx_pos_transactions_type_date 
ON public.pos_transactions (target_date, transaction_type);
