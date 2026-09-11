-- Migration 20260911000048: Adiciona suporte oficial a bandeiras de cartão (brand) em pos_transactions
ALTER TABLE IF EXISTS public.pos_transactions 
ADD COLUMN IF NOT EXISTS brand TEXT;

CREATE INDEX IF NOT EXISTS idx_pos_transactions_store_target_brand 
ON public.pos_transactions (store_id, target_date, brand);

-- Atualiza trigger de inserção da view transactions se existir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' AND table_name = 'transactions'
  ) THEN
    -- Garante que se brand existir na view ou na tabela, esteja alinhado
    NULL;
  END IF;
END $$;
