-- ============================================================================
-- Migration: 20260903000026_reconciliation_conversations_and_tools.sql
-- Description: Spec 360 - Tabelas de Conversas de Conciliação, Tool Calling
--              e RPC Canônica resolve_orphan_transaction com recálculo instantâneo
-- ============================================================================

-- ============================================================================
-- 1. TABELAS CANÔNICAS DE CONVERSAS E MENSAGENS (COM PERSISTÊNCIA TEMPORAL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_date DATE NOT NULL DEFAULT CURRENT_DATE,
    title TEXT DEFAULT 'Conciliação Diária',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir colunas se tabela já existir
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS target_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_conversations_target_date ON public.conversations(target_date);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    tool_invocations JSONB,
    parts JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir colunas se já existir
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS tool_invocations JSONB;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS parts JSONB;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_role_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_role_check 
    CHECK (role IN ('user', 'assistant', 'system', 'tool', 'data'));

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id, created_at ASC);

-- Ativar RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_read_conversations" ON public.conversations;
CREATE POLICY "allow_read_conversations" ON public.conversations FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_manage_conversations" ON public.conversations;
CREATE POLICY "allow_manage_conversations" ON public.conversations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_read_messages" ON public.messages;
CREATE POLICY "allow_read_messages" ON public.messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_manage_messages" ON public.messages;
CREATE POLICY "allow_manage_messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);


-- ============================================================================
-- 2. RPC ATÔMICA PARA AJUSTE DE FATURAMENTO CORPORATIVO (DRE)
-- ============================================================================

DROP FUNCTION IF EXISTS public.upsert_daily_revenue_adjustment(date, text, numeric, text, text, text, uuid);

CREATE OR REPLACE FUNCTION public.upsert_daily_revenue_adjustment(
    p_date DATE,
    p_title TEXT,
    p_amount NUMERIC,
    p_type TEXT DEFAULT 'aporte',
    p_description TEXT DEFAULT NULL,
    p_store_id TEXT DEFAULT NULL,
    p_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_adj_id UUID := COALESCE(p_id, gen_random_uuid());
    v_rec RECORD;
BEGIN
    IF p_date IS NULL OR p_title IS NULL OR p_amount IS NULL THEN
        RAISE EXCEPTION 'Parâmetros date, title e amount são obrigatórios.';
    END IF;

    INSERT INTO public.daily_revenue_adjustments (
        id, date, title, description, type, amount, store_id, created_at
    ) VALUES (
        v_adj_id,
        p_date,
        TRIM(p_title),
        p_description,
        COALESCE(p_type, 'outros'),
        p_amount,
        p_store_id,
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        type = EXCLUDED.type,
        amount = EXCLUDED.amount,
        store_id = EXCLUDED.store_id;

    SELECT * INTO v_rec FROM public.daily_revenue_adjustments WHERE id = v_adj_id;

    RETURN jsonb_build_object(
        'success', true,
        'adjustment', to_jsonb(v_rec)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_daily_revenue_adjustment TO authenticated, service_role, anon;


-- ============================================================================
-- 3. RPC WRAPPER CANÔNICA: resolve_orphan_transaction
--    Executa a resolução em 4 modos e recalcula o Delta consolidado instantaneamente
-- ============================================================================

DROP FUNCTION IF EXISTS public.resolve_orphan_transaction(uuid, text, jsonb);

CREATE OR REPLACE FUNCTION public.resolve_orphan_transaction(
    p_tx_id UUID,
    p_action TEXT, -- 'link_os' | 'revenue_adjustment' | 'expense_bill' | 'justify_only'
    p_params JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ofx RECORD;
    v_pos RECORD;
    v_result JSONB;
    v_target_date DATE;
    v_store_id TEXT;
    v_amount NUMERIC;
    v_summary JSONB;
BEGIN
    IF p_tx_id IS NULL OR p_action IS NULL THEN
        RAISE EXCEPTION 'ID da transação e action são obrigatórios.';
    END IF;

    -- Localiza a transação em OFX ou POS
    SELECT * INTO v_ofx FROM public.ofx_transactions WHERE id = p_tx_id;
    IF v_ofx.id IS NOT NULL THEN
        v_target_date := COALESCE(v_ofx.target_date, v_ofx.occurred_at::date);
        v_store_id := v_ofx.store_id;
        v_amount := ABS(v_ofx.amount);
    ELSE
        SELECT * INTO v_pos FROM public.pos_transactions WHERE id = p_tx_id;
        IF v_pos.id IS NOT NULL THEN
            v_target_date := COALESCE(v_pos.target_date, v_pos.occurred_at::date);
            v_store_id := v_pos.store_id;
            v_amount := COALESCE(v_pos.net_amount, v_pos.gross_amount);
        ELSE
            RAISE EXCEPTION 'Transação não encontrada para o ID %.', p_tx_id;
        END IF;
    END IF;

    -- 1. AÇÃO: VÍNCULO A OS (CRÉDITO OFX / PIX OU POS)
    IF p_action = 'link_os' THEN
        v_result := public.create_and_link_manual_os(
            CASE WHEN v_ofx.id IS NOT NULL THEN 'ofx' ELSE 'rede' END,
            p_tx_id,
            COALESCE(p_params->>'store_id', v_store_id),
            p_params->>'os_number',
            p_params->>'client_name',
            p_params->>'plate',
            (p_params->>'total_value')::numeric,
            p_params->>'payment_method',
            COALESCE((p_params->>'link_amount')::numeric, v_amount)
        );

    -- 2. AÇÃO: AJUSTE DE FATURAMENTO CORPORATIVO (DRE / NÃO-OS)
    ELSIF p_action = 'revenue_adjustment' THEN
        UPDATE public.ofx_transactions
        SET manual_category = COALESCE(p_params->>'category', 'Receita Avulsa'),
            manual_justification = COALESCE(p_params->>'justification', 'Ajuste justificado pelo Agente Conciliador'),
            updated_at = now()
        WHERE id = p_tx_id;

        v_result := public.upsert_daily_revenue_adjustment(
            v_target_date,
            COALESCE(p_params->>'category', 'Receita Avulsa'),
            COALESCE((p_params->>'amount')::numeric, v_amount),
            COALESCE(p_params->>'type', 'aporte'),
            COALESCE(p_params->>'justification', 'Ajuste corporativo via IA'),
            COALESCE(p_params->>'store_id', v_store_id),
            p_tx_id
        );

    -- 3. AÇÃO: DESPESA EXTRA DE SAÍDA (OFX -> Contas a Pagar)
    ELSIF p_action = 'expense_bill' THEN
        v_result := public.resolve_orphan_saida_ofx(
            p_tx_id,
            COALESCE(p_params->>'category', 'Despesa Extra'),
            p_params->>'justification',
            true, -- contabilizar no subtotal
            COALESCE(p_params->>'store_id', v_store_id),
            COALESCE((p_params->>'amount')::numeric, v_amount),
            v_target_date,
            CASE WHEN (p_params->>'bill_id') IS NOT NULL AND (p_params->>'bill_id') != '' 
                 THEN (p_params->>'bill_id')::uuid ELSE NULL END
        );

    -- 4. AÇÃO: APENAS JUSTIFICAR (NÃO OPERACIONAL / TARIFAS / TRANSFERÊNCIA HOLDING)
    ELSIF p_action = 'justify_only' THEN
        IF v_ofx.id IS NOT NULL AND v_ofx.type = 'out' THEN
            v_result := public.resolve_orphan_saida_ofx(
                p_tx_id,
                COALESCE(p_params->>'category', 'Outras Despesas'),
                p_params->>'justification',
                false, -- não contabilizar no subtotal
                COALESCE(p_params->>'store_id', v_store_id),
                COALESCE((p_params->>'amount')::numeric, v_amount),
                v_target_date,
                NULL
            );
        ELSE
            v_result := public.categorize_orphan_transaction(
                p_tx_id,
                COALESCE(p_params->>'category', 'Justificado'),
                COALESCE(p_params->>'justification', 'Justificativa sem impacto financeiro')
            );
        END IF;
    ELSE
        RAISE EXCEPTION 'Ação desconhecida: %. Use link_os, revenue_adjustment, expense_bill ou justify_only.', p_action;
    END IF;

    -- Recalcula o delta consolidado dinamicamente para retorno em tempo real
    v_summary := public.get_daily_reconciliation_summary(v_target_date::text, true);

    RETURN jsonb_build_object(
        'success', true,
        'action_executed', p_action,
        'action_details', v_result,
        'new_diferenca_final', v_summary->'diferenca_final',
        'new_status_geral', v_summary->'status_geral',
        'fast_path_eligible', v_summary->'fast_path_eligible',
        'reconciliation_summary', v_summary
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_orphan_transaction TO authenticated, service_role, anon;
