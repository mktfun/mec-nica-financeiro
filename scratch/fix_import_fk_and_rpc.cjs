const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';
const projectRef = 'cnwzsvowkfymtdiryhqc';

const sql = `
-- 1. Foreign Key ON DELETE SET NULL para conciliation_matches -> ofx_transaction_id
ALTER TABLE public.conciliation_matches 
  DROP CONSTRAINT IF EXISTS conciliation_matches_ofx_transaction_id_fkey;

ALTER TABLE public.conciliation_matches 
  ADD CONSTRAINT conciliation_matches_ofx_transaction_id_fkey 
  FOREIGN KEY (ofx_transaction_id) 
  REFERENCES public.transactions(id) 
  ON DELETE SET NULL;

-- 2. Foreign Key ON DELETE SET NULL para conciliation_matches -> rede_transaction_id
ALTER TABLE public.conciliation_matches 
  DROP CONSTRAINT IF EXISTS conciliation_matches_rede_transaction_id_fkey;

ALTER TABLE public.conciliation_matches 
  ADD CONSTRAINT conciliation_matches_rede_transaction_id_fkey 
  FOREIGN KEY (rede_transaction_id) 
  REFERENCES public.transactions(id) 
  ON DELETE SET NULL;

-- 3. Atualizar delete_import_batch RPC para deletar matches PRIMEIRO
CREATE OR REPLACE FUNCTION delete_import_batch(
    p_store_id TEXT,
    p_target_dates TEXT[],
    p_is_expense BOOLEAN,
    p_log_ids UUID[],
    p_batch_created_ats TIMESTAMPTZ[] DEFAULT '{}'::TIMESTAMPTZ[]
)
RETURNS VOID AS $$
BEGIN
    IF p_is_expense THEN
        IF p_store_id IS NULL THEN
            DELETE FROM public.transactions 
            WHERE store_id IS NULL 
              AND created_at = ANY(p_batch_created_ats);
        ELSE
            DELETE FROM public.transactions 
            WHERE store_id = p_store_id 
              AND created_at = ANY(p_batch_created_ats);
        END IF;
    ELSE
        IF p_store_id IS NOT NULL THEN
            -- Deletar matches primeiro para evitar qualquer conflito
            DELETE FROM public.conciliation_matches
            WHERE store_id = p_store_id
              AND (
                  target_date = ANY(p_target_dates)
                  OR EXISTS (
                      SELECT 1 
                      FROM unnest(p_batch_created_ats) b 
                      WHERE public.conciliation_matches.created_at >= (b - INTERVAL '2 minute') 
                        AND public.conciliation_matches.created_at <= (b + INTERVAL '2 minute')
                  )
              );

            DELETE FROM public.transactions
            WHERE store_id = p_store_id
              AND (
                  DATE(occurred_at) = ANY(p_target_dates::DATE[])
                  OR target_date::TEXT = ANY(p_target_dates)
                  OR EXISTS (
                      SELECT 1 
                      FROM unnest(p_batch_created_ats) b 
                      WHERE public.transactions.created_at >= (b - INTERVAL '2 minute') 
                        AND public.transactions.created_at <= (b + INTERVAL '2 minute')
                  )
              )
              AND (title LIKE 'OS #%' OR source IN ('ofx', 'maquininha', 'rede', 'sistema', 'rede_taxa'));

            DELETE FROM public.receivables
            WHERE store_id = p_store_id
              AND date::TEXT = ANY(p_target_dates);

            DELETE FROM public.reconciliations
            WHERE store_id = p_store_id
              AND date::TEXT = ANY(p_target_dates);
              
            DELETE FROM public.reconciliacoes_triplas
            WHERE store_id = p_store_id
              AND EXISTS (
                  SELECT 1 
                  FROM unnest(p_batch_created_ats) b 
                  WHERE public.reconciliacoes_triplas.created_at >= (b - INTERVAL '2 minute') 
                    AND public.reconciliacoes_triplas.created_at <= (b + INTERVAL '2 minute')
              );

            DELETE FROM public.patio_os
            WHERE store_id = p_store_id
              AND (
                  DATE(closed_at) = ANY(p_target_dates::DATE[])
                  OR status IN ('em_aberto', 'pago_parcial')
              );
        END IF;
    END IF;

    IF p_log_ids IS NOT NULL AND array_length(p_log_ids, 1) > 0 THEN
        DELETE FROM public.import_logs WHERE id = ANY(p_log_ids);
    END IF;
END;
$$ LANGUAGE plpgsql;

NOTIFY pgrst, 'reload schema';
`;

async function apply() {
  console.log("Aplicando alteração de FK e RPC delete_import_batch no Supabase...");
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ACCESS_TOKEN}`
    },
    body: JSON.stringify({ query: sql })
  });

  const text = await res.text();
  console.log('Status:', res.status, 'Response:', text);
}

apply();
