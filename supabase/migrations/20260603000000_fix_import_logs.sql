-- 1. Adicionar Unique Constraint na tabela import_logs e permitir store_id nulo (GLOBAL)
ALTER TABLE public.import_logs ALTER COLUMN store_id DROP NOT NULL;

ALTER TABLE public.import_logs
DROP CONSTRAINT IF EXISTS import_logs_store_id_target_date_key;

-- PostgreSQL permite UNIQUE constraint com valores NULL, mas dependendo da versão, 
-- dois NULLs não causam conflito. Para evitar problemas, adicionamos uma constraint
-- que lida com store_id. Na prática, a UI passa 'GLOBAL' ou o id. 
-- Se a coluna estiver como null, o upsert lidará com nulls como distintos.
ALTER TABLE public.import_logs
ADD CONSTRAINT import_logs_store_id_target_date_key UNIQUE NULLS NOT DISTINCT (store_id, target_date);

-- 2. Garantir Políticas de RLS para insert/update/read (supondo ambiente anon)
-- OBS: Adapte de acordo com a estratégia de auth real do seu projeto.
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.import_logs;
CREATE POLICY "Enable read access for all users" ON public.import_logs
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON public.import_logs;
CREATE POLICY "Enable insert access for all users" ON public.import_logs
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON public.import_logs;
CREATE POLICY "Enable update access for all users" ON public.import_logs
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete access for all users" ON public.import_logs;
CREATE POLICY "Enable delete access for all users" ON public.import_logs
    FOR DELETE USING (true);

-- 3. Retroativo: Reconstruir import_logs a partir das transactions existentes
-- Isso agrupa transações de "out" (despesas) ou "OS #" e gera logs baseados nos lotes criados
INSERT INTO public.import_logs (store_id, store_name, target_date, total_os, total_paid_all, total_dinheiro, os_count, receivables_count, created_at)
SELECT 
    t.store_id,
    COALESCE(MAX(t.store_name), MAX(s.name), 'Lote Desconhecido') as store_name,
    DATE(t.occurred_at) as target_date,
    0 as total_os,
    SUM(t.amount) as total_paid_all,
    0 as total_dinheiro,
    0 as os_count,
    0 as receivables_count,
    MAX(t.created_at) as created_at
FROM public.transactions t
LEFT JOIN public.stores s ON s.id = t.store_id
WHERE t.type = 'out' AND t.title != 'Ajuste de Saldo'
GROUP BY t.store_id, DATE(t.occurred_at)
ON CONFLICT (store_id, target_date) DO NOTHING;

-- Nota: Para transações de OS (in), se elas não foram registradas, o script seria similar
INSERT INTO public.import_logs (store_id, store_name, target_date, total_os, total_paid_all, total_dinheiro, os_count, receivables_count, created_at)
SELECT 
    t.store_id,
    COALESCE(MAX(t.store_name), MAX(s.name), 'Lote Desconhecido') as store_name,
    DATE(t.occurred_at) as target_date,
    SUM(t.amount) as total_os,
    SUM(t.amount) as total_paid_all,
    0 as total_dinheiro,
    COUNT(t.id) as os_count,
    0 as receivables_count,
    MAX(t.created_at) as created_at
FROM public.transactions t
LEFT JOIN public.stores s ON s.id = t.store_id
WHERE t.type = 'in' AND t.title LIKE 'OS #%'
GROUP BY t.store_id, DATE(t.occurred_at)
ON CONFLICT (store_id, target_date) DO NOTHING;
