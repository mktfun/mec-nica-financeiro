-- ============================================================================
-- Migration: 20260831000008_resolve_orphan_saida_ofx.sql
-- Description: RPCs atômicas para resolução de saídas órfãs do OFX e selamento do dia
-- ============================================================================

-- 1. Garante colunas de rastreamento em ofx_transactions
ALTER TABLE public.ofx_transactions
ADD COLUMN IF NOT EXISTS matched_bill_id UUID REFERENCES public.daily_manual_bills(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS manual_category TEXT,
ADD COLUMN IF NOT EXISTS manual_justification TEXT,
ADD COLUMN IF NOT EXISTS contabilizar_no_subtotal BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_ofx_transactions_type_matched_bill 
ON public.ofx_transactions (target_date, type, matched_bill_id);

-- 2. Garante colunas de rastreamento em daily_manual_bills
ALTER TABLE public.daily_manual_bills
ADD COLUMN IF NOT EXISTS is_extra BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_daily_manual_bills_is_extra
ON public.daily_manual_bills (date, is_extra);

-- 3. RPC: resolve_orphan_saida_ofx (Resolução de Saídas Órfãs do OFX)
DROP FUNCTION IF EXISTS public.resolve_orphan_saida_ofx(uuid, text, text, boolean, text, numeric, date, uuid);

CREATE OR REPLACE FUNCTION public.resolve_orphan_saida_ofx(
    p_ofx_id uuid,
    p_category text,
    p_justification text DEFAULT NULL,
    p_contabilizar_no_subtotal boolean DEFAULT false,
    p_store_id text DEFAULT NULL,
    p_amount numeric DEFAULT NULL,
    p_target_date date DEFAULT NULL,
    p_bill_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_bill_id uuid := p_bill_id;
    v_ofx ofx_transactions%ROWTYPE;
BEGIN
    SELECT * INTO v_ofx FROM ofx_transactions WHERE id = p_ofx_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Transação OFX não encontrada.');
    END IF;

    -- Modalidade 1: Vínculo a conta existente
    IF v_bill_id IS NOT NULL THEN
        UPDATE daily_manual_bills
        SET matched_ofx_id = p_ofx_id,
            match_status = 'matched',
            updated_at = now()
        WHERE id = v_bill_id;

        UPDATE ofx_transactions
        SET matched_bill_id = v_bill_id,
            manual_category = p_category,
            manual_justification = p_justification,
            contabilizar_no_subtotal = true,
            updated_at = now()
        WHERE id = p_ofx_id;

        RETURN jsonb_build_object('success', true, 'mode', 'linked_existing', 'bill_id', v_bill_id);
    END IF;

    -- Modalidade 2: Adicionar ao Contas a Pagar (Despesa Extra)
    IF p_contabilizar_no_subtotal THEN
        -- Se já possui uma conta criada anteriormente para este OFX, atualiza
        IF v_ofx.matched_bill_id IS NOT NULL THEN
            UPDATE daily_manual_bills
            SET title = COALESCE(NULLIF(p_justification, ''), title),
                category = COALESCE(p_category, category),
                amount = COALESCE(p_amount, amount),
                contabilizar_no_subtotal = true,
                is_extra = true,
                description = p_justification,
                updated_at = now()
            WHERE id = v_ofx.matched_bill_id;
            v_bill_id := v_ofx.matched_bill_id;
        ELSE
            INSERT INTO daily_manual_bills (
                date,
                store_id,
                title,
                recipient_name,
                amount,
                category,
                description,
                is_extra,
                contabilizar_no_subtotal,
                matched_ofx_id,
                match_status
            ) VALUES (
                COALESCE(p_target_date, v_ofx.target_date, CURRENT_DATE),
                COALESCE(p_store_id, v_ofx.store_id),
                COALESCE(NULLIF(p_justification, ''), v_ofx.counterpart_name, 'Despesa Extra OFX'),
                COALESCE(v_ofx.counterpart_name, 'Fornecedor Avulso'),
                COALESCE(p_amount, ABS(v_ofx.amount)),
                COALESCE(p_category, 'Outras Despesas'),
                p_justification,
                true,
                true,
                p_ofx_id,
                'matched'
            ) RETURNING id INTO v_bill_id;
        END IF;

        UPDATE ofx_transactions
        SET matched_bill_id = v_bill_id,
            manual_category = p_category,
            manual_justification = p_justification,
            contabilizar_no_subtotal = true,
            updated_at = now()
        WHERE id = p_ofx_id;

        RETURN jsonb_build_object('success', true, 'mode', 'created_extra_bill', 'bill_id', v_bill_id);
    END IF;

    -- Modalidade 3: Apenas Justificar (Não-Despesa Operacional)
    -- Se havia conta vinculada, desvincula/desativa no subtotal
    IF v_ofx.matched_bill_id IS NOT NULL THEN
        UPDATE daily_manual_bills
        SET contabilizar_no_subtotal = false,
            match_status = 'unmatched',
            updated_at = now()
        WHERE id = v_ofx.matched_bill_id;
    END IF;

    UPDATE ofx_transactions
    SET manual_category = p_category,
        manual_justification = p_justification,
        contabilizar_no_subtotal = false,
        matched_bill_id = NULL,
        updated_at = now()
    WHERE id = p_ofx_id;

    RETURN jsonb_build_object('success', true, 'mode', 'justified_only');
END;
$$;


-- 4. RPC: close_daily_snapshot (Selamento Idempotente do Fechamento do Dia)
DROP FUNCTION IF EXISTS public.close_daily_snapshot(text, text, jsonb);

CREATE OR REPLACE FUNCTION public.close_daily_snapshot(
    p_date text,
    p_notes text DEFAULT 'Fechamento homologado via Central de Conciliação',
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_date date := COALESCE(p_date::date, CURRENT_DATE);
    v_summary jsonb;
BEGIN
    v_summary := public.get_daily_reconciliation_summary(v_target_date::text, true);

    INSERT INTO public.daily_snapshots (
        date,
        caixa_atual,
        faturamento,
        dinheiro_mp,
        total_recebiveis,
        total_patio,
        saldo_bancario,
        a_receber_manual,
        contas_a_pagar,
        saldo_negativo_itau,
        juros_rede,
        is_closed,
        closed_at,
        notes,
        metadata,
        updated_at
    ) VALUES (
        v_target_date,
        (v_summary->>'caixa_atual')::numeric,
        (v_summary->>'faturamento_periodo')::numeric,
        (v_summary->>'dinheiro_mp')::numeric,
        COALESCE((v_summary->>'dinheiro_mp')::numeric, 0) + COALESCE((v_summary->>'a_receber')::numeric, 0),
        (v_summary->>'na_loja_os')::numeric,
        (v_summary->>'saldo_bancos_ofx')::numeric,
        (v_summary->>'a_receber')::numeric,
        (v_summary->>'contas_manual')::numeric,
        (v_summary->>'saldo_negativo_itau')::numeric,
        (v_summary->>'juros_rede')::numeric,
        true,
        NOW(),
        p_notes,
        jsonb_build_object(
            'caixa_atual', (v_summary->>'caixa_atual')::numeric,
            'caixa_anterior', (v_summary->>'caixa_anterior')::numeric,
            'fluxo_caixa', (v_summary->>'fluxo_caixa')::numeric,
            'faturamento_anterior', (v_summary->>'faturamento_anterior')::numeric,
            'faturamento_oi_base', (v_summary->>'faturamento_oi_base')::numeric,
            'faturamento_ajustes', (v_summary->>'faturamento_ajustes')::numeric,
            'faturamento_periodo', (v_summary->>'faturamento_periodo')::numeric,
            'valor_disp_contas', (v_summary->>'valor_disp_contas')::numeric,
            'contas_base', (v_summary->>'contas_base')::numeric,
            'contas_extras', (v_summary->>'contas_extras')::numeric,
            'contas_manual', (v_summary->>'contas_manual')::numeric,
            'juros_rede', (v_summary->>'juros_rede')::numeric,
            'subtotal_contas', (v_summary->>'subtotal_contas')::numeric,
            'diferenca_final', (v_summary->>'diferenca_final')::numeric,
            'status_geral', (v_summary->>'status_geral'),
            'total_saldo_banco', (v_summary->>'total_saldo_banco')::numeric,
            'saldo_bancos_ofx', (v_summary->>'saldo_bancos_ofx')::numeric,
            'saldo_bancos_positivo', (v_summary->>'saldo_bancos_positivo')::numeric,
            'saldo_negativo_itau', (v_summary->>'saldo_negativo_itau')::numeric,
            'dinheiro_em_lojas', (v_summary->>'dinheiro_em_lojas')::numeric,
            'cartoes_a_compensar', (v_summary->>'cartoes_a_compensar')::numeric,
            'devolucoes_rede', (v_summary->>'devolucoes_rede')::numeric,
            'dinheiro_mp', (v_summary->>'dinheiro_mp')::numeric,
            'a_receber', (v_summary->>'a_receber')::numeric,
            'total_patio', (v_summary->>'na_loja_os')::numeric,
            'is_closed', true
        ) || p_metadata,
        NOW()
    )
    ON CONFLICT (date) DO UPDATE SET
        caixa_atual = EXCLUDED.caixa_atual,
        faturamento = EXCLUDED.faturamento,
        dinheiro_mp = EXCLUDED.dinheiro_mp,
        total_recebiveis = EXCLUDED.total_recebiveis,
        total_patio = EXCLUDED.total_patio,
        saldo_bancario = EXCLUDED.saldo_bancario,
        a_receber_manual = EXCLUDED.a_receber_manual,
        contas_a_pagar = EXCLUDED.contas_a_pagar,
        saldo_negativo_itau = EXCLUDED.saldo_negativo_itau,
        juros_rede = EXCLUDED.juros_rede,
        is_closed = true,
        closed_at = NOW(),
        notes = EXCLUDED.notes,
        metadata = EXCLUDED.metadata,
        updated_at = NOW();

    RETURN jsonb_build_object(
        'success', true,
        'date', v_target_date,
        'is_closed', true,
        'summary', v_summary
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_orphan_saida_ofx TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.close_daily_snapshot TO authenticated, service_role, anon;
