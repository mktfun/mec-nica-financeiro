-- ==========================================
-- CORREÇÃO DE FOREIGN KEYS DE CONCILIAÇÃO
-- ==========================================

-- 1. Drop das chaves antigas que apontam para manual_transactions (antiga transactions)
ALTER TABLE public.conciliation_matches 
DROP CONSTRAINT IF EXISTS conciliation_matches_ofx_transaction_id_fkey;

ALTER TABLE public.conciliation_matches 
DROP CONSTRAINT IF EXISTS conciliation_matches_rede_transaction_id_fkey;

-- 2. Adição das novas chaves apontando para as tabelas particionadas corretas
ALTER TABLE public.conciliation_matches 
ADD CONSTRAINT conciliation_matches_ofx_transaction_id_fkey 
FOREIGN KEY (ofx_transaction_id) 
REFERENCES public.ofx_transactions(id) 
ON DELETE SET NULL;

ALTER TABLE public.conciliation_matches 
ADD CONSTRAINT conciliation_matches_rede_transaction_id_fkey 
FOREIGN KEY (rede_transaction_id) 
REFERENCES public.pos_transactions(id) 
ON DELETE SET NULL;
