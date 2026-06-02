-- Tabela de Fechamento de Caixa Físico (Dinheiro)
CREATE TABLE IF NOT EXISTS public.cash_registers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    expected_amount NUMERIC NOT NULL DEFAULT 0,
    declared_amount NUMERIC,
    divergence NUMERIC,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' ou 'closed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(store_id, date)
);

-- Políticas de RLS
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for all users" 
ON public.cash_registers 
FOR ALL USING (true);
