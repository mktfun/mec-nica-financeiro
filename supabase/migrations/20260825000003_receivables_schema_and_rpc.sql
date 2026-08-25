-- Migration: 20260825000003_receivables_schema_and_rpc.sql
-- Description: Expande schema de receivables com colunas estruturadas, índices de deduplicação e atualiza get_daily_reconciliation_summary

-- 1. Expansão do Schema da Tabela receivables
ALTER TABLE public.receivables
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS os_number TEXT,
ADD COLUMN IF NOT EXISTS installment TEXT,
ADD COLUMN IF NOT EXISTS paid_value NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS discount_value NUMERIC(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS interest_value NUMERIC(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS matched_ofx_id UUID REFERENCES public.ofx_transactions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Limpeza de Duplicatas e Criação do Índice Único de Deduplicação
DELETE FROM public.receivables a
USING public.receivables b
WHERE a.id > b.id
  AND a.store_id = b.store_id
  AND COALESCE(a.description, '') = COALESCE(b.description, '')
  AND a.due_date = b.due_date
  AND a.value = b.value;

DROP INDEX IF EXISTS idx_receivables_dedup;
CREATE UNIQUE INDEX IF NOT EXISTS idx_receivables_dedup 
ON public.receivables (
    store_id, 
    COALESCE(os_number, ''), 
    COALESCE(installment, ''), 
    COALESCE(description, ''), 
    due_date, 
    value
);

CREATE INDEX IF NOT EXISTS idx_receivables_store_due ON public.receivables(store_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_receivables_date_status ON public.receivables(date, status);

-- 3. Atualização da RPC get_daily_reconciliation_summary
CREATE OR REPLACE FUNCTION public.get_daily_reconciliation_summary(
    p_date date,
    p_force_dynamic boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    v_target_date date := p_date;
    v_snapshot record;
    v_faturamento_anterior numeric := 0;
    v_faturamento_oi_base numeric := 0;
    v_faturamento_ajustes numeric := 0;
    v_faturamento_periodo numeric := 0;
    v_caixa_anterior numeric := 0;
    v_saldo_bancos numeric := 0;
    v_saldo_negativo_itau numeric := 0;
    v_dinheiro_em_lojas numeric := 0;
    v_cartoes_a_compensar numeric := 0;
    v_total_saldo_banco numeric := 0;
    v_dinheiro_mp numeric := 0;
    v_a_receber numeric := 0;
    v_na_loja_os numeric := 0;
    v_caixa_atual numeric := 0;
    v_fluxo_caixa numeric := 0;
    v_valor_disp_contas numeric := 0;
    v_contas_base numeric := 0;
    v_contas_extras numeric := 0;
    v_contas_manual numeric := 0;
    v_juros_rede numeric := 0;
    v_devolucoes_rede numeric := 0;
    v_subtotal_contas numeric := 0;
    v_diferenca_final numeric := 0;
    v_triple jsonb;
    v_stores_list jsonb := '[]'::jsonb;
    v_faturamento_itens jsonb := '[]'::jsonb;
    v_total_entradas_ofx numeric := 0;
    v_total_saidas_ofx numeric := 0;
    v_prev_snapshot record;
BEGIN
    IF v_target_date IS NULL THEN
        RAISE EXCEPTION 'p_date deve ser informado.';
    END IF;

    -- Snapshot do dia atual
    SELECT * INTO v_snapshot
    FROM daily_snapshots
    WHERE date = v_target_date;

    -- RAMAL 1: DIA FECHADO E HOMOLOGADO (Period Close Locking)
    IF v_snapshot.id IS NOT NULL AND v_snapshot.is_closed = true AND p_force_dynamic = false THEN
        -- Busca faturamento anterior para exibição
        SELECT faturamento INTO v_faturamento_anterior
        FROM daily_snapshots
        WHERE date < v_target_date AND faturamento > 0
        ORDER BY date DESC
        LIMIT 1;

        SELECT caixa_atual INTO v_caixa_anterior
        FROM daily_snapshots
        WHERE date < v_target_date AND caixa_atual > 0
        ORDER BY date DESC
        LIMIT 1;

        v_triple := get_store_pos_triple_reconciliation(v_target_date);
        
        -- Monta lista das lojas com base nos dados registrados
        SELECT jsonb_agg(
            jsonb_build_object(
                'store_id', s.id,
                'store_name', s.name,
                'saldo_banco_ofx', COALESCE(r.bank_total, 0),
                'saldo_banco', COALESCE(r.bank_total, 0),
                'nao_entrou_valor', 0,
                'status_compensacao', 'entrou',
                'cartoes_a_compensar', 0,
                'pix_os_ofx', COALESCE(r.pix_total, 0),
                'maquininha', COALESCE(r.rede_total, 0),
                'pix', COALESCE(r.pix_total, 0),
                'na_loja_os', COALESCE(r.na_loja_os, 0),
                'patio_os', COALESCE(r.na_loja_os, 0),
                'previsto_ofx', COALESCE(r.bank_total, 0),
                'diferenca', 0,
                'status', COALESCE(r.status, 'approved')
            )
        )
        INTO v_stores_list
        FROM stores s
        LEFT JOIN reconciliations r ON r.store_id = s.id AND r.date = v_target_date
        WHERE s.active = true;

        RETURN jsonb_build_object(
            'date', v_target_date,
            'is_closed', true,
            'closed_at', v_snapshot.closed_at,
            'caixa_atual', v_snapshot.caixa_atual,
            'caixa_anterior', COALESCE(v_caixa_anterior, 0),
            'fluxo_caixa', COALESCE((v_snapshot.metadata->>'fluxo_caixa')::numeric, 0),
            'faturamento_periodo', COALESCE((v_snapshot.metadata->>'faturamento_liquido')::numeric, 0),
            'faturamento_oi_base', COALESCE((v_snapshot.metadata->>'faturamento_liquido')::numeric, 0),
            'faturamento_ajustes', COALESCE(v_snapshot.faturamento_outros_valor, 0),
            'faturamento_itens', '[]'::jsonb,
            'valor_disp_contas', COALESCE((v_snapshot.metadata->>'valor_disp_contas')::numeric, 0),
            'contas_base', COALESCE(v_snapshot.contas_a_pagar, 0),
            'contas_extras', 0,
            'contas_manual', COALESCE(v_snapshot.contas_a_pagar, 0),
            'juros_rede', COALESCE(v_snapshot.juros_rede, 0),
            'devolucoes_rede', 0,
            'subtotal_contas', COALESCE((v_snapshot.metadata->>'subtotal_contas')::numeric, 0),
            'diferenca_final', COALESCE((v_snapshot.metadata->>'diferenca_final')::numeric, 0),
            'total_saldo_banco', COALESCE(v_snapshot.saldo_bancario, 0),
            'saldo_bancos_ofx', COALESCE(v_snapshot.saldo_bancario, 0),
            'dinheiro_em_lojas', 0,
            'cartoes_a_compensar', 0,
            'dinheiro_mp', COALESCE(v_snapshot.dinheiro_mp, 0),
            'a_receber', COALESCE(v_snapshot.a_receber_manual, 0),
            'na_loja_os', COALESCE(v_snapshot.total_patio, 0),
            'total_entradas_ofx', 0,
            'total_saidas_ofx', 0,
            'stores', COALESCE(v_stores_list, '[]'::jsonb)
        );
    END IF;

    -- RAMAL 2: DIA ABERTO OU FORÇADO DINÂMICO
    -- 1. Faturamento acumulado anterior e caixa anterior
    SELECT faturamento, caixa_atual INTO v_prev_snapshot
    FROM daily_snapshots
    WHERE date < v_target_date AND caixa_atual > 0
    ORDER BY date DESC
    LIMIT 1;

    v_faturamento_anterior := COALESCE(v_prev_snapshot.faturamento, 0);
    v_caixa_anterior := COALESCE(v_prev_snapshot.caixa_atual, 0);

    -- 2. Faturamento Base do Dia (Odômetro)
    IF v_snapshot.faturamento IS NOT NULL THEN
        IF v_faturamento_anterior > 0 AND v_snapshot.faturamento > v_faturamento_anterior THEN
            v_faturamento_oi_base := v_snapshot.faturamento - v_faturamento_anterior;
        ELSE
            v_faturamento_oi_base := v_snapshot.faturamento;
        END IF;
    ELSE
        v_faturamento_oi_base := 0;
    END IF;

    -- 3. Faturamento Ajustes
    SELECT 
        COALESCE(SUM(amount), 0),
        jsonb_agg(jsonb_build_object(
            'id', id,
            'title', title,
            'amount', amount,
            'type', type,
            'description', description
        ))
    INTO v_faturamento_ajustes, v_faturamento_itens
    FROM daily_revenue_adjustments
    WHERE date = v_target_date;

    IF v_faturamento_itens IS NULL THEN
        v_faturamento_itens := '[]'::jsonb;
    END IF;

    v_faturamento_periodo := v_faturamento_oi_base + v_faturamento_ajustes;

    -- 4. Tripla Conciliação de Maquininhas
    v_triple := get_store_pos_triple_reconciliation(v_target_date);
    v_cartoes_a_compensar := COALESCE((v_triple->>'total_nao_entrou')::numeric, 0);
    v_juros_rede := COALESCE((v_triple->>'total_rede_taxas')::numeric, 0);
    v_devolucoes_rede := COALESCE((v_triple->>'total_devolucoes')::numeric, 0);

    -- 5. Dinheiro em Cofre das Lojas com consistência temporal UTC-3
    SELECT COALESCE(SUM(amount), 0)
    INTO v_dinheiro_em_lojas
    FROM store_cash_vault
    WHERE entry_date <= v_target_date
      AND (
          status = 'em_transito'
          OR (status = 'depositado' AND (deposited_at IS NULL OR (deposited_at AT TIME ZONE 'America/Sao_Paulo')::date > v_target_date))
      );

    -- 6. Saldos Bancários OFX
    SELECT 
        COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE -amount END), 0),
        COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END), 0)
    INTO v_saldo_bancos, v_total_entradas_ofx, v_total_saidas_ofx
    FROM ofx_transactions
    WHERE target_date = v_target_date;

    IF v_saldo_bancos = 0 AND v_snapshot.saldo_bancario IS NOT NULL THEN
        v_saldo_bancos := v_snapshot.saldo_bancario;
    END IF;

    -- Total Saldo Banco (Pilar 1)
    v_total_saldo_banco := v_saldo_bancos + v_dinheiro_em_lojas + v_cartoes_a_compensar;

    -- 7. Dinheiro MP (Pilar 2)
    v_dinheiro_mp := COALESCE(v_snapshot.dinheiro_mp, 0);

    -- 8. A Receber (Pilar 3) com agregação dinâmica da tabela receivables com fallback
    SELECT COALESCE(SUM(value), 0)
    INTO v_a_receber
    FROM public.receivables
    WHERE date <= v_target_date
      AND (
          status = 'pendente'
          OR (status = 'recebido' AND (received_at AT TIME ZONE 'America/Sao_Paulo')::date > v_target_date)
      );

    IF v_a_receber = 0 AND v_snapshot.a_receber_manual IS NOT NULL AND v_snapshot.a_receber_manual > 0 THEN
        v_a_receber := v_snapshot.a_receber_manual;
    END IF;

    -- 9. Na Loja OS (Pilar 4)
    SELECT COALESCE(SUM(GREATEST(0, total_value - COALESCE(
        CASE 
            WHEN last_payment_date IS NOT NULL AND last_payment_date > v_target_date THEN 0
            ELSE paid_value 
        END, 0))), 0)
    INTO v_na_loja_os
    FROM patio_os
    WHERE status != 'cancelada'
      AND (
          status != 'finalizada' 
          OR (closed_at IS NOT NULL AND (closed_at AT TIME ZONE 'America/Sao_Paulo')::date > v_target_date)
      );

    IF v_na_loja_os = 0 AND v_snapshot.total_patio IS NOT NULL THEN
        v_na_loja_os := v_snapshot.total_patio;
    END IF;

    -- 10. Caixa Atual e Fluxo de Caixa
    v_caixa_atual := v_total_saldo_banco + v_dinheiro_mp + v_a_receber + v_na_loja_os;
    v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;

    -- 11. Valor Disponível para Contas
    v_valor_disp_contas := v_faturamento_periodo - v_fluxo_caixa;

    -- 12. Contas a Pagar: Base Planilha + Extras Manuais
    v_contas_base := COALESCE(v_snapshot.contas_a_pagar, 0);
    SELECT COALESCE(SUM(amount), 0) INTO v_contas_extras
    FROM daily_manual_bills
    WHERE date = v_target_date;

    v_contas_manual := v_contas_base + v_contas_extras;
    v_subtotal_contas := v_contas_manual + v_juros_rede + v_devolucoes_rede;

    -- 13. Diferença Final
    v_diferenca_final := v_valor_disp_contas - v_subtotal_contas;

    -- 14. Raio-X das 10 Filiais
    WITH store_ofx AS (
        SELECT 
            store_id,
            COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE -amount END), 0) as bank_balance,
            COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END), 0) as total_in,
            COALESCE(SUM(CASE WHEN type = 'in' AND (counterpart_name ILIKE '%REDE%' OR counterpart_name ILIKE '%REDECARD%') THEN amount ELSE 0 END), 0) as rede_credit,
            COALESCE(SUM(CASE WHEN type = 'in' AND matched_os_number IS NOT NULL THEN amount ELSE 0 END), 0) as pix_matched,
            COALESCE(SUM(CASE WHEN type = 'in' AND manual_category IS NOT NULL THEN amount ELSE 0 END), 0) as justified_other
        FROM ofx_transactions
        WHERE target_date = v_target_date
        GROUP BY store_id
    ),
    store_patio AS (
        SELECT 
            store_id,
            COALESCE(SUM(GREATEST(0, total_value - COALESCE(paid_value, 0))), 0) as patio_val
        FROM patio_os
        WHERE status != 'cancelada' AND status != 'finalizada'
        GROUP BY store_id
    ),
    store_vault AS (
        SELECT 
            store_id,
            COALESCE(SUM(amount), 0) as vault_val,
            jsonb_agg(jsonb_build_object(
                'id', id,
                'amount', amount,
                'status', status,
                'entry_date', entry_date,
                'os_number_ref', os_number_ref,
                'description', description
            )) as vault_entries
        FROM store_cash_vault
        WHERE entry_date <= v_target_date 
          AND (status = 'em_transito' OR (status = 'depositado' AND (deposited_at IS NULL OR (deposited_at AT TIME ZONE 'America/Sao_Paulo')::date > v_target_date)))
        GROUP BY store_id
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'store_id', s.id,
            'store_name', s.name,
            'saldo_banco_ofx', COALESCE(o.bank_balance, 0),
            'saldo_banco', COALESCE(o.bank_balance, 0) + COALESCE(v.vault_val, 0) + COALESCE((st_triple->>'nao_entrou_valor')::numeric, 0),
            'bank_balance', COALESCE(o.bank_balance, 0),
            'dinheiro_loja', COALESCE(v.vault_val, 0),
            'cash_vault', COALESCE(v.vault_val, 0),
            'vault_entries', COALESCE(v.vault_entries, '[]'::jsonb),
            'nao_entrou_valor', COALESCE((st_triple->>'nao_entrou_valor')::numeric, 0),
            'cartoes_a_compensar', COALESCE((st_triple->>'nao_entrou_valor')::numeric, 0),
            'status_compensacao', COALESCE(st_triple->>'status_compensacao', 'sem_movimento'),
            'rede_bruto', COALESCE((st_triple->>'rede_bruto')::numeric, 0),
            'rede_liquido', COALESCE((st_triple->>'rede_liquido')::numeric, 0),
            'rede_taxas', COALESCE((st_triple->>'rede_taxas')::numeric, 0),
            'rede_devolucoes', COALESCE((st_triple->>'rede_devolucoes')::numeric, 0),
            'maquininha', COALESCE((st_triple->>'ofx_maquininhas')::numeric, 0),
            'rede_ofx', COALESCE((st_triple->>'ofx_maquininhas')::numeric, 0),
            'pix_os_ofx', COALESCE(o.pix_matched, 0),
            'pix', COALESCE(o.pix_matched, 0),
            'justified_other_ofx', COALESCE(o.justified_other, 0),
            'na_loja_os', COALESCE(p.patio_val, 0),
            'patio_os', COALESCE(p.patio_val, 0),
            'previsto_ofx', COALESCE(o.total_in, 0),
            'diferenca', COALESCE(o.total_in, 0) - (COALESCE((st_triple->>'ofx_maquininhas')::numeric, 0) + COALESCE(o.pix_matched, 0) + COALESCE(o.justified_other, 0)),
            'status', CASE 
                WHEN ABS(COALESCE(o.total_in, 0) - (COALESCE((st_triple->>'ofx_maquininhas')::numeric, 0) + COALESCE(o.pix_matched, 0) + COALESCE(o.justified_other, 0))) <= 0.1 THEN 'approved'
                ELSE 'divergence'
            END
        )
    )
    INTO v_stores_list
    FROM stores s
    LEFT JOIN store_ofx o ON o.store_id = s.id
    LEFT JOIN store_patio p ON p.store_id = s.id
    LEFT JOIN store_vault v ON v.store_id = s.id
    LEFT JOIN LATERAL (
        SELECT elem as st_triple
        FROM jsonb_array_elements(v_triple->'stores') elem
        WHERE (elem->>'store_id') = s.id
        LIMIT 1
    ) ON true
    WHERE s.active = true;

    RETURN jsonb_build_object(
        'date', v_target_date,
        'is_closed', false,
        'closed_at', null,
        'caixa_atual', v_caixa_atual,
        'caixa_anterior', v_caixa_anterior,
        'fluxo_caixa', v_fluxo_caixa,
        'faturamento_periodo', v_faturamento_periodo,
        'faturamento_oi_base', v_faturamento_oi_base,
        'faturamento_ajustes', v_faturamento_ajustes,
        'faturamento_itens', v_faturamento_itens,
        'valor_disp_contas', v_valor_disp_contas,
        'contas_base', v_contas_base,
        'contas_extras', v_contas_extras,
        'contas_manual', v_contas_manual,
        'juros_rede', v_juros_rede,
        'devolucoes_rede', v_devolucoes_rede,
        'subtotal_contas', v_subtotal_contas,
        'diferenca_final', v_diferenca_final,
        'total_saldo_banco', v_total_saldo_banco,
        'saldo_bancos_ofx', v_saldo_bancos,
        'dinheiro_em_lojas', v_dinheiro_em_lojas,
        'cartoes_a_compensar', v_cartoes_a_compensar,
        'dinheiro_mp', v_dinheiro_mp,
        'a_receber', v_a_receber,
        'na_loja_os', v_na_loja_os,
        'total_entradas_ofx', v_total_entradas_ofx,
        'total_saidas_ofx', v_total_saidas_ofx,
        'stores', COALESCE(v_stores_list, '[]'::jsonb)
    );
END;
$function$;

NOTIFY pgrst, 'reload schema';
