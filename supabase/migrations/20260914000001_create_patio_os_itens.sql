-- Migration: Create patio_os_itens
-- Created: 20260914000001
-- Description: Detalhamento de itens de OS (Peças e Serviços) por filial sem afetar conciliação ou snapshots

CREATE TABLE IF NOT EXISTS public.patio_os_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_number VARCHAR(50) NOT NULL,
    store_id VARCHAR(50) REFERENCES public.stores(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL,                        -- 'PRODUTO' ou 'SERVICO'
    codigo VARCHAR(50),
    referencia VARCHAR(50),
    descricao TEXT NOT NULL,
    quantidade NUMERIC(10,2) NOT NULL DEFAULT 1,
    valor_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
    valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    executor VARCHAR(100),                            -- Nome do mecânico alocado
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices B-Tree para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_patio_os_itens_os_store ON public.patio_os_itens(os_number, store_id);
CREATE INDEX IF NOT EXISTS idx_patio_os_itens_tipo ON public.patio_os_itens(tipo);

-- Comentários de documentação
COMMENT ON TABLE public.patio_os_itens IS 'Itens detalhados de peças e mão de obra de OSs abertas no pátio';
COMMENT ON COLUMN public.patio_os_itens.executor IS 'Nome do mecânico responsável pelo serviço ou apontamento da peça';
