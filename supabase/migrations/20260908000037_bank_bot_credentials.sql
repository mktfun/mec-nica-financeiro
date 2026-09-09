-- Migration: 20260908000037_bank_bot_credentials.sql
-- Description: Painel de Gerenciamento de Credenciais Bancárias dos Bots de Automação

CREATE TABLE IF NOT EXISTS public.bank_bot_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    bank_code VARCHAR(20) NOT NULL, -- 'itau', 'bradesco', 'santander', 'bb', 'caixa', 'inter'
    bank_name VARCHAR(50) NOT NULL, -- 'Itaú Empresas PJ', 'Bradesco PJ', etc.
    agency VARCHAR(10) NOT NULL,
    account_number VARCHAR(20) NOT NULL,
    operator_cpf VARCHAR(20) NOT NULL,
    encrypted_password TEXT NOT NULL,
    access_type VARCHAR(20) DEFAULT 'full', -- 'full', 'read_only'
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ,
    last_status VARCHAR(50) DEFAULT 'untested', -- 'untested', 'success', 'waiting_itoken', 'failed'
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_bank_bot_credentials UNIQUE(store_id, bank_code, account_number)
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_bank_bot_credentials_store ON public.bank_bot_credentials(store_id);
CREATE INDEX IF NOT EXISTS idx_bank_bot_credentials_bank ON public.bank_bot_credentials(bank_code);
CREATE INDEX IF NOT EXISTS idx_bank_bot_credentials_status ON public.bank_bot_credentials(last_status);

-- Habilitar Row Level Security
ALTER TABLE public.bank_bot_credentials ENABLE ROW LEVEL SECURITY;

-- Política para Administradores
DROP POLICY IF EXISTS "Admins can manage bank_bot_credentials" ON public.bank_bot_credentials;
CREATE POLICY "Admins can manage bank_bot_credentials"
ON public.bank_bot_credentials
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
