-- Migration: 20260831000003_fix_faturamento_aportes_and_saidas_tracking.sql
-- Description: Adiciona rastreamento de saídas (Contas x Débitos OFX), toggle de contabilização e unifica aportes de OFX no Faturamento do Dia.

-- 1. Schema Extensions
ALTER TABLE public.daily_manual_bills
ADD COLUMN IF NOT EXISTS contabilizar_no_subtotal BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS matched_ofx_id UUID REFERENCES public.ofx_transactions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS match_status TEXT DEFAULT 'unmatched';

ALTER TABLE public.ofx_transactions
ADD COLUMN IF NOT EXISTS matched_bill_id UUID REFERENCES public.daily_manual_bills(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS contabilizar_no_subtotal BOOLEAN DEFAULT true NOT NULL;

CREATE INDEX IF NOT EXISTS idx_daily_manual_bills_date_contab 
ON public.daily_manual_bills (date, contabilizar_no_subtotal);

CREATE INDEX IF NOT EXISTS idx_ofx_transactions_target_date_type 
ON public.ofx_transactions (target_date, type, contabilizar_no_subtotal);

-- 2. RPC de Auto-Match de Saídas
DROP FUNCTION IF EXISTS public.auto_match_saidas(date);
DROP FUNCTION IF EXISTS public.auto_match_saidas(text);

CREATE OR REPLACE FUNCTION public.auto_match_saidas(p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    bill_rec RECORD;
    ofx_rec RECORD;
    v_matched_count int := 0;
BEGIN
    IF p_date IS NULL THEN
        RAISE EXCEPTION 'Data obrigatória para pareamento de saídas.';
    END IF;

    FOR bill_rec IN
        SELECT id, amount, store_id, recipient_name, title, external_code
        FROM public.daily_manual_bills
        WHERE date = p_date 
          AND matched_ofx_id IS NULL
          AND contabilizar_no_subtotal = true
        ORDER BY amount DESC
    LOOP
        SELECT id, amount, store_id, counterpart_name, fitid
        INTO ofx_rec
        FROM public.ofx_transactions
        WHERE (target_date = p_date OR occurred_at::date = p_date)
          AND type = 'out'
          AND matched_bill_id IS NULL
          AND (bill_rec.store_id IS NULL OR store_id IS NULL OR store_id = bill_rec.store_id)
          AND (
              ABS(ABS(amount) - bill_rec.amount) < 0.05
              OR (
                  (counterpart_name ILIKE ('%' || COALESCE(bill_rec.recipient_name, bill_rec.title) || '%')
                   OR fitid ILIKE ('%' || COALESCE(bill_rec.external_code, '---') || '%'))
                  AND ABS(ABS(amount) - bill_rec.amount) < 1.00
              )
          )
        ORDER BY 
          CASE WHEN store_id = bill_rec.store_id THEN 0 ELSE 1 END,
          ABS(ABS(amount) - bill_rec.amount) ASC
        LIMIT 1;

        IF ofx_rec.id IS NOT NULL THEN
            UPDATE public.daily_manual_bills
            SET matched_ofx_id = ofx_rec.id,
                match_status = 'matched'
            WHERE id = bill_rec.id;

            UPDATE public.ofx_transactions
            SET matched_bill_id = bill_rec.id
            WHERE id = ofx_rec.id;

            v_matched_count := v_matched_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'date', p_date,
        'matched_saidas_count', v_matched_count
    );
END;
$$;

-- 3. RPC Canônica get_daily_reconciliation_summary
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(text, boolean);
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(date, boolean);
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(text);
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(date);
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary();

CREATE OR REPLACE FUNCTION public.get_daily_reconciliation_summary(
    p_date text DEFAULT CURRENT_DATE::text,
    p_force_dynamic boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_date date := COALESCE(p_date::date, CURRENT_DATE);
    v_snapshot daily_snapshots%ROWTYPE;
    v_snapshot_found boolean := false;
    
    v_saldo_bancos numeric := 0;
    v_saldo_bancos_positivo numeric := 0;
    v_saldo_negativo_itau numeric := 0;
    v_dinheiro_lojas numeric := 0;
    v_cartoes_a_compensar numeric := 0;
    v_devolucoes_rede numeric := 0;
    v_total_saldo_banco numeric := 0;
    v_total_saldo_banco_positivo numeric := 0;
    v_dinheiro_mp numeric := 0;
    v_a_receber numeric := 0;
    v_na_loja_os numeric := 0;
    v_caixa_atual numeric := 0;
    v_caixa_anterior numeric := 0;
    v_fluxo_caixa numeric := 0;
    
    v_odometro_hoje numeric := 0;
    v_faturamento_oi_base numeric := 0;
    v_faturamento_ajustes numeric := 0;
    v_faturamento_periodo numeric := 0;
    v_faturamento_anterior numeric := 0;
    v_faturamento_itens jsonb := '[]'::jsonb;
    v_ofx_aportes numeric := 0;
    
    v_valor_disp_contas numeric := 0;
    v_contas_base numeric := 0;
    v_contas_extras numeric := 0;
    v_contas_manual numeric := 0;
    v_total_bills numeric := 0;
    v_contas_imported_bills numeric := 0;
    v_juros_rede numeric := 0;
    v_subtotal_contas numeric := 0;
    v_diferenca_final numeric := 0;
    v_status_geral text := 'divergent';
    v_contas_itens jsonb := '[]'::jsonb;
    
    v_total_entradas_ofx numeric := 0;
    v_total_saidas_ofx numeric := 0;
    
    v_triple_recon jsonb;
    v_stores_detail jsonb := '[]'::jsonb;
BEGIN
    SELECT * INTO v_snapshot FROM daily_snapshots WHERE date = v_target_date;
    IF FOUND THEN
        v_snapshot_found := true;
    END IF;

    -- RAMAL 1: DIA FECHADO (Snapshot Consolidado e Blindado)
    IF NOT p_force_dynamic AND v_snapshot_found AND v_snapshot.is_closed = true THEN
        SELECT 
            COALESCE(SUM(bank_total), 0),
            COALESCE(SUM(CASE WHEN bank_total > 0 THEN bank_total ELSE 0 END), 0),
            COALESCE(SUM(CASE WHEN bank_total < 0 THEN ABS(bank_total) ELSE 0 END), 0)
        INTO v_saldo_bancos, v_saldo_bancos_positivo, v_saldo_negativo_itau
        FROM (
            SELECT DISTINCT ON (store_id) store_id, bank_total
            FROM reconciliations
            WHERE date <= v_target_date
            ORDER BY store_id, date DESC
        ) latest_recons;

        IF v_saldo_bancos = 0 AND v_snapshot.saldo_bancario IS NOT NULL AND v_snapshot.saldo_bancario != 0 THEN
            v_saldo_bancos := COALESCE(v_snapshot.saldo_bancario, 0);
            v_saldo_negativo_itau := COALESCE(v_snapshot.saldo_negativo_itau, (v_snapshot.metadata->>'saldo_negativo_itau')::numeric, 0);
            v_saldo_bancos_positivo := CASE WHEN v_saldo_negativo_itau > 0 THEN v_saldo_bancos + v_saldo_negativo_itau ELSE v_saldo_bancos END;
        END IF;
        
        IF v_saldo_negativo_itau = 0 THEN
            v_saldo_negativo_itau := COALESCE(v_snapshot.saldo_negativo_itau, (v_snapshot.metadata->>'saldo_negativo_itau')::numeric, 0);
        END IF;

        v_dinheiro_mp := COALESCE(v_snapshot.dinheiro_mp, 0);
        v_a_receber := COALESCE(v_snapshot.a_receber_manual, 0);
        v_na_loja_os := COALESCE(v_snapshot.total_patio, 0);
        v_caixa_atual := COALESCE(v_snapshot.caixa_atual, 0);
        v_caixa_anterior := COALESCE((v_snapshot.metadata->>'caixa_anterior')::numeric, 0);
        v_fluxo_caixa := COALESCE((v_snapshot.metadata->>'fluxo_caixa')::numeric, v_caixa_atual - v_caixa_anterior);
        
        SELECT COALESCE(
            (metadata->>'odometro_hoje')::numeric,
            (metadata->>'faturamento_acumulado')::numeric,
            (metadata->>'faturamento_anterior')::numeric,
            (metadata->>'odometro_anterior')::numeric,
            faturamento,
            0
        )
        INTO v_faturamento_anterior
        FROM daily_snapshots
        WHERE date < v_target_date
        ORDER BY date DESC
        LIMIT 1;

        IF (v_snapshot.metadata->>'faturamento_anterior') IS NOT NULL THEN
            v_faturamento_anterior := (v_snapshot.metadata->>'faturamento_anterior')::numeric;
        ELSIF (v_snapshot.metadata->>'odometro_anterior') IS NOT NULL THEN
            v_faturamento_anterior := (v_snapshot.metadata->>'odometro_anterior')::numeric;
        END IF;

        IF (v_snapshot.metadata->>'faturamento_oi_base') IS NOT NULL AND (v_snapshot.metadata->>'faturamento_oi_base')::numeric > 0 THEN
            v_faturamento_oi_base := (v_snapshot.metadata->>'faturamento_oi_base')::numeric;
        ELSIF v_snapshot.faturamento IS NOT NULL AND v_faturamento_anterior > 0 AND v_snapshot.faturamento > v_faturamento_anterior THEN
            v_faturamento_oi_base := v_snapshot.faturamento - v_faturamento_anterior;
        ELSE
            v_faturamento_oi_base := COALESCE(v_snapshot.faturamento, 0);
        END IF;

        v_faturamento_ajustes := COALESCE((v_snapshot.metadata->>'faturamento_ajustes')::numeric, 0);
        v_faturamento_periodo := v_faturamento_oi_base + v_faturamento_ajustes;
        v_valor_disp_contas := COALESCE((v_snapshot.metadata->>'valor_disp_contas')::numeric, v_faturamento_periodo - v_fluxo_caixa);
        
        v_contas_base := COALESCE((v_snapshot.metadata->>'contas_base')::numeric, v_snapshot.contas_a_pagar, 0);
        v_contas_extras := COALESCE((v_snapshot.metadata->>'contas_extras')::numeric, 0);
        v_contas_manual := COALESCE((v_snapshot.metadata->>'contas_manual')::numeric, v_contas_base + v_contas_extras);
        v_juros_rede := COALESCE(v_snapshot.juros_rede, 0);
        v_subtotal_contas := COALESCE((v_snapshot.metadata->>'subtotal_contas')::numeric, v_contas_manual + v_juros_rede);
        v_diferenca_final := COALESCE((v_snapshot.metadata->>'diferenca_final')::numeric, v_valor_disp_contas - v_subtotal_contas);
        v_status_geral := CASE WHEN ABS(v_diferenca_final) <= 50.00 THEN 'approved' ELSE 'divergent' END;

        v_dinheiro_lojas := COALESCE((v_snapshot.metadata->>'dinheiro_em_lojas')::numeric, 0);
        v_cartoes_a_compensar := COALESCE((v_snapshot.metadata->>'cartoes_a_compensar')::numeric, 0);
        v_devolucoes_rede := COALESCE((v_snapshot.metadata->>'devolucoes_rede')::numeric, 0);
        
        v_total_saldo_banco_positivo := v_saldo_bancos_positivo + v_dinheiro_lojas + v_cartoes_a_compensar - v_devolucoes_rede;
        v_total_saldo_banco := v_saldo_bancos + v_dinheiro_lojas + v_cartoes_a_compensar - v_devolucoes_rede;

        BEGIN
            v_triple_recon := get_store_pos_triple_reconciliation(v_target_date::text);
        EXCEPTION WHEN OTHERS THEN
            v_triple_recon := '{}'::jsonb;
        END;

        WITH recon_latest AS (
            SELECT DISTINCT ON (store_id) store_id, bank_total, na_loja_os as historical_na_loja
            FROM reconciliations
            WHERE date <= v_target_date
            ORDER BY store_id, date DESC
        ),
        store_pos_summary AS (
            SELECT 
                (elem->>'store_id')::text as store_id,
                COALESCE((elem->>'rede_bruto')::numeric, 0) as rede_bruto,
                COALESCE((elem->>'rede_liquido')::numeric, 0) as rede_liquido,
                COALESCE((elem->>'rede_devolucoes')::numeric, 0) as rede_devolucoes,
                COALESCE((elem->>'ofx_maquininhas')::numeric, 0) as ofx_maquininhas,
                COALESCE((elem->>'nao_entrou_valor')::numeric, 0) as nao_entrou_valor,
                COALESCE((elem->>'status_compensacao')::text, 'sem_movimento') as status_compensacao
            FROM jsonb_array_elements(COALESCE(v_triple_recon->'stores', '[]'::jsonb)) as elem
        ),
        store_vault AS (
            SELECT 
                store_id,
                COALESCE(SUM(amount), 0) as dinheiro_loja,
                jsonb_agg(jsonb_build_object(
                    'id', id, 'amount', amount, 'status', status, 'entry_date', entry_date, 'description', description
                )) as vault_entries
            FROM store_cash_vault
            WHERE entry_date <= v_target_date
              AND (
                status IN ('em_transito', 'pending')
                OR (status = 'depositado' AND deposited_at IS NOT NULL AND deposited_at::date > v_target_date)
              )
            GROUP BY store_id
        )
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'store_id', s.id,
            'store_name', s.name,
            'color', COALESCE(s.avatar_url, ''),
            'saldo_banco', ROUND(COALESCE(r.bank_total, 0) + COALESCE(v.dinheiro_loja, 0) + COALESCE(pos.nao_entrou_valor, 0), 2),
            'saldo_banco_ofx', ROUND(COALESCE(r.bank_total, 0), 2),
            'bank_balance', ROUND(COALESCE(r.bank_total, 0), 2),
            'dinheiro_loja', ROUND(COALESCE(v.dinheiro_loja, 0), 2),
            'vault_entries', COALESCE(v.vault_entries, '[]'::jsonb),
            'na_loja_os', ROUND(COALESCE(r.historical_na_loja, 0), 2),
            'patio_os', ROUND(COALESCE(r.historical_na_loja, 0), 2),
            'maquininha', ROUND(COALESCE(pos.rede_liquido, 0), 2),
            'rede_bruto', ROUND(COALESCE(pos.rede_bruto, 0), 2),
            'rede_liquido', ROUND(COALESCE(pos.rede_liquido, 0), 2),
            'rede_devolucoes', ROUND(COALESCE(pos.rede_devolucoes, 0), 2),
            'ofx_maquininhas', ROUND(COALESCE(pos.ofx_maquininhas, 0), 2),
            'nao_entrou_maquininhas', ROUND(COALESCE(pos.nao_entrou_valor, 0), 2),
            'nao_entrou_valor', ROUND(COALESCE(pos.nao_entrou_valor, 0), 2),
            'pix', 0,
            'pix_os', 0,
            'previsto_ofx', ROUND(COALESCE(pos.rede_liquido, 0), 2),
            'diferenca', 0,
            'status_compensacao', COALESCE(pos.status_compensacao, 'sem_movimento'),
            'status', 'approved'
        ) ORDER BY s.name), '[]'::jsonb)
        INTO v_stores_detail
        FROM stores s
        LEFT JOIN recon_latest r ON r.store_id = s.id
        LEFT JOIN store_pos_summary pos ON pos.store_id = s.id
        LEFT JOIN store_vault v ON v.store_id = s.id
        WHERE s.active = true;

        RETURN jsonb_build_object(
            'date', v_target_date,
            'status_geral', v_status_geral,
            'is_closed', true,
            'closed_at', v_snapshot.closed_at,
            'saldo_bancos_ofx', v_saldo_bancos,
            'saldo_bancos_positivo', v_saldo_bancos_positivo,
            'dinheiro_em_lojas', v_dinheiro_lojas,
            'cartoes_a_compensar', v_cartoes_a_compensar,
            'devolucoes_rede', v_devolucoes_rede,
            'total_saldo_banco', v_total_saldo_banco,
            'total_saldo_banco_positivo', v_total_saldo_banco_positivo,
            'saldo_negativo_itau', v_saldo_negativo_itau,
            'dinheiro_mp', v_dinheiro_mp,
            'a_receber', v_a_receber,
            'na_loja_os', v_na_loja_os,
            'caixa_atual', v_caixa_atual,
            'caixa_anterior', v_caixa_anterior,
            'fluxo_caixa', v_fluxo_caixa,
            'faturamento_oi_base', v_faturamento_oi_base,
            'faturamento_ajustes', v_faturamento_ajustes,
            'faturamento_periodo', v_faturamento_periodo,
            'faturamento_anterior', v_faturamento_anterior,
            'valor_disp_contas', v_valor_disp_contas,
            'contas_base', v_contas_base,
            'contas_extras', v_contas_extras,
            'contas_manual', v_contas_manual,
            'juros_rede', v_juros_rede,
            'subtotal_contas', v_subtotal_contas,
            'diferenca_final', v_diferenca_final,
            'total_entradas_ofx', v_total_entradas_ofx,
            'total_saidas_ofx', v_total_saidas_ofx,
            'contas_itens', v_contas_itens,
            'faturamento_itens', v_faturamento_itens,
            'stores', v_stores_detail,
            'stores_detail', v_stores_detail
        );
    END IF;

    -- RAMAL 2: DIA ABERTO / DRAFT (Cálculo Dinâmico em Tempo Real)
    SELECT 
        COALESCE(SUM(bank_total), 0),
        COALESCE(SUM(CASE WHEN bank_total > 0 THEN bank_total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN bank_total < 0 THEN ABS(bank_total) ELSE 0 END), 0)
    INTO v_saldo_bancos, v_saldo_bancos_positivo, v_saldo_negativo_itau
    FROM (
        SELECT DISTINCT ON (store_id) store_id, bank_total
        FROM reconciliations
        WHERE date <= v_target_date
        ORDER BY store_id, date DESC
    ) latest_recons;

    IF v_saldo_bancos = 0 AND v_snapshot.saldo_bancario IS NOT NULL THEN
        v_saldo_bancos := v_snapshot.saldo_bancario;
        v_saldo_bancos_positivo := v_saldo_bancos;
    END IF;

    SELECT 
        COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END), 0)
    INTO v_total_entradas_ofx, v_total_saidas_ofx
    FROM ofx_transactions
    WHERE target_date = v_target_date;

    SELECT COALESCE(SUM(na_loja_os), 0)
    INTO v_na_loja_os
    FROM reconciliations
    WHERE date = v_target_date;

    IF v_na_loja_os = 0 THEN
        SELECT COALESCE(SUM(GREATEST(0, COALESCE(total_value, 0) - COALESCE(paid_value, 0))), 0)
        INTO v_na_loja_os
        FROM patio_os
        WHERE opened_at <= (v_target_date || ' 23:59:59')::timestamp
          AND (closed_at IS NULL OR closed_at::date > v_target_date)
          AND LOWER(COALESCE(status, 'em_aberto')) IN ('em_aberto', 'pago_parcial', 'em_andamento', 'aberta', 'aberto', 'pendente')
          AND (COALESCE(total_value, 0) - COALESCE(paid_value, 0)) > 0.05
          AND total_value < 100000;
    END IF;

    IF v_na_loja_os = 0 AND v_snapshot.total_patio IS NOT NULL THEN
        v_na_loja_os := v_snapshot.total_patio;
    END IF;

    SELECT 
        COALESCE(caixa_atual, 0),
        COALESCE(
            (metadata->>'odometro_hoje')::numeric,
            (metadata->>'faturamento_acumulado')::numeric,
            (metadata->>'faturamento_anterior')::numeric,
            (metadata->>'odometro_anterior')::numeric,
            faturamento,
            0
        )
    INTO v_caixa_anterior, v_faturamento_anterior
    FROM daily_snapshots
    WHERE date < v_target_date
    ORDER BY date DESC
    LIMIT 1;

    IF v_caixa_anterior = 0 AND v_snapshot.metadata->>'caixa_anterior' IS NOT NULL THEN
        v_caixa_anterior := (v_snapshot.metadata->>'caixa_anterior')::numeric;
    END IF;

    IF v_faturamento_anterior = 0 AND v_snapshot.metadata->>'faturamento_anterior' IS NOT NULL THEN
        v_faturamento_anterior := (v_snapshot.metadata->>'faturamento_anterior')::numeric;
    ELSIF v_faturamento_anterior = 0 AND v_snapshot.metadata->>'odometro_anterior' IS NOT NULL THEN
        v_faturamento_anterior := (v_snapshot.metadata->>'odometro_anterior')::numeric;
    END IF;

    v_odometro_hoje := COALESCE(
        (v_snapshot.metadata->>'odometro_hoje')::numeric,
        (v_snapshot.metadata->>'faturamento_odometro')::numeric,
        v_snapshot.faturamento,
        0
    );

    IF v_odometro_hoje > 0 AND v_faturamento_anterior > 0 AND v_odometro_hoje >= v_faturamento_anterior THEN
        v_faturamento_oi_base := v_odometro_hoje - v_faturamento_anterior;
    ELSIF v_snapshot.faturamento IS NOT NULL AND v_snapshot.faturamento > 0 AND (v_snapshot.metadata->>'odometro_hoje') IS NULL THEN
        v_faturamento_oi_base := v_snapshot.faturamento;
    ELSE
        SELECT COALESCE(SUM(amount), 0)
        INTO v_faturamento_oi_base
        FROM ofx_transactions
        WHERE target_date = v_target_date AND type = 'in';
    END IF;

    v_dinheiro_mp := COALESCE(v_snapshot.dinheiro_mp, 0);
    v_a_receber := COALESCE(v_snapshot.a_receber_manual, 0);
    v_juros_rede := COALESCE(v_snapshot.juros_rede, 0);

    -- Ajustes de Faturamento: Soma daily_revenue_adjustments + Aportes de OFX
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', id, 'title', title, 'amount', amount, 'type', type, 'description', description
        )), '[]'::jsonb)
    INTO v_faturamento_ajustes, v_faturamento_itens
    FROM daily_revenue_adjustments
    WHERE date = v_target_date;

    SELECT COALESCE(SUM(amount), 0)
    INTO v_ofx_aportes
    FROM ofx_transactions
    WHERE target_date = v_target_date 
      AND type = 'in'
      AND (
          manual_category IN ('aporte', 'outros_faturamento', 'sucata', 'faturamento_extra', 'aporte_socio')
          OR manual_category ILIKE '%aporte%'
      );

    v_faturamento_ajustes := v_faturamento_ajustes + v_ofx_aportes;
    v_faturamento_periodo := v_faturamento_oi_base + v_faturamento_ajustes;

    -- Contas a Pagar: Respeita rigorosamente a flag contabilizar_no_subtotal = true
    SELECT 
        COALESCE(SUM(CASE WHEN COALESCE(contabilizar_no_subtotal, true) THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN external_code IS NULL AND COALESCE(contabilizar_no_subtotal, true) THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN external_code IS NOT NULL AND COALESCE(contabilizar_no_subtotal, true) THEN amount ELSE 0 END), 0),
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', id, 'title', title, 'amount', amount, 'category', category,
            'description', description, 'store_id', store_id, 'external_code', external_code,
            'contabilizar_no_subtotal', COALESCE(contabilizar_no_subtotal, true),
            'matched_ofx_id', matched_ofx_id
        )), '[]'::jsonb)
    INTO v_total_bills, v_contas_extras, v_contas_imported_bills, v_contas_itens
    FROM daily_manual_bills
    WHERE date = v_target_date;

    IF v_total_bills > 0 THEN
        v_contas_manual := v_total_bills;
        v_contas_base := v_contas_imported_bills;
    ELSE
        v_contas_base := COALESCE(v_snapshot.contas_a_pagar, 0);
        v_contas_manual := v_contas_base;
    END IF;

    SELECT COALESCE(SUM(amount), 0)
    INTO v_dinheiro_lojas
    FROM store_cash_vault
    WHERE entry_date <= v_target_date 
      AND (
        status IN ('em_transito', 'pending')
        OR (status = 'depositado' AND deposited_at IS NOT NULL AND deposited_at::date > v_target_date)
      );

    BEGIN
        v_triple_recon := get_store_pos_triple_reconciliation(v_target_date::text);
        IF v_triple_recon IS NOT NULL THEN
            v_cartoes_a_compensar := COALESCE((v_triple_recon->>'total_nao_entrou')::numeric, 0);
            v_devolucoes_rede := COALESCE((v_triple_recon->>'total_devolucoes')::numeric, 0);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_triple_recon := '{"stores": [], "total_nao_entrou": 0, "total_devolucoes": 0}'::jsonb;
        v_cartoes_a_compensar := 0;
        v_devolucoes_rede := 0;
    END;

    IF v_devolucoes_rede = 0 THEN
        SELECT COALESCE(SUM(ABS(net_amount)), 0)
        INTO v_devolucoes_rede
        FROM pos_transactions
        WHERE target_date = v_target_date AND transaction_type = 'devolucao';
    END IF;

    WITH recon_latest AS (
        SELECT DISTINCT ON (store_id) store_id, bank_total, na_loja_os as historical_na_loja
        FROM reconciliations
        WHERE date <= v_target_date
        ORDER BY store_id, date DESC
    ),
    store_pos_summary AS (
        SELECT 
            (elem->>'store_id')::text as store_id,
            COALESCE((elem->>'rede_bruto')::numeric, 0) as rede_bruto,
            COALESCE((elem->>'rede_liquido')::numeric, 0) as rede_liquido,
            COALESCE((elem->>'rede_devolucoes')::numeric, 0) as rede_devolucoes,
            COALESCE((elem->>'ofx_maquininhas')::numeric, 0) as ofx_maquininhas,
            COALESCE((elem->>'nao_entrou_valor')::numeric, 0) as nao_entrou_valor,
            COALESCE((elem->>'status_compensacao')::text, 'sem_movimento') as status_compensacao
        FROM jsonb_array_elements(COALESCE(v_triple_recon->'stores', '[]'::jsonb)) as elem
    ),
    patio_store AS (
        SELECT store_id, COALESCE(SUM(GREATEST(0, total_value - paid_value)), 0) as patio_val
        FROM patio_os
        WHERE opened_at <= (v_target_date || ' 23:59:59')::timestamp
          AND (closed_at IS NULL OR closed_at::date > v_target_date)
          AND LOWER(COALESCE(status, 'em_aberto')) IN ('em_aberto', 'pago_parcial', 'em_andamento', 'aberta', 'aberto', 'pendente')
          AND (COALESCE(total_value, 0) - COALESCE(paid_value, 0)) > 0.05
          AND total_value < 100000
        GROUP BY store_id
    ),
    pix_store AS (
        SELECT 
            store_id,
            COALESCE(SUM(amount), 0) as pix_total
        FROM ofx_transactions
        WHERE target_date = v_target_date 
          AND type = 'in'
          AND (
              matched_os_number IS NOT NULL 
              OR counterpart_name ILIKE '%PIX%' 
              OR fitid ILIKE '%PIX%' 
              OR fitid ILIKE '%TRANSF%'
          )
          AND NOT (
              counterpart_name ILIKE '%REDE%' 
              OR counterpart_name ILIKE '%REDECARD%' 
              OR counterpart_name ILIKE '%CIELO%' 
              OR counterpart_name ILIKE '%STONE%' 
              OR counterpart_name ILIKE '%PAGSEGURO%'
              OR fitid ILIKE '%REDE%'
              OR bank_name ILIKE '%REDE%'
          )
        GROUP BY store_id
    ),
    ofx_pending_store AS (
        SELECT 
            store_id,
            COALESCE(SUM(amount), 0) as pending_total
        FROM ofx_transactions
        WHERE target_date = v_target_date
          AND matched_os_number IS NULL
          AND manual_category IS NULL
          AND NOT (
              counterpart_name ILIKE '%REDE%' 
              OR counterpart_name ILIKE '%REDECARD%' 
              OR counterpart_name ILIKE '%CIELO%' 
              OR counterpart_name ILIKE '%STONE%' 
              OR counterpart_name ILIKE '%PAGSEGURO%'
              OR fitid ILIKE '%REDE%'
              OR bank_name ILIKE '%REDE%'
              OR type = 'out'
          )
        GROUP BY store_id
    ),
    store_vault AS (
        SELECT 
            store_id,
            COALESCE(SUM(amount), 0) as dinheiro_loja,
            jsonb_agg(jsonb_build_object(
                'id', id, 'amount', amount, 'status', status, 'entry_date', entry_date, 'description', description
            )) as vault_entries
        FROM store_cash_vault
        WHERE entry_date <= v_target_date
          AND (
            status IN ('em_transito', 'pending')
            OR (status = 'depositado' AND deposited_at IS NOT NULL AND deposited_at::date > v_target_date)
          )
        GROUP BY store_id
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'store_id', s.id,
        'store_name', s.name,
        'color', COALESCE(s.avatar_url, ''),
        'saldo_banco', ROUND(COALESCE(r.bank_total, 0) + COALESCE(v.dinheiro_loja, 0) + COALESCE(pos.nao_entrou_valor, 0), 2),
        'saldo_banco_ofx', ROUND(COALESCE(r.bank_total, 0), 2),
        'bank_balance', ROUND(COALESCE(r.bank_total, 0), 2),
        'dinheiro_loja', ROUND(COALESCE(v.dinheiro_loja, 0), 2),
        'vault_entries', COALESCE(v.vault_entries, '[]'::jsonb),
        'na_loja_os', ROUND(COALESCE(r.historical_na_loja, p.patio_val, 0), 2),
        'patio_os', ROUND(COALESCE(r.historical_na_loja, p.patio_val, 0), 2),
        'maquininha', ROUND(COALESCE(pos.rede_liquido, 0), 2),
        'rede_bruto', ROUND(COALESCE(pos.rede_bruto, 0), 2),
        'rede_liquido', ROUND(COALESCE(pos.rede_liquido, 0), 2),
        'rede_devolucoes', ROUND(COALESCE(pos.rede_devolucoes, 0), 2),
        'ofx_maquininhas', ROUND(COALESCE(pos.ofx_maquininhas, 0), 2),
        'nao_entrou_maquininhas', ROUND(COALESCE(pos.nao_entrou_valor, 0), 2),
        'nao_entrou_valor', ROUND(COALESCE(pos.nao_entrou_valor, 0), 2),
        'pix', ROUND(COALESCE(pix.pix_total, 0), 2),
        'pix_os', ROUND(COALESCE(pix.pix_total, 0), 2),
        'previsto_ofx', ROUND(COALESCE(pos.rede_liquido, 0) + COALESCE(pix.pix_total, 0), 2),
        'diferenca', ROUND(COALESCE(pend.pending_total, 0), 2),
        'status_compensacao', COALESCE(pos.status_compensacao, 'sem_movimento'),
        'status', CASE WHEN COALESCE(pend.pending_total, 0) = 0 THEN 'approved' ELSE 'divergent' END
    ) ORDER BY s.name), '[]'::jsonb)
    INTO v_stores_detail
    FROM stores s
    LEFT JOIN recon_latest r ON r.store_id = s.id
    LEFT JOIN patio_store p ON p.store_id = s.id
    LEFT JOIN store_pos_summary pos ON pos.store_id = s.id
    LEFT JOIN pix_store pix ON pix.store_id = s.id
    LEFT JOIN ofx_pending_store pend ON pend.store_id = s.id
    LEFT JOIN store_vault v ON v.store_id = s.id
    WHERE s.active = true;

    v_total_saldo_banco_positivo := v_saldo_bancos_positivo + v_dinheiro_lojas + v_cartoes_a_compensar - v_devolucoes_rede;
    v_total_saldo_banco := v_saldo_bancos + v_dinheiro_lojas + v_cartoes_a_compensar - v_devolucoes_rede;
    
    v_caixa_atual := (v_total_saldo_banco_positivo + v_dinheiro_mp + v_a_receber + v_na_loja_os) - v_saldo_negativo_itau;
    v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;
    v_valor_disp_contas := v_faturamento_periodo - v_fluxo_caixa;
    v_subtotal_contas := v_contas_manual + v_juros_rede;
    v_diferenca_final := v_valor_disp_contas - v_subtotal_contas;
    v_status_geral := CASE WHEN ABS(v_diferenca_final) <= 50.00 THEN 'approved' ELSE 'divergent' END;

    RETURN jsonb_build_object(
        'date', v_target_date,
        'status_geral', v_status_geral,
        'is_closed', false,
        'closed_at', NULL,
        'saldo_bancos_ofx', ROUND(v_saldo_bancos, 2),
        'saldo_bancos_positivo', ROUND(v_saldo_bancos_positivo, 2),
        'dinheiro_em_lojas', ROUND(v_dinheiro_lojas, 2),
        'cartoes_a_compensar', ROUND(v_cartoes_a_compensar, 2),
        'devolucoes_rede', ROUND(v_devolucoes_rede, 2),
        'total_saldo_banco', ROUND(v_total_saldo_banco, 2),
        'total_saldo_banco_positivo', ROUND(v_total_saldo_banco_positivo, 2),
        'saldo_negativo_itau', ROUND(v_saldo_negativo_itau, 2),
        'dinheiro_mp', ROUND(v_dinheiro_mp, 2),
        'a_receber', ROUND(v_a_receber, 2),
        'na_loja_os', ROUND(v_na_loja_os, 2),
        'caixa_atual', ROUND(v_caixa_atual, 2),
        'caixa_anterior', ROUND(v_caixa_anterior, 2),
        'fluxo_caixa', ROUND(v_fluxo_caixa, 2),
        'faturamento_oi_base', ROUND(v_faturamento_oi_base, 2),
        'faturamento_ajustes', ROUND(v_faturamento_ajustes, 2),
        'faturamento_periodo', ROUND(v_faturamento_periodo, 2),
        'faturamento_anterior', ROUND(v_faturamento_anterior, 2),
        'valor_disp_contas', ROUND(v_valor_disp_contas, 2),
        'contas_base', ROUND(v_contas_base, 2),
        'contas_extras', ROUND(v_contas_extras, 2),
        'contas_manual', ROUND(v_contas_manual, 2),
        'juros_rede', ROUND(v_juros_rede, 2),
        'subtotal_contas', ROUND(v_subtotal_contas, 2),
        'diferenca_final', ROUND(v_diferenca_final, 2),
        'total_entradas_ofx', ROUND(v_total_entradas_ofx, 2),
        'total_saidas_ofx', ROUND(v_total_saidas_ofx, 2),
        'contas_itens', v_contas_itens,
        'faturamento_itens', v_faturamento_itens,
        'stores', v_stores_detail,
        'stores_detail', v_stores_detail
    );
END;
$$;
