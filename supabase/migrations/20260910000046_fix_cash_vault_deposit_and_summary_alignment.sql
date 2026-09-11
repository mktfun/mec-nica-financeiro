-- ============================================================================
-- Migration: 20260910000046_fix_cash_vault_deposit_and_summary_alignment.sql
-- Spec: 393 - Sincronização de Baixa de Dinheiro no Saldo Bancário e Correção Canônica do Dinheiro no Cofre
-- ============================================================================

-- 1. ATUALIZAÇÃO DA RPC dar_baixa_dinheiro COM ATUALIZAÇÃO DO SALDO BANCÁRIO

DROP FUNCTION IF EXISTS public.dar_baixa_dinheiro(uuid, text, text, numeric, date, uuid, text);
DROP FUNCTION IF EXISTS public.dar_baixa_dinheiro(uuid, text, text, date, uuid, text);

CREATE OR REPLACE FUNCTION public.dar_baixa_dinheiro(
    p_vault_id UUID DEFAULT NULL,
    p_os_number TEXT DEFAULT NULL,
    p_store_id TEXT DEFAULT NULL,
    p_amount_to_deposit NUMERIC DEFAULT NULL,
    p_deposit_date DATE DEFAULT CURRENT_DATE,
    p_ofx_id UUID DEFAULT NULL,
    p_user_email TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated_count INT := 0;
    v_target_vault store_cash_vault%ROWTYPE;
    v_remaining NUMERIC;
    v_amount_deposited NUMERIC := 0;
    v_target_store TEXT;
    v_dep_date DATE := COALESCE(p_deposit_date, CURRENT_DATE);
BEGIN
    IF p_vault_id IS NOT NULL THEN
        SELECT * INTO v_target_vault FROM store_cash_vault WHERE id = p_vault_id;
        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Registro de cofre nao encontrado');
        END IF;

        v_target_store := v_target_vault.store_id;

        -- Se for baixa parcial
        IF p_amount_to_deposit IS NOT NULL AND p_amount_to_deposit > 0 AND p_amount_to_deposit < v_target_vault.amount THEN
            v_remaining := v_target_vault.amount - p_amount_to_deposit;
            v_amount_deposited := p_amount_to_deposit;
            
            UPDATE store_cash_vault 
            SET amount = v_remaining
            WHERE id = v_target_vault.id;

            INSERT INTO store_cash_vault (
                store_id, amount, description, entry_date, status, deposited_at, deposited_by, os_number_ref, patio_os_id, matched_ofx_id
            ) VALUES (
                v_target_vault.store_id, p_amount_to_deposit, 
                COALESCE(v_target_vault.description, 'Depósito Caixa Loja') || ' (Baixa Parcial)',
                v_target_vault.entry_date, 'depositado', 
                COALESCE(v_dep_date::timestamptz, now()), p_user_email,
                v_target_vault.os_number_ref, v_target_vault.patio_os_id, p_ofx_id
            );
            v_updated_count := 1;
        ELSE
            -- Baixa total
            v_amount_deposited := COALESCE(p_amount_to_deposit, v_target_vault.amount);
            UPDATE store_cash_vault
            SET status = 'depositado',
                deposited_at = COALESCE(v_dep_date::timestamptz, now()),
                deposited_by = p_user_email,
                matched_ofx_id = COALESCE(p_ofx_id, matched_ofx_id)
            WHERE id = p_vault_id
            RETURNING * INTO v_target_vault;
            v_updated_count := 1;
        END IF;

    ELSIF p_store_id IS NOT NULL AND p_os_number IS NOT NULL THEN
        v_target_store := p_store_id;
        v_amount_deposited := COALESCE(p_amount_to_deposit, 0);

        SELECT * INTO v_target_vault 
        FROM store_cash_vault 
        WHERE store_id = p_store_id AND os_number_ref = p_os_number AND status = 'em_transito'
        ORDER BY created_at DESC LIMIT 1;

        IF NOT FOUND THEN
            INSERT INTO store_cash_vault (
                store_id, amount, description, entry_date, status, deposited_at, deposited_by, os_number_ref, matched_ofx_id
            ) VALUES (
                p_store_id, v_amount_deposited,
                'Depósito Dinheiro OS #' || p_os_number,
                v_dep_date,
                'depositado', COALESCE(v_dep_date::timestamptz, now()),
                p_user_email, p_os_number, p_ofx_id
            ) RETURNING * INTO v_target_vault;
            v_updated_count := 1;
        ELSE
            UPDATE store_cash_vault
            SET status = 'depositado',
                deposited_at = COALESCE(v_dep_date::timestamptz, now()),
                deposited_by = p_user_email,
                matched_ofx_id = COALESCE(p_ofx_id, matched_ofx_id)
            WHERE id = v_target_vault.id
            RETURNING * INTO v_target_vault;
            v_updated_count := 1;
        END IF;
    ELSE
        RAISE EXCEPTION 'Informe p_vault_id ou (p_store_id + p_os_number) para efetuar a baixa.';
    END IF;

    -- EFETIVAÇÃO FIDUCIÁRIA NO SALDO BANCÁRIO DA FILIAL:
    IF v_amount_deposited > 0 AND v_target_store IS NOT NULL THEN
        -- Atualiza reconciliations daquela loja para a data
        UPDATE public.reconciliations
        SET bank_total = COALESCE(bank_total, 0) + v_amount_deposited
        WHERE store_id = v_target_store AND date = v_dep_date;

        -- Sincroniza snapshot diário se existente
        UPDATE public.daily_snapshots
        SET saldo_bancario = COALESCE(saldo_bancario, 0) + v_amount_deposited,
            updated_at = now()
        WHERE date = v_dep_date;
    END IF;

    -- Se houver OS vinculada, grava log no histórico da OS
    IF v_target_vault.os_number_ref IS NOT NULL THEN
        UPDATE public.patio_os
        SET history_log = COALESCE(history_log, '[]'::jsonb) || jsonb_build_object(
            'action', 'baixa_dinheiro_cofre',
            'amount', v_amount_deposited,
            'deposited_at', COALESCE(v_dep_date::timestamptz, now()),
            'user', p_user_email
        )
        WHERE store_id = v_target_vault.store_id 
          AND os_number = v_target_vault.os_number_ref;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'updated_count', v_updated_count,
        'vault_id', v_target_vault.id,
        'os_number', v_target_vault.os_number_ref,
        'store_id', v_target_store,
        'amount_deposited', v_amount_deposited,
        'deposit_date', v_dep_date,
        'status', 'depositado'
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.dar_baixa_dinheiro TO authenticated, service_role, anon;


-- 2. ATUALIZAÇÃO DA RPC get_daily_reconciliation_summary COM COFRE ACUMULADO
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(text);
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(text, boolean);

CREATE OR REPLACE FUNCTION public.get_daily_reconciliation_summary(
    p_date text,
    p_force_dynamic boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_date text := p_date;
    v_snapshot record;
    v_prev_snapshot record;
    v_snapshot_found boolean := false;
    
    -- Pilares
    v_saldo_bancos numeric := 0;
    v_saldo_bancos_positivo numeric := 0;
    v_saldo_negativo_itau numeric := 0;
    v_dinheiro_lojas numeric := 0;
    v_cartoes_a_compensar numeric := 0;
    v_devolucoes_rede numeric := 0;
    v_total_saldo_banco_positivo numeric := 0;
    v_total_saldo_banco numeric := 0;
    v_dinheiro_mp numeric := 0;
    v_a_receber numeric := 0;
    v_na_loja_os numeric := 0;
    v_na_loja_os_anterior numeric := 0;
    v_caixa_atual numeric := 0;
    v_caixa_anterior numeric := 0;
    v_fluxo_caixa numeric := 0;
    
    -- Canal 1: Tesouraria Líquida Real
    v_caixa_tesouraria numeric := 0;
    v_status_tesouraria text := 'equilibrado';
    
    -- Canal 2: Balanço de Produção WIP & Neutralização Temporal
    v_patio_wip numeric := 0;
    v_variacao_patio_delta_p4 numeric := 0;
    
    -- DRE
    v_faturamento_oi_base numeric := 0;
    v_faturamento_anterior numeric := 0;
    v_faturamento_ajustes numeric := 0;
    v_faturamento_periodo numeric := 0;
    v_faturamento_itens jsonb := '[]'::jsonb;
    v_valor_disp_contas numeric := 0;
    
    -- Contas
    v_contas_base numeric := 0;
    v_contas_extras numeric := 0;
    v_contas_manual numeric := 0;
    v_contas_imported_bills numeric := 0;
    v_subtotal_contas numeric := 0;
    v_juros_rede numeric := 0;
    v_total_bills numeric := 0;
    v_contas_itens jsonb := '[]'::jsonb;
    
    -- Diferença e Lojas
    v_diferenca_final numeric := 0;
    v_status_geral text := 'divergent';
    v_stores_detail jsonb := '[]'::jsonb;
    v_has_divergent_stores boolean := false;
    v_fast_path_eligible boolean := false;
BEGIN
    -- 1. Busca snapshot do dia
    SELECT * INTO v_snapshot FROM daily_snapshots WHERE date = v_target_date::date LIMIT 1;
    IF FOUND THEN
        v_snapshot_found := true;
    END IF;

    -- 2. Busca snapshot anterior
    SELECT * INTO v_prev_snapshot 
    FROM daily_snapshots 
    WHERE date < v_target_date::date 
    ORDER BY date DESC 
    LIMIT 1;
    
    IF FOUND THEN
        v_caixa_anterior := COALESCE(v_prev_snapshot.caixa_atual, 0);
        v_faturamento_anterior := COALESCE((v_prev_snapshot.metadata->>'odometro_hoje')::numeric, v_prev_snapshot.faturamento, 0);
        v_na_loja_os_anterior := COALESCE(v_prev_snapshot.total_patio, 0);
    ELSE
        v_caixa_anterior := 0;
        v_faturamento_anterior := 0;
        v_na_loja_os_anterior := 0;
    END IF;

    -- =========================================================================
    -- DETALHAMENTO POR LOJA (SPLIT DUAL COM FÓRMULA CANÔNICA ANTI-DUPLA CONTAGEM)
    -- =========================================================================
    WITH stores_list AS (
        SELECT id, name FROM stores WHERE COALESCE(active, true) = true
    ),
    rede_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(gross_amount), 0) as rede_bruto,
            COALESCE(SUM(net_amount), 0) as rede_liquido,
            COALESCE(SUM(fee_amount), 0) as rede_taxas,
            COALESCE(SUM(CASE WHEN transaction_type = 'devolucao' THEN gross_amount ELSE 0 END), 0) as rede_devolucoes
        FROM pos_transactions
        WHERE COALESCE(target_date, occurred_at::date) = v_target_date::date
        GROUP BY TRIM(store_id::text)
    ),
    ofx_entradas_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(amount), 0) as ofx_entradas_total,
            COALESCE(SUM(CASE WHEN manual_category ILIKE '%REDE%' OR counterpart_name ILIKE '%REDE%' OR counterpart_name ILIKE '%CARD%' THEN amount ELSE 0 END), 0) as ofx_maquininhas,
            COALESCE(SUM(CASE WHEN matched_os_number IS NOT NULL OR manual_category = 'PIX / Recebimento OS' THEN amount ELSE 0 END), 0) as pix_total,
            COALESCE(SUM(CASE WHEN manual_category NOT IN ('PIX / Recebimento OS', 'REDE') AND manual_category IS NOT NULL THEN amount ELSE 0 END), 0) as entradas_justificadas,
            COALESCE(SUM(CASE WHEN matched_os_number IS NULL AND manual_category IS NULL THEN amount ELSE 0 END), 0) as entradas_orfas
        FROM ofx_transactions
        WHERE target_date = v_target_date::date AND type = 'in'
        GROUP BY TRIM(store_id::text)
    ),
    ofx_saidas_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(amount), 0) as ofx_saidas_total,
            COALESCE(SUM(CASE WHEN matched_bill_id IS NOT NULL OR manual_category IS NOT NULL THEN amount ELSE 0 END), 0) as saidas_justificadas,
            COALESCE(SUM(CASE WHEN matched_bill_id IS NULL AND manual_category IS NULL THEN amount ELSE 0 END), 0) as saidas_orfas
        FROM ofx_transactions
        WHERE target_date = v_target_date::date AND type = 'out'
        GROUP BY TRIM(store_id::text)
    ),
    bills_store_agg AS (
        SELECT 
            COALESCE(TRIM(b.store_id::text), TRIM(ot.store_id::text)) as store_id,
            COALESCE(SUM(b.amount), 0) as contas_loja_total
        FROM daily_manual_bills b
        LEFT JOIN ofx_transactions ot ON (ot.id = b.matched_ofx_id OR ot.matched_bill_id = b.id)
        WHERE b.date = v_target_date::date AND COALESCE(b.contabilizar_no_subtotal, true) = true
        GROUP BY COALESCE(TRIM(b.store_id::text), TRIM(ot.store_id::text))
    ),
    recon_today AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            bank_total,
            na_loja_os
        FROM reconciliations
        WHERE date = v_target_date::date
    ),
    recon_latest AS (
        SELECT DISTINCT ON (TRIM(store_id::text))
            TRIM(store_id::text) as store_id,
            bank_total,
            na_loja_os
        FROM reconciliations
        WHERE date <= v_target_date::date
        ORDER BY TRIM(store_id::text), date DESC
    ),
    patio_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(total_value - paid_value), 0) as patio_total
        FROM patio_os
        WHERE (status ILIKE '%aberto%' OR status ILIKE '%parcial%' OR status ILIKE '%pendente%' OR status = 'ABERTA' OR status = 'PENDENTE')
          AND opened_at::date <= v_target_date::date
        GROUP BY TRIM(store_id::text)
    ),
    vault_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(amount), 0) as vault_total
        FROM store_cash_vault
        WHERE entry_date <= v_target_date::date
          AND (
              status IN ('em_transito', 'pending') 
              OR (status = 'depositado' AND deposited_at::date > v_target_date::date)
          )
        GROUP BY TRIM(store_id::text)
    ),
    vault_items_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            jsonb_agg(jsonb_build_object(
                'id', id,
                'amount', amount,
                'status', status,
                'entry_date', entry_date,
                'description', description,
                'os_number_ref', os_number_ref
            )) as vault_entries
        FROM store_cash_vault
        WHERE entry_date <= v_target_date::date
          AND (
              status IN ('em_transito', 'pending') 
              OR (status = 'depositado' AND deposited_at::date > v_target_date::date)
          )
        GROUP BY TRIM(store_id::text)
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'store_id', s.id,
        'store_name', s.name,
        'saldo_banco', COALESCE(rt.bank_total, rl.bank_total, 0),
        'saldo_banco_ofx', COALESCE(rt.bank_total, rl.bank_total, 0),
        'maquininha', COALESCE(rd.rede_liquido, 0),
        'rede_bruto', COALESCE(rd.rede_bruto, 0),
        'rede_liquido', COALESCE(rd.rede_liquido, 0),
        'devolucoes_rede', COALESCE(rd.rede_devolucoes, 0),
        'dinheiro_loja', COALESCE(v.vault_total, 0),
        'vault_entries', COALESCE(vi.vault_entries, '[]'::jsonb),
        'pix', COALESCE(oe.pix_total, 0),
        'pix_total', COALESCE(oe.pix_total, 0),
        'ofx_entradas_total', COALESCE(oe.ofx_entradas_total, 0),
        'ofx_maquininhas', COALESCE(oe.ofx_maquininhas, 0),
        'entradas_justificadas', COALESCE(oe.entradas_justificadas, 0),
        'entradas_orfas', COALESCE(oe.entradas_orfas, 0),
        'entradas_conciliadas', (COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0) + COALESCE(oe.entradas_justificadas, 0)),
        'dif_entradas', COALESCE(oe.entradas_orfas, 0),
        'ofx_saidas_total', COALESCE(sofx.ofx_saidas_total, 0),
        'saidas_justificadas', COALESCE(sofx.saidas_justificadas, 0),
        'saidas_orfas', COALESCE(sofx.saidas_orfas, 0),
        'contas_loja_total', COALESCE(bst.contas_loja_total, 0),
        -- Fórmula Canônica Anti-Dupla Contagem:
        -- Saídas explicadas = Boletos cobertos + Débitos bancários extras justificados (sem exceder as saídas reais)
        'contas_conciliadas', (
            LEAST(COALESCE(sofx.ofx_saidas_total, 0), COALESCE(bst.contas_loja_total, 0)) +
            LEAST(COALESCE(sofx.saidas_justificadas, 0), GREATEST(0, COALESCE(sofx.ofx_saidas_total, 0) - COALESCE(bst.contas_loja_total, 0)))
        ),
        'dif_saidas', (
            COALESCE(sofx.ofx_saidas_total, 0) - (
                LEAST(COALESCE(sofx.ofx_saidas_total, 0), COALESCE(bst.contas_loja_total, 0)) +
                LEAST(COALESCE(sofx.saidas_justificadas, 0), GREATEST(0, COALESCE(sofx.ofx_saidas_total, 0) - COALESCE(bst.contas_loja_total, 0)))
            )
        ),
        'na_loja_os', COALESCE(rt.na_loja_os, p.patio_total, rl.na_loja_os, 0),
        'patio_os', COALESCE(rt.na_loja_os, p.patio_total, rl.na_loja_os, 0),
        'diferenca_total', (COALESCE(oe.entradas_orfas, 0) - (
            COALESCE(sofx.ofx_saidas_total, 0) - (
                LEAST(COALESCE(sofx.ofx_saidas_total, 0), COALESCE(bst.contas_loja_total, 0)) +
                LEAST(COALESCE(sofx.saidas_justificadas, 0), GREATEST(0, COALESCE(sofx.ofx_saidas_total, 0) - COALESCE(bst.contas_loja_total, 0)))
            )
        )),
        'diferenca', (COALESCE(oe.entradas_orfas, 0) - (
            COALESCE(sofx.ofx_saidas_total, 0) - (
                LEAST(COALESCE(sofx.ofx_saidas_total, 0), COALESCE(bst.contas_loja_total, 0)) +
                LEAST(COALESCE(sofx.saidas_justificadas, 0), GREATEST(0, COALESCE(sofx.ofx_saidas_total, 0) - COALESCE(bst.contas_loja_total, 0)))
            )
        )),
        'status', CASE 
            WHEN ABS(COALESCE(oe.entradas_orfas, 0)) <= 0.05 
             AND ABS(COALESCE(sofx.ofx_saidas_total, 0) - (
                LEAST(COALESCE(sofx.ofx_saidas_total, 0), COALESCE(bst.contas_loja_total, 0)) +
                LEAST(COALESCE(sofx.saidas_justificadas, 0), GREATEST(0, COALESCE(sofx.ofx_saidas_total, 0) - COALESCE(bst.contas_loja_total, 0)))
             )) <= 0.05 THEN 'approved' 
            ELSE 'divergence' 
        END
    )), '[]'::jsonb) INTO v_stores_detail
    FROM stores_list s
    LEFT JOIN rede_agg rd ON rd.store_id = s.id
    LEFT JOIN ofx_entradas_agg oe ON oe.store_id = s.id
    LEFT JOIN ofx_saidas_agg sofx ON sofx.store_id = s.id
    LEFT JOIN bills_store_agg bst ON bst.store_id = s.id
    LEFT JOIN recon_today rt ON rt.store_id = s.id
    LEFT JOIN recon_latest rl ON rl.store_id = s.id
    LEFT JOIN patio_agg p ON p.store_id = s.id
    LEFT JOIN vault_agg v ON v.store_id = s.id
    LEFT JOIN vault_items_agg vi ON vi.store_id = s.id;

    -- Avalia se há lojas divergentes
    SELECT EXISTS(
        SELECT 1 FROM jsonb_array_elements(v_stores_detail) elem 
        WHERE elem->>'status' = 'divergence'
    ) INTO v_has_divergent_stores;

    -- =========================================================================
    -- APURAÇÃO DOS 5 PILARES E ARQUITETURA BICANAL
    -- =========================================================================
    -- 1. Saldos Bancários
    SELECT 
        COALESCE(SUM(bank_total), 0),
        COALESCE(SUM(CASE WHEN bank_total > 0 THEN bank_total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN bank_total < 0 THEN ABS(bank_total) ELSE 0 END), 0)
    INTO v_saldo_bancos, v_saldo_bancos_positivo, v_saldo_negativo_itau
    FROM reconciliations
    WHERE date = v_target_date::date;

    IF v_saldo_bancos = 0 AND v_snapshot_found THEN
        v_saldo_bancos := COALESCE(v_snapshot.saldo_bancario, 0);
        v_saldo_bancos_positivo := COALESCE(v_snapshot.saldo_bancario, 0);
        v_saldo_negativo_itau := COALESCE(v_snapshot.saldo_negativo_itau, 0);
    END IF;

    -- 2. Dinheiro em Lojas e Maquininhas (Acumulado em trânsito com fidelidade histórica)
    SELECT COALESCE(SUM(amount), 0) INTO v_dinheiro_lojas
    FROM store_cash_vault
    WHERE entry_date <= v_target_date::date
      AND (
          status IN ('em_transito', 'pending') 
          OR (status = 'depositado' AND deposited_at::date > v_target_date::date)
      );

    SELECT 
        COALESCE(SUM(net_amount), 0),
        COALESCE(SUM(CASE WHEN transaction_type = 'devolucao' THEN gross_amount ELSE 0 END), 0)
    INTO v_cartoes_a_compensar, v_devolucoes_rede
    FROM pos_transactions
    WHERE COALESCE(target_date, occurred_at::date) = v_target_date::date;

    v_total_saldo_banco_positivo := v_saldo_bancos_positivo + v_dinheiro_lojas + v_cartoes_a_compensar - v_devolucoes_rede;
    v_total_saldo_banco := v_saldo_bancos;

    -- 3. Ativos Operacionais (Dinheiro MP e A Receber - Carry-over seguro)
    IF v_snapshot_found AND COALESCE(v_snapshot.dinheiro_mp, 0) > 0 THEN
        v_dinheiro_mp := v_snapshot.dinheiro_mp;
    ELSIF v_prev_snapshot.dinheiro_mp IS NOT NULL AND v_prev_snapshot.dinheiro_mp > 0 THEN
        v_dinheiro_mp := v_prev_snapshot.dinheiro_mp;
    ELSE
        v_dinheiro_mp := 0;
    END IF;

    IF v_snapshot_found AND COALESCE(v_snapshot.a_receber_manual, 0) > 0 THEN
        v_a_receber := v_snapshot.a_receber_manual;
    ELSIF v_prev_snapshot.a_receber_manual IS NOT NULL AND v_prev_snapshot.a_receber_manual > 0 THEN
        v_a_receber := v_prev_snapshot.a_receber_manual;
    ELSE
        v_a_receber := 0;
    END IF;

    -- Pátio Ativo (WIP)
    SELECT COALESCE(SUM(total_value - paid_value), 0) INTO v_na_loja_os
    FROM patio_os
    WHERE (status ILIKE '%aberto%' OR status ILIKE '%parcial%' OR status ILIKE '%pendente%' OR status = 'ABERTA' OR status = 'PENDENTE')
      AND opened_at::date <= v_target_date::date;

    IF (v_na_loja_os = 0 OR v_na_loja_os IS NULL) AND v_snapshot_found AND COALESCE(v_snapshot.total_patio, 0) > 0 THEN
        v_na_loja_os := v_snapshot.total_patio;
    ELSIF (v_na_loja_os = 0 OR v_na_loja_os IS NULL) AND v_prev_snapshot.total_patio IS NOT NULL AND v_prev_snapshot.total_patio > 0 THEN
        v_na_loja_os := v_prev_snapshot.total_patio;
    END IF;

    -- CANAL 1: TESOURARIA LÍQUIDA REAL (Sem WIP Pátio)
    v_caixa_tesouraria := (v_saldo_bancos_positivo + v_dinheiro_lojas + v_dinheiro_mp) - v_saldo_negativo_itau;
    v_status_tesouraria := CASE WHEN v_caixa_tesouraria >= 0 THEN 'equilibrado' ELSE 'descoberto' END;

    -- CANAL 2: PRODUÇÃO WIP & NEUTRALIZAÇÃO TEMPORAL (ΔP4)
    v_patio_wip := v_na_loja_os;
    v_variacao_patio_delta_p4 := v_na_loja_os - v_na_loja_os_anterior;

    -- Caixa Atual Consolidado (5 Pilares Canônicos)
    IF v_snapshot_found AND v_snapshot.is_closed AND NOT p_force_dynamic THEN
        v_caixa_atual := v_snapshot.caixa_atual;
    ELSE
        v_caixa_atual := (v_total_saldo_banco_positivo + v_dinheiro_mp + v_a_receber + v_na_loja_os) - v_saldo_negativo_itau;
    END IF;

    v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;

    -- =========================================================================
    -- FATURAMENTO DRE COM RECEITAS EXTRAS
    -- =========================================================================
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', id,
            'title', title,
            'description', description,
            'amount', amount,
            'store_id', store_id
        )), '[]'::jsonb)
    INTO v_faturamento_ajustes, v_faturamento_itens
    FROM daily_revenue_adjustments
    WHERE date = v_target_date::date;

    IF v_snapshot_found AND v_snapshot.faturamento > 0 THEN
        IF (v_snapshot.metadata->>'faturamento_oi_base')::numeric > 0 THEN
            v_faturamento_oi_base := (v_snapshot.metadata->>'faturamento_oi_base')::numeric;
        -- Subtração arbitrária eliminada soberanamente (Spec 391)
        ELSE
            v_faturamento_oi_base := v_snapshot.faturamento;
        END IF;
    ELSE
        SELECT COALESCE(SUM(gross_amount), 0) INTO v_faturamento_oi_base
        FROM pos_transactions
        WHERE COALESCE(target_date, occurred_at::date) = v_target_date::date;
    END IF;

    v_faturamento_periodo := v_faturamento_oi_base + v_faturamento_ajustes;
    v_valor_disp_contas := v_faturamento_periodo - v_fluxo_caixa;

    -- =========================================================================
    -- CONTAS A PAGAR (REATIVIDADE DE DAILY_MANUAL_BILLS)
    -- =========================================================================
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN category IN ('Pró-Labore', 'Distribuição Lucros', 'Extra') OR title ILIKE '%Pró-Labore%' OR title ILIKE '%Extra%' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN category NOT IN ('Pró-Labore', 'Distribuição Lucros', 'Extra') AND title NOT ILIKE '%Pró-Labore%' AND title NOT ILIKE '%Extra%' THEN amount ELSE 0 END), 0),
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', id,
            'title', title,
            'description', description,
            'amount', amount,
            'store_id', store_id,
            'category', category,
            'is_paid', (payment_date IS NOT NULL OR match_status = 'matched' OR matched_ofx_id IS NOT NULL),
            'external_code', external_code,
            'contabilizar_no_subtotal', COALESCE(contabilizar_no_subtotal, true)
        )), '[]'::jsonb)
    INTO v_total_bills, v_contas_extras, v_contas_imported_bills, v_contas_itens
    FROM daily_manual_bills
    WHERE date = v_target_date::date AND COALESCE(contabilizar_no_subtotal, true) = true;

    -- Prioriza a soma real de daily_manual_bills se existirem contas cadastradas
    IF v_total_bills > 0 THEN
        v_contas_base := v_contas_imported_bills;
        v_contas_manual := v_contas_base + v_contas_extras;
        v_juros_rede := COALESCE(v_snapshot.juros_rede, 0);
        IF v_snapshot_found AND (v_snapshot.metadata->>'has_contas_override')::boolean = true AND (v_snapshot.metadata->>'contas_manual_override')::numeric > 0 THEN
            v_contas_manual := (v_snapshot.metadata->>'contas_manual_override')::numeric;
        END IF;
        v_subtotal_contas := v_contas_manual + v_juros_rede;
    ELSIF v_snapshot_found AND (v_snapshot.metadata->>'subtotal_contas')::numeric > 0 THEN
        v_subtotal_contas := (v_snapshot.metadata->>'subtotal_contas')::numeric;
        v_contas_base := COALESCE((v_snapshot.metadata->>'contas_base')::numeric, v_subtotal_contas);
        v_contas_manual := v_subtotal_contas;
        v_juros_rede := COALESCE(v_snapshot.juros_rede, 0);
    ELSIF v_snapshot_found AND v_snapshot.contas_a_pagar > 0 THEN
        v_subtotal_contas := v_snapshot.contas_a_pagar;
        v_contas_base := v_snapshot.contas_a_pagar;
        v_contas_manual := v_snapshot.contas_a_pagar;
        v_juros_rede := COALESCE(v_snapshot.juros_rede, 0);
    ELSE
        v_contas_base := 0;
        v_contas_manual := 0;
        v_juros_rede := COALESCE(v_snapshot.juros_rede, 0);
        v_subtotal_contas := v_contas_manual + v_juros_rede;
    END IF;

    v_diferenca_final := v_valor_disp_contas - v_subtotal_contas;
    
    -- Respeita status_geral do snapshot fechado apenas se p_force_dynamic for falso
    IF v_snapshot_found AND v_snapshot.is_closed AND NOT p_force_dynamic AND (v_snapshot.metadata->>'status_geral') IS NOT NULL THEN
        v_status_geral := (v_snapshot.metadata->>'status_geral');
    ELSE
        v_status_geral := CASE WHEN ABS(v_diferenca_final) <= 50.00 THEN 'approved' ELSE 'divergent' END;
    END IF;

    -- Fast-Path Condicional Seguro (1-clique viável se todas as lojas alinhadas e sem desfalques)
    v_fast_path_eligible := (NOT v_has_divergent_stores) AND (ABS(v_diferenca_final) <= 50.00);

    RETURN jsonb_build_object(
        'date', v_target_date,
        'is_closed', COALESCE(v_snapshot.is_closed, false),
        'saldo_bancos_ofx', v_saldo_bancos,
        'saldo_bancos_positivo', v_saldo_bancos_positivo,
        'saldo_negativo_itau', v_saldo_negativo_itau,
        'dinheiro_lojas', v_dinheiro_lojas,
        'cartoes_a_compensar', v_cartoes_a_compensar,
        'devolucoes_rede', v_devolucoes_rede,
        'total_saldo_banco_positivo', v_total_saldo_banco_positivo,
        'total_saldo_banco', v_total_saldo_banco,
        'dinheiro_mp', v_dinheiro_mp,
        'a_receber', v_a_receber,
        'a_receber_manual', v_a_receber,
        'na_loja_os', v_na_loja_os,
        'total_patio', v_na_loja_os,
        'caixa_atual', v_caixa_atual,
        'caixa_anterior', v_caixa_anterior,
        'fluxo_caixa', v_fluxo_caixa,
        'odometro_hoje', COALESCE((v_snapshot.metadata->>'odometro_hoje')::numeric, 0),
        'faturamento_oi_base', v_faturamento_oi_base,
        'faturamento_anterior', v_faturamento_anterior,
        'faturamento_ajustes', v_faturamento_ajustes,
        'faturamento_periodo', v_faturamento_periodo,
        'faturamento', v_faturamento_periodo,
        'valor_disp_contas', v_valor_disp_contas,
        'contas_base', v_contas_base,
        'contas_extras', v_contas_extras,
        'contas_manual', v_contas_manual,
        'contas_a_pagar', v_subtotal_contas,
        'juros_rede', v_juros_rede,
        'subtotal_contas', v_subtotal_contas,
        'v_subtotal_contas', v_subtotal_contas,
        'diferenca_final', v_diferenca_final,
        'status_geral', v_status_geral,
        'faturamento_itens', v_faturamento_itens,
        'contas_itens', v_contas_itens,
        'stores_detail', v_stores_detail,
        'stores', v_stores_detail,
        -- Extensões Bicanais (Spec 359)
        'caixa_tesouraria', v_caixa_tesouraria,
        'status_tesouraria', v_status_tesouraria,
        'patio_wip', v_patio_wip,
        'variacao_patio_delta_p4', v_variacao_patio_delta_p4,
        'fast_path_eligible', v_fast_path_eligible
    );
END;
$$;




GRANT EXECUTE ON FUNCTION public.get_daily_reconciliation_summary(text, boolean) TO authenticated, service_role, anon;

-- 3. BACKFILL CORRETIVO PARA 10/09/2026:
-- As baixas já executadas de Santo André (R$ 3.000,00) e Jorge Beretta (R$ 220,00)
-- são creditadas no bank_total da respectiva filial na conciliação de 10/09/2026.
DO $$
BEGIN
    -- Atualiza Santo André (st-08): R$ 3.324,97 + R$ 3.000,00 = R$ 6.324,97
    UPDATE public.reconciliations
    SET bank_total = 6324.97
    WHERE store_id = 'st-08' AND date = '2026-09-10';

    -- Atualiza Jorge Beretta (st-03): R$ 55.400,75 + R$ 220,00 = R$ 55.620,75
    UPDATE public.reconciliations
    SET bank_total = 55620.75
    WHERE store_id = 'st-03' AND date = '2026-09-10';

    -- Sincroniza o snapshot de 10/09/2026:
    -- Saldo Bancos Positivo: 146.160,23 + 3.220,00 = 149.380,23
    -- Saldo Bancos Líquido OFX: 135.706,55 + 3.220,00 = 138.926,55
    -- Dinheiro em Lojas no Cofre: R$ 880,00 (Mauá R$ 380 + Jabaquara R$ 500)
    UPDATE public.daily_snapshots
    SET saldo_bancario = 138926.55,
        metadata = jsonb_set(
            jsonb_set(
                jsonb_set(
                    jsonb_set(
                        metadata,
                        '{dinheiro_lojas}', '880.00'::jsonb
                    ),
                    '{dinheiro_em_lojas}', '880.00'::jsonb
                ),
                '{saldo_bancos_positivo}', '149380.23'::jsonb
            ),
            '{saldo_bancos_ofx}', '138926.55'::jsonb
        ),
        updated_at = now()
    WHERE date = '2026-09-10';
END;
$$;
