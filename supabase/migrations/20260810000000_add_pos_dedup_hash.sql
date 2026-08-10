-- Add dedup_hash column to pos_transactions
ALTER TABLE public.pos_transactions ADD COLUMN IF NOT EXISTS dedup_hash TEXT;

-- Create unique index for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS pos_transactions_store_hash_idx ON public.pos_transactions(store_id, dedup_hash);
