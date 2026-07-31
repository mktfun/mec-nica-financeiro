-- Tabela de Metas (Goals)
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id TEXT NOT NULL,
    target_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    current_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Auditoria do Bot (Dead Letter Queue / Logs)
CREATE TABLE IF NOT EXISTS bot_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'warning')),
    message TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionando UNIQUE Constraint em external_id na tabela transactions se existir, 
-- senao criamos a coluna e aplicamos. (Supondo que external_id já deva existir ou a criamos agora)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'external_id') THEN
        ALTER TABLE transactions ADD COLUMN external_id TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'transactions_external_id_key'
    ) THEN
        ALTER TABLE transactions ADD CONSTRAINT transactions_external_id_key UNIQUE (external_id);
    END IF;
END $$;
