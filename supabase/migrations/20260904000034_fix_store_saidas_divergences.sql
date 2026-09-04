-- ============================================================================
-- Migration: 20260904000034_fix_store_saidas_divergences.sql
-- Spec: 370 - Correção Canônica das Divergências de Saídas por Filial (Kennedy, Santo André, Planalto)
-- Description:
-- 1. Saneia RPC public.get_daily_reconciliation_summary:
--    - Elimina a dupla contagem na linha de Saídas (somar contas_loja_total + saidas_justificadas).
--    - Aplica a fórmula canônica anti-dupla contagem para contas_conciliadas e dif_saidas.
--    - Atribui contas de holding (store_id IS NULL) vinculadas à filial pagadora na CTE bills_store_agg.
-- 2. Backfill determinístico de vínculos para Kennedy (st-04) e auto-link por valor nas demais lojas.
-- ============================================================================

-- 1. BACKFILL DETERMINÍSTICO PARA KENNEDY (st-04) EM 2026-09-04
DO $$
DECLARE
    bill_rec RECORD;
    v_ofx_id uuid;
BEGIN
    -- Vínculo 1: MP MASTER 2000.00 <-> ADELINO ALBINO DE SA
    UPDATE public.daily_manual_bills
    SET store_id = 'st-04',
        matched_ofx_id = '3920cf40-b71b-4804-894e-8d3dc5ea2728',
        match_status = 'matched',
        updated_at = now()
    WHERE id = '9ee3e256-60af-4b2b-a7db-71b6004e642d';

    UPDATE public.ofx_transactions
    SET matched_bill_id = '9ee3e256-60af-4b2b-a7db-71b6004e642d',
        manual_category = 'Conta / Despesa Filial',
        manual_justification = 'MP MASTER (Ref. Salário Zilda)',
        contabilizar_no_subtotal = true,
        updated_at = now()
    WHERE id = '3920cf40-b71b-4804-894e-8d3dc5ea2728';

    -- Vínculo 2: MP MASTER 1000.00 <-> LUIS HENRIQUE ALVES DA SILVA
    UPDATE public.daily_manual_bills
    SET store_id = 'st-04',
        matched_ofx_id = '5644ed40-e768-4a9d-85b3-d3aa591d7264',
        match_status = 'matched',
        updated_at = now()
    WHERE id = 'a8b54fa4-25d1-4468-a2c8-2e7d1f861019';

    UPDATE public.ofx_transactions
    SET matched_bill_id = 'a8b54fa4-25d1-4468-a2c8-2e7d1f861019',
        manual_category = 'Conta / Despesa Filial',
        manual_justification = 'MP MASTER (Auxílio Combustível Henrique)',
        contabilizar_no_subtotal = true,
        updated_at = now()
    WHERE id = '5644ed40-e768-4a9d-85b3-d3aa591d7264';

    -- Vínculo 3: MP MASTER 1000.00 <-> DANIEL ANTONELI DE SA
    UPDATE public.daily_manual_bills
    SET store_id = 'st-04',
        matched_ofx_id = 'ed79eb44-4881-43b6-81a8-feb8b8039a12',
        match_status = 'matched',
        updated_at = now()
    WHERE id = 'e3b72b7f-caf3-4841-8d7a-6d68d8952d9b';

    UPDATE public.ofx_transactions
    SET matched_bill_id = 'e3b72b7f-caf3-4841-8d7a-6d68d8952d9b',
        manual_category = 'Conta / Despesa Filial',
        manual_justification = 'MP MASTER (Auxílio Combustível Daniel)',
        contabilizar_no_subtotal = true,
        updated_at = now()
    WHERE id = 'ed79eb44-4881-43b6-81a8-feb8b8039a12';

    -- Vínculo 4: SKY AUTOMOTIVE 699.20 <-> PTD COMERCIO DE PECAS LTDA
    UPDATE public.daily_manual_bills
    SET store_id = 'st-04',
        matched_ofx_id = '24f3e83a-1752-4fd0-b1af-1344ffddf002',
        match_status = 'matched',
        updated_at = now()
    WHERE id = 'cf4ccd80-590f-451f-bca4-989a680bb1f9';

    UPDATE public.ofx_transactions
    SET matched_bill_id = 'cf4ccd80-590f-451f-bca4-989a680bb1f9',
        manual_category = 'Conta / Despesa Filial',
        manual_justification = 'SKY AUTOMOTIVE (120x Elaion 5W30)',
        contabilizar_no_subtotal = true,
        updated_at = now()
    WHERE id = '24f3e83a-1752-4fd0-b1af-1344ffddf002';

    -- Vínculo 5: DAVID DE OLIVEIRA SILVEIRA 300.00 <-> DAVID DE OLIVEIRA SILVEIRA
    UPDATE public.daily_manual_bills
    SET store_id = 'st-04',
        matched_ofx_id = '45d0906a-c00a-4eb6-9b16-f56e138c17bd',
        match_status = 'matched',
        updated_at = now()
    WHERE id = 'ecca33b3-c4fe-4748-a059-e244dbd6b4aa';

    UPDATE public.ofx_transactions
    SET matched_bill_id = 'ecca33b3-c4fe-4748-a059-e244dbd6b4aa',
        manual_category = 'Conta / Despesa Filial',
        manual_justification = 'DAVID DE OLIVEIRA SILVEIRA (Gestão Tech)',
        contabilizar_no_subtotal = true,
        updated_at = now()
    WHERE id = '45d0906a-c00a-4eb6-9b16-f56e138c17bd';

    -- Vínculo 6: BROOOW TECNOLOGIA 90.00 <-> FS OLIVEIRA LTDA
    UPDATE public.daily_manual_bills
    SET store_id = 'st-04',
        matched_ofx_id = 'd6414da9-c2f0-456d-a334-23be3276edb0',
        match_status = 'matched',
        updated_at = now()
    WHERE id = 'ac5946c3-97ac-4917-8e0e-4f84329dbd60';

    UPDATE public.ofx_transactions
    SET matched_bill_id = 'ac5946c3-97ac-4917-8e0e-4f84329dbd60',
        manual_category = 'Conta / Despesa Filial',
        manual_justification = 'BROOOW TECNOLOGIA (Cartucho impressora)',
        contabilizar_no_subtotal = true,
        updated_at = now()
    WHERE id = 'd6414da9-c2f0-456d-a334-23be3276edb0';

    -- Vínculo 7: FEMATH AUTO PEÇAS 1252.91 <-> FEMATH AUTO P D LTDA
    UPDATE public.daily_manual_bills
    SET matched_ofx_id = 'ecc35357-ce4c-49fd-a197-2eeb567a4d17',
        match_status = 'matched',
        updated_at = now()
    WHERE id = '5b9896b7-72f4-4a04-8c86-bed0c5d2115c';

    UPDATE public.ofx_transactions
    SET matched_bill_id = '5b9896b7-72f4-4a04-8c86-bed0c5d2115c',
        manual_category = 'Conta / Despesa Filial',
        manual_justification = 'FEMATH AUTO PEÇAS',
        contabilizar_no_subtotal = true,
        updated_at = now()
    WHERE id = 'ecc35357-ce4c-49fd-a197-2eeb567a4d17';

    -- Vínculo 8: BANCO ITAÚ 87.84 <-> ITAU - 7386175298
    UPDATE public.daily_manual_bills
    SET matched_ofx_id = '7ee990a0-6f2c-40d9-8b40-022c6b9e9d78',
        match_status = 'matched',
        updated_at = now()
    WHERE id = 'bc400e0a-32b4-42de-a8a7-f260fa8bba4b';

    UPDATE public.ofx_transactions
    SET matched_bill_id = 'bc400e0a-32b4-42de-a8a7-f260fa8bba4b',
        manual_category = 'Tarifa / Despesa Bancária',
        manual_justification = 'BANCO ITAÚ',
        contabilizar_no_subtotal = true,
        updated_at = now()
    WHERE id = '7ee990a0-6f2c-40d9-8b40-022c6b9e9d78';

    -- Vínculo Planalto: ESCAP SHOW 270.00
    UPDATE public.daily_manual_bills
    SET matched_ofx_id = '8af93dd8-0b95-40d1-8e42-479481755ebf',
        match_status = 'matched',
        updated_at = now()
    WHERE id = 'aeee40aa-8c2c-4a7d-a8d5-579a55f166ba';

    UPDATE public.ofx_transactions
    SET matched_bill_id = 'aeee40aa-8c2c-4a7d-a8d5-579a55f166ba',
        manual_category = 'Conta / Despesa Filial',
        manual_justification = 'ESCAP SHOW',
        contabilizar_no_subtotal = true,
        updated_at = now()
    WHERE id = '8af93dd8-0b95-40d1-8e42-479481755ebf';

    -- Vínculos Automáticos por Valor Exato nas demais lojas em 2026-09-04
    FOR bill_rec IN
        SELECT id, amount, store_id, recipient_name
        FROM public.daily_manual_bills
        WHERE date = '2026-09-04' AND matched_ofx_id IS NULL AND store_id IS NOT NULL
    LOOP
        SELECT id INTO v_ofx_id
        FROM public.ofx_transactions
        WHERE target_date = '2026-09-04' AND type = 'out' AND store_id = bill_rec.store_id
          AND matched_bill_id IS NULL AND ABS(ABS(amount) - bill_rec.amount) < 0.05
        LIMIT 1;

        IF v_ofx_id IS NOT NULL THEN
            UPDATE public.daily_manual_bills 
            SET matched_ofx_id = v_ofx_id, match_status = 'matched', updated_at = now()
            WHERE id = bill_rec.id;

            UPDATE public.ofx_transactions 
            SET matched_bill_id = bill_rec.id, 
                manual_category = 'Conta / Despesa Filial',
                manual_justification = bill_rec.recipient_name,
                contabilizar_no_subtotal = true,
                updated_at = now()
            WHERE id = v_ofx_id;
        END IF;
    END LOOP;
END;
$$;

-- 2. ATUALIZAÇÃO DA RPC CANÔNICA get_daily_reconciliation_summary
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
        v_faturamento_anterior := COALESCE(v_prev_snapshot.faturamento, 0);
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
        WHERE entry_date = v_target_date::date
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
    LEFT JOIN vault_agg v ON v.store_id = s.id;

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

    -- 2. Dinheiro em Lojas e Maquininhas
    SELECT COALESCE(SUM(amount), 0) INTO v_dinheiro_lojas
    FROM store_cash_vault
    WHERE entry_date = v_target_date::date;

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
        ELSIF v_faturamento_anterior > 0 AND v_snapshot.faturamento >= v_faturamento_anterior THEN
            v_faturamento_oi_base := v_snapshot.faturamento - v_faturamento_anterior;
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
