CREATE TABLE public.estoque_os_pendente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    numero_os TEXT NOT NULL,
    data_os DATE NOT NULL,
    valor_os NUMERIC NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDENTE', 'PAGA')),
    data_baixa TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.estoque_os_pendente ENABLE ROW LEVEL SECURITY;

-- Policy de Select
CREATE POLICY "Permitir leitura de estoque_os_pendente para usuários autenticados" 
ON public.estoque_os_pendente 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Policy de Insert
CREATE POLICY "Permitir inserção de estoque_os_pendente para usuários autenticados" 
ON public.estoque_os_pendente 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Policy de Update
CREATE POLICY "Permitir update de estoque_os_pendente para usuários autenticados" 
ON public.estoque_os_pendente 
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Policy de Delete (Pode ser útil para reset de Marco Zero)
CREATE POLICY "Permitir delete de estoque_os_pendente para usuários autenticados" 
ON public.estoque_os_pendente 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Index para otimizar busca por loja e status
CREATE INDEX idx_estoque_os_store_status ON public.estoque_os_pendente(store_id, status);
