# Proposal: Idempotência do Motor de Conciliação, Conciliação de Saídas OFX x Contas e Justificativa de Despesas Órfãs (322)

## Problema
1. **Dupla Execução Redundante do Motor de Conciliação:** Ao confirmar no Step 3 ("Processar e Conciliar com IA"), o sistema já grava o lote no banco e executa todas as RPCs de matching (`auto_match_transactions`, `auto_match_saidas`, `calculate_daily_conciliation`) e a auditoria com Gemini. Porém, ao atingir o Step 7 e clicar em "Finalizar e Salvar Fechamento", o wizard reexecutava todo o payload de inserção e matching novamente, gerando lentidão e redundância operacional.
2. **Inversão e Ausência de Tratamento de Saídas Órfãs do OFX:** 
   - No `Step2NonRevenueJustifications.tsx`, quando o operador justificava uma *entrada bancária* (`type = 'in'`), o sistema inseria indevidamente em `daily_manual_bills` (transformando receitas em despesas a pagar no DRE e gerando distorções de 1:1 na Diferença Final).
   - Por outro lado, os *débitos bancários* do extrato OFX (`type = 'out'`) que não casavam automaticamente com o `BuscaContasAPagar.xls` ficavam sem tela de justificativa e destinação contábil.

## Solução Proposta (Foco em Reuso e Correção)
1. **Idempotência Estrita da Esteira no `CentralImportWizard.tsx`:**
   - **Ingestão (Step 3 -> Step 4):** Roda a persistência no banco, auto-matching em lote (`auto_match_transactions`, `auto_match_saidas`, `calculate_daily_conciliation`) e auditoria com IA do Gemini **estritamente uma vez**.
   - **Fechamento Final (Step 7):** Substituir a chamada redundante de `handleConfirm` por uma nova RPC canônica de selamento `public.close_daily_snapshot(p_date, p_notes, p_metadata)` que apenas congela o snapshot com `is_closed = true`, sem re-inserir transações nem disparar loops de auto-matching.
2. **Correção e Segregação no `Step2NonRevenueJustifications.tsx`:**
   - **Aba 1: Entradas Órfãs (Receitas / Aportes / Não-Faturamento):** Salva justificativa em `ofx_transactions.manual_category` e `manual_justification` com `impacts_revenue = true/false` (NUNCA insere entradas em `daily_manual_bills`).
   - **Aba 2: Saídas Órfãs (Débitos sem Conta a Pagar):** Exibe débitos bancários não casados e permite:
     - Justificar o motivo e categoria (*Despesa Avulsa / Peças*, *Transferência Entre Lojas*, *Retirada de Sócios / Pró-labore*, *Tarifa Bancária*, *Impostos*).
     - Toggle: *"Adicionar ao Contas a Pagar (Despesa Extra)"* (`adiciona_no_contas = true/false`). Se verdadeiro, cria uma despesa extra em `daily_manual_bills` (`is_extra = true`, `contabilizar_no_subtotal = true`). Se falso (ex: transferências entre filiais, sangrias), apenas justifica a movimentação bancária sem inflar o Subtotal de Contas.
     - Botão de Vínculo Rápido a contas existentes da mesma loja.
3. **Nova RPC Atômica `public.resolve_orphan_saida_ofx` e `public.close_daily_snapshot` (`supabase/migrations/20260831000008_resolve_orphan_saida_ofx.sql`):**
   - Executa a resolução atômica de débitos bancários com isolamento por filial e consistência de row-locking.

## Contratos de Dados & SQL (Supabase)

```sql
-- 1. RPC para resolução de saídas órfãs do OFX
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

        RETURN jsonb_build_object('success', true, 'mode', 'linked_existing');
    END IF;

    -- Modalidade 2: Adicionar ao Contas a Pagar (Despesa Extra)
    IF p_contabilizar_no_subtotal THEN
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
            COALESCE(NULLIF(p_justification, ''), v_ofx.counterpart_name, v_ofx.title, 'Despesa Extra OFX'),
            COALESCE(v_ofx.counterpart_name, v_ofx.title, 'Fornecedor Avulso'),
            COALESCE(p_amount, ABS(v_ofx.amount)),
            COALESCE(p_category, 'Outras Despesas'),
            p_justification,
            true,
            true,
            p_ofx_id,
            'matched'
        ) RETURNING id INTO v_bill_id;

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
    UPDATE ofx_transactions
    SET manual_category = p_category,
        manual_justification = p_justification,
        contabilizar_no_subtotal = false,
        updated_at = now()
    WHERE id = p_ofx_id;

    RETURN jsonb_build_object('success', true, 'mode', 'justified_only');
END;
$$;

-- 2. RPC para selamento definitivo do fechamento (Step 7)
CREATE OR REPLACE FUNCTION public.close_daily_snapshot(
    p_date text,
    p_notes text DEFAULT 'Fechamento homologado via Central de Conciliação',
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_date DATE := COALESCE(p_date::date, CURRENT_DATE);
    v_summary JSONB;
BEGIN
    v_summary := public.get_daily_reconciliation_summary(v_target_date::text, true);

    UPDATE public.daily_snapshots
    SET is_closed = true,
        closed_at = NOW(),
        notes = p_notes,
        metadata = jsonb_build_object(
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
        updated_at = NOW()
    WHERE date = v_target_date;

    RETURN jsonb_build_object(
        'success', true,
        'date', v_target_date,
        'is_closed', true,
        'summary', v_summary
    );
END;
$$;
```

## API & Componentes (Frontend)
- `[MODIFY]` `src/components/importacoes/CentralImportWizard.tsx`: Chamar `close_daily_snapshot` no Step 7 e garantir que o motor de auto-matching e IA rode exatamente uma vez durante a ingestão.
- `[MODIFY]` `src/components/importacoes/wizard/Step2NonRevenueJustifications.tsx`: Adicionar abas `Entradas Órfãs` e `Saídas Órfãs`, remover inserção indevida de créditos em `daily_manual_bills` e implementar suporte completo à resolução de saídas via `resolve_orphan_saida_ofx`.
- `[MODIFY]` `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx`: Delegar `onFinish` para a rotina atômica de finalização.

## Risco Principal e Mitigação
- **Risco:** Uma transferência bancária entre filiais (saída do Itaú Loja 01 para Loja 02) ser marcada indevidamente para adicionar no Contas a Pagar, inflando artificialmente as despesas operacionais da oficina.
- **Mitigação:** Categorias como *"Transferência Entre Lojas"* e *"Aporte / Sangria"* têm o toggle de adicionar no contas desativado por padrão (`defaultImpact = false`), exigindo ação deliberada do operador se quiser converter em despesa real.
