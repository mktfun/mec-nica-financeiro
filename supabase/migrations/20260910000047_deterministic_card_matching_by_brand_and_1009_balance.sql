-- ============================================================================
-- Migration: 20260910000047_deterministic_card_matching_by_brand_and_1009_balance.sql
-- Spec: 394 - Motor Determinístico de Conciliação de Cartões por Bandeiras (Sem IA)
--              e Equalização Bancária Oficial de 10/09/2026 (R$ 154.794,67)
-- ============================================================================

-- 1. ENRIQUECIMENTO DA TABELA pos_transactions COM A COLUNA brand
ALTER TABLE public.pos_transactions 
  ADD COLUMN IF NOT EXISTS brand TEXT;

-- 2. BACKFILL DE BANDEIRAS E STATUS DE LIQUIDAÇÃO DETERMINÍSTICO EM 10/09/2026
-- Identifica as bandeiras a partir dos métodos de pagamento e descrições
UPDATE public.pos_transactions
SET brand = CASE 
    WHEN LOWER(COALESCE(payment_method, '') || ' ' || COALESCE(machine_name, '')) LIKE '%visa%' THEN 'Visa'
    WHEN LOWER(COALESCE(payment_method, '') || ' ' || COALESCE(machine_name, '')) LIKE '%mast%' THEN 'Mastercard'
    WHEN LOWER(COALESCE(payment_method, '') || ' ' || COALESCE(machine_name, '')) LIKE '%elo%' THEN 'Elo'
    WHEN LOWER(COALESCE(payment_method, '') || ' ' || COALESCE(machine_name, '')) LIKE '%hiper%' THEN 'Hipercard'
    ELSE 'Outros'
END
WHERE brand IS NULL;

-- Dom Pedro (st-01): Vendas de 10/09 (09/09 D+1) entraram integralmente no extrato (MAST R$ 10.911,47 + VISA R$ 9.539,20 = R$ 20.450,67)
UPDATE public.pos_transactions
SET settlement_status = 'entrou',
    settled_date = '2026-09-10',
    brand = CASE 
        WHEN gross_amount IN (8650.84, 820, 1927.5) THEN 'Mastercard'
        ELSE 'Visa'
    END
WHERE store_id = 'st-01' AND target_date = '2026-09-10';

-- Jorge Beretta (st-03): Venda de Mastercard (R$ 2.105,16) entrou integralmente no extrato (RECEBIMENTO REDE MAST R$ 2.105,16)
UPDATE public.pos_transactions
SET settlement_status = 'entrou',
    settled_date = '2026-09-10',
    brand = 'Mastercard'
WHERE store_id = 'st-03' AND target_date = '2026-09-10';

-- Mauá (3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f): Venda de Mastercard (R$ 1.802,34) entrou no extrato
UPDATE public.pos_transactions
SET settlement_status = 'entrou',
    settled_date = '2026-09-10',
    brand = 'Mastercard'
WHERE store_id = '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f' AND target_date = '2026-09-10';

-- Rudge Ramos (st-07): Vendas de Mastercard (R$ 3.112,34) entraram no extrato
UPDATE public.pos_transactions
SET settlement_status = 'entrou',
    settled_date = '2026-09-10',
    brand = 'Mastercard'
WHERE store_id = 'st-07' AND target_date = '2026-09-10';

-- Rei do Módulo (st-09): Vendas (R$ 10.002,23) entraram no extrato
UPDATE public.pos_transactions
SET settlement_status = 'entrou',
    settled_date = '2026-09-10',
    brand = CASE 
        WHEN gross_amount IN (3290, 900) THEN 'Mastercard'
        ELSE 'Visa'
    END
WHERE store_id = 'st-09' AND target_date = '2026-09-10';

-- Jabaquara (st-02): Venda Visa Débito (R$ 248,05) entrou no extrato
UPDATE public.pos_transactions
SET settlement_status = 'entrou',
    settled_date = '2026-09-10',
    brand = 'Visa'
WHERE store_id = 'st-02' AND target_date = '2026-09-10';

-- Piraporinha (st-05): Vendas de Visa (R$ 4.642,10) NÃO entraram no extrato bancário no dia 10/09 (NÃO ENTROU na planilha oficial)
UPDATE public.pos_transactions
SET settlement_status = 'nao_entrou',
    brand = 'Visa'
WHERE store_id = 'st-05' AND target_date = '2026-09-10';


-- ============================================================================
-- 3. EQUALIZAÇÃO OFICIAL DA TABELA reconciliations PARA 10/09/2026
-- Valores extraídos estritamente da aba SALDO da planilha oficial do cliente
-- ============================================================================
UPDATE public.reconciliations SET bank_total = 322.29 WHERE store_id = 'st-06' AND date = '2026-09-10'; -- Planalto (Linha 6)
UPDATE public.reconciliations SET bank_total = 744.55 WHERE store_id = 'st-05' AND date = '2026-09-10'; -- Piraporinha (Linha 17)
UPDATE public.reconciliations SET bank_total = 3756.96 WHERE store_id = '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f' AND date = '2026-09-10'; -- Mauá (Linha 27)
UPDATE public.reconciliations SET bank_total = 42492.36 WHERE store_id = 'st-04' AND date = '2026-09-10'; -- Kennedy (Linha 38)
UPDATE public.reconciliations SET bank_total = 7851.52 WHERE store_id = 'st-07' AND date = '2026-09-10'; -- Rudge Ramos (Linha 49)
UPDATE public.reconciliations SET bank_total = 3324.97 WHERE store_id = 'st-08' AND date = '2026-09-10'; -- Santo André (Linha 61)
UPDATE public.reconciliations SET bank_total = 14844.51 WHERE store_id = 'st-09' AND date = '2026-09-10'; -- Rei do Módulo (Linha 72)
UPDATE public.reconciliations SET bank_total = 55400.75 WHERE store_id = 'st-03' AND date = '2026-09-10'; -- Jorge Beretta (Linha 85)
UPDATE public.reconciliations SET bank_total = 20534.66 WHERE store_id = 'st-01' AND date = '2026-09-10'; -- Dom Pedro (Linha 100)
UPDATE public.reconciliations SET bank_total = -10453.68 WHERE store_id = 'st-02' AND date = '2026-09-10'; -- Jabaquara (Linha 114)


-- ============================================================================
-- 4. RPC DETERMINÍSTICA DE RECONCILIAÇÃO DE CARTÕES POR BANDEIRA NO POSTGRESQL
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reconcile_rede_with_ofx(p_date DATE)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated_count INT := 0;
    v_store RECORD;
    v_brand_rec RECORD;
    v_ofx_brand_total NUMERIC;
    v_pos_brand_total NUMERIC;
    v_ofx_store_total NUMERIC;
    v_pos_store_total NUMERIC;
BEGIN
    -- Itera sobre as lojas com vendas registradas na data alvo
    FOR v_store IN 
        SELECT DISTINCT TRIM(store_id::text) as store_id 
        FROM pos_transactions 
        WHERE COALESCE(target_date, occurred_at::date) = p_date
    LOOP
        -- 1. Match Agrupado por Bandeira
        FOR v_brand_rec IN 
            SELECT DISTINCT COALESCE(brand, 'Outros') as brand
            FROM pos_transactions
            WHERE TRIM(store_id::text) = v_store.store_id
              AND COALESCE(target_date, occurred_at::date) = p_date
        LOOP
            -- Soma créditos OFX da loja para a bandeira
            SELECT COALESCE(SUM(amount), 0) INTO v_ofx_brand_total
            FROM ofx_transactions
            WHERE TRIM(store_id::text) = v_store.store_id
              AND target_date = p_date
              AND type = 'in'
              AND (
                  (v_brand_rec.brand = 'Mastercard' AND (counterpart_name ILIKE '%MAST%' OR manual_category ILIKE '%MAST%')) OR
                  (v_brand_rec.brand = 'Visa' AND (counterpart_name ILIKE '%VISA%' OR manual_category ILIKE '%VISA%')) OR
                  (v_brand_rec.brand = 'Elo' AND (counterpart_name ILIKE '%ELO%' OR manual_category ILIKE '%ELO%')) OR
                  (v_brand_rec.brand = 'Hipercard' AND (counterpart_name ILIKE '%HIPER%' OR manual_category ILIKE '%HIPER%')) OR
                  (v_brand_rec.brand = 'Outros' AND (counterpart_name ILIKE '%REDE%' OR counterpart_name ILIKE '%CARD%'))
              );

            -- Soma vendas POS da loja para a bandeira
            SELECT COALESCE(SUM(net_amount), 0) INTO v_pos_brand_total
            FROM pos_transactions
            WHERE TRIM(store_id::text) = v_store.store_id
              AND COALESCE(target_date, occurred_at::date) = p_date
              AND COALESCE(brand, 'Outros') = v_brand_rec.brand;

            -- Se o crédito da bandeira cobrir o total de vendas da bandeira com tolerância de centavos
            IF v_pos_brand_total > 0 AND v_ofx_brand_total >= (v_pos_brand_total - 0.05) THEN
                UPDATE pos_transactions
                SET settlement_status = 'entrou',
                    settled_date = p_date,
                    updated_at = now()
                WHERE TRIM(store_id::text) = v_store.store_id
                  AND COALESCE(target_date, occurred_at::date) = p_date
                  AND COALESCE(brand, 'Outros') = v_brand_rec.brand
                  AND settlement_status != 'entrou';

                GET DIAGNOSTICS v_updated_count = ROW_COUNT;
            END IF;
        END LOOP;

        -- 2. Match Consolidado da Loja (Fallback caso créditos venham agrupados)
        SELECT COALESCE(SUM(amount), 0) INTO v_ofx_store_total
        FROM ofx_transactions
        WHERE TRIM(store_id::text) = v_store.store_id
          AND target_date = p_date
          AND type = 'in'
          AND (counterpart_name ILIKE '%REDE%' OR manual_category ILIKE '%REDE%' OR counterpart_name ILIKE '%CARD%');

        SELECT COALESCE(SUM(net_amount), 0) INTO v_pos_store_total
        FROM pos_transactions
        WHERE TRIM(store_id::text) = v_store.store_id
          AND COALESCE(target_date, occurred_at::date) = p_date;

        IF v_pos_store_total > 0 AND v_ofx_store_total >= (v_pos_store_total - 0.05) THEN
            UPDATE pos_transactions
            SET settlement_status = 'entrou',
                settled_date = p_date,
                updated_at = now()
            WHERE TRIM(store_id::text) = v_store.store_id
              AND COALESCE(target_date, occurred_at::date) = p_date
              AND settlement_status != 'entrou';
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'target_date', p_date,
        'message', 'Reconciliação determinística de cartões por bandeira concluída com sucesso'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconcile_rede_with_ofx(DATE) TO authenticated, service_role, anon;


-- ============================================================================
-- 5. ATUALIZAÇÃO DA RPC get_daily_reconciliation_summary
-- Filtro estrito de cartoes_a_compensar e cálculo de nao_entrou_valor canônico
-- ============================================================================
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
    v_prev_date text;
    v_snapshot record;
    v_prev_snapshot record;
    v_snapshot_found boolean := false;
    v_saldo_bancos numeric := 0;
    v_saldo_bancos_positivo numeric := 0;
    v_saldo_negativo_itau numeric := 0;
    v_dinheiro_lojas numeric := 0;
    v_cartoes_a_compensar numeric := 0;
    v_dinheiro_mp numeric := 0;
    v_a_receber numeric := 0;
    v_na_loja_os numeric := 0;
    v_na_loja_os_anterior numeric := 0;
    v_caixa_atual numeric := 0;
    v_caixa_anterior numeric := 0;
    v_fluxo_caixa numeric := 0;
    v_total_saldo_banco numeric := 0;
    v_total_saldo_banco_positivo numeric := 0;
    v_subtotal_contas numeric := 0;
    v_valor_disp_contas numeric := 0;
    v_contas_base numeric := 0;
    v_contas_extras numeric := 0;
    v_contas_manual numeric := 0;
    v_diferenca_final numeric := 0;
    v_juros_rede numeric := 0;
    v_devolucoes_rede numeric := 0;
    v_status_geral text := 'approved';
    v_has_divergent_stores boolean := false;
    v_stores_detail jsonb := '[]'::jsonb;
    v_contas_itens jsonb := '[]'::jsonb;
    v_faturamento_itens jsonb := '[]'::jsonb;
    v_faturamento_ajustes numeric := 0;
    v_faturamento_periodo numeric := 0;
    v_faturamento_anterior numeric := 0;
    v_odometro_hoje numeric := 0;
    v_faturamento_oi_base numeric := 0;
    v_caixa_tesouraria numeric := 0;
    v_status_tesouraria text := 'equilibrado';
    v_patio_wip numeric := 0;
    v_variacao_patio_delta_p4 numeric := 0;
    v_fast_path_eligible boolean := false;
BEGIN
    -- Calcula data anterior útil/corrente
    v_prev_date := to_char(v_target_date::date - interval '1 day', 'YYYY-MM-DD');

    -- Tenta obter snapshots salvos para base histórica
    SELECT * INTO v_snapshot FROM daily_snapshots WHERE date = v_target_date::date;
    IF FOUND THEN
        v_snapshot_found := true;
    END IF;

    SELECT * INTO v_prev_snapshot FROM daily_snapshots WHERE date = v_prev_date::date;
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
    ),
    pos_unsettled_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(net_amount), 0) as total_unsettled
        FROM pos_transactions
        WHERE COALESCE(target_date, occurred_at::date) = v_target_date::date
          AND settlement_status IN ('nao_entrou', 'a_compensar')
        GROUP BY TRIM(store_id::text)
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'store_id', s.id,
        'store_name', s.name,
        'saldo_banco', COALESCE(rt.bank_total, rl.bank_total, 0),
        'saldo_banco_itau', COALESCE(rt.bank_total, rl.bank_total, 0),
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
        -- Apuração Canônica por Loja (Anti-Duplicação):
        'nao_entrou_valor', GREATEST(0, COALESCE(rd.rede_liquido, 0) - COALESCE(oe.ofx_maquininhas, 0)),
        'status_compensacao', CASE 
            WHEN GREATEST(0, COALESCE(rd.rede_liquido, 0) - COALESCE(oe.ofx_maquininhas, 0)) <= 0.05 THEN 'entrou'
            WHEN COALESCE(oe.ofx_maquininhas, 0) > 0 THEN 'parcial'
            WHEN COALESCE(rd.rede_liquido, 0) = 0 THEN 'sem_movimento'
            ELSE 'nao_entrou'
        END,
        'entradas_justificadas', COALESCE(oe.entradas_justificadas, 0),
        'entradas_orfas', COALESCE(oe.entradas_orfas, 0),
        'entradas_conciliadas', (COALESCE(oe.ofx_maquininhas, 0) + COALESCE(oe.pix_total, 0) + COALESCE(oe.entradas_justificadas, 0)),
        'dif_entradas', COALESCE(oe.entradas_orfas, 0),
        'ofx_saidas_total', COALESCE(sofx.ofx_saidas_total, 0),
        'saidas_justificadas', COALESCE(sofx.saidas_justificadas, 0),
        'saidas_orfas', COALESCE(sofx.saidas_orfas, 0),
        'contas_loja_total', COALESCE(bst.contas_loja_total, 0),
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
    LEFT JOIN vault_items_agg vi ON vi.store_id = s.id
    LEFT JOIN pos_unsettled_agg pu ON pu.store_id = s.id;

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

    -- 2. Dinheiro em Lojas e Maquininhas a Compensar
    SELECT COALESCE(SUM(amount), 0) INTO v_dinheiro_lojas
    FROM store_cash_vault
    WHERE entry_date <= v_target_date::date
      AND (
          status IN ('em_transito', 'pending') 
          OR (status = 'depositado' AND deposited_at::date > v_target_date::date)
      );

    -- Vendas de cartão genuinamente pendentes (sem crédito OFX correspondente)
    SELECT 
        COALESCE(SUM(net_amount), 0),
        COALESCE(SUM(CASE WHEN transaction_type = 'devolucao' THEN gross_amount ELSE 0 END), 0)
    INTO v_cartoes_a_compensar, v_devolucoes_rede
    FROM pos_transactions
    WHERE COALESCE(target_date, occurred_at::date) = v_target_date::date
      AND settlement_status IN ('nao_entrou', 'a_compensar');

    -- Se não houver vendas marcadas explicitamente como nao_entrou mas houver diferença no batimento com OFX
    IF v_cartoes_a_compensar = 0 THEN
        SELECT COALESCE(SUM((elem->>'nao_entrou_valor')::numeric), 0)
        INTO v_cartoes_a_compensar
        FROM jsonb_array_elements(v_stores_detail) elem;
    END IF;

    v_total_saldo_banco_positivo := v_saldo_bancos_positivo + v_dinheiro_lojas + v_cartoes_a_compensar - v_devolucoes_rede;
    v_total_saldo_banco := v_saldo_bancos;

    -- 3. Ativos Operacionais (Dinheiro MP e A Receber)
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
        v_faturamento_periodo := v_snapshot.faturamento;
        v_faturamento_oi_base := v_snapshot.faturamento - v_faturamento_ajustes;
    ELSE
        SELECT COALESCE(SUM(paid_value), 0) INTO v_faturamento_oi_base
        FROM patio_os
        WHERE closed_at::date = v_target_date::date;

        v_faturamento_periodo := v_faturamento_oi_base + v_faturamento_ajustes;
    END IF;

    -- =========================================================================
    -- CONTAS A PAGAR CONSOLIDADAS
    -- =========================================================================
    SELECT 
        COALESCE(SUM(b.amount), 0),
        COALESCE(SUM(CASE WHEN b.origem = 'manual' THEN b.amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN b.origem = 'extra' OR b.origem = 'imposto' THEN b.amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN b.origem NOT IN ('manual', 'extra', 'imposto') OR b.origem IS NULL THEN b.amount ELSE 0 END), 0),
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', b.id,
            'title', b.title,
            'amount', b.amount,
            'store_id', b.store_id,
            'origem', b.origem,
            'status', b.status,
            'matched_ofx_id', b.matched_ofx_id
        )), '[]'::jsonb)
    INTO v_subtotal_contas, v_contas_manual, v_contas_extras, v_contas_base, v_contas_itens
    FROM daily_manual_bills b
    WHERE b.date = v_target_date::date
      AND COALESCE(b.contabilizar_no_subtotal, true) = true;

    IF v_subtotal_contas = 0 AND v_snapshot_found AND v_snapshot.contas_a_pagar > 0 THEN
        v_subtotal_contas := v_snapshot.contas_a_pagar;
    END IF;

    -- Juros / Taxas da Rede
    SELECT COALESCE(SUM(fee_amount), 0) INTO v_juros_rede
    FROM pos_transactions
    WHERE COALESCE(target_date, occurred_at::date) = v_target_date::date;

    v_valor_disp_contas := v_saldo_bancos_positivo + v_dinheiro_lojas;
    v_diferenca_final := v_valor_disp_contas - v_subtotal_contas;

    IF v_has_divergent_stores THEN
        v_status_geral := 'divergence';
    ELSE
        v_status_geral := 'approved';
    END IF;

    -- Fast-path eligibility (Spec 371)
    v_fast_path_eligible := (NOT v_has_divergent_stores) AND (v_caixa_tesouraria >= 0);

    RETURN jsonb_build_object(
        'date', v_target_date,
        'is_closed', COALESCE(v_snapshot.is_closed, false),
        'saldo_bancos_ofx', v_saldo_bancos,
        'total_saldo_banco', v_total_saldo_banco,
        'saldo_bancos_positivo', v_saldo_bancos_positivo,
        'saldo_negativo_itau', v_saldo_negativo_itau,
        'dinheiro_lojas', v_dinheiro_lojas,
        'cartoes_a_compensar', v_cartoes_a_compensar,
        'devolucoes_rede', v_devolucoes_rede,
        'total_saldo_banco_positivo', v_total_saldo_banco_positivo,
        'dinheiro_mp', v_dinheiro_mp,
        'a_receber', v_a_receber,
        'a_receber_manual', v_a_receber,
        'na_loja_os', v_na_loja_os,
        'total_patio', v_na_loja_os,
        'caixa_atual', v_caixa_atual,
        'caixa_anterior', v_caixa_anterior,
        'fluxo_caixa', v_fluxo_caixa,
        'faturamento_periodo', v_faturamento_periodo,
        'faturamento_anterior', v_faturamento_anterior,
        'faturamento_ajustes', v_faturamento_ajustes,
        'faturamento_oi_base', v_faturamento_oi_base,
        'odometro_hoje', v_odometro_hoje,
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
        'caixa_tesouraria', v_caixa_tesouraria,
        'status_tesouraria', v_status_tesouraria,
        'patio_wip', v_patio_wip,
        'variacao_patio_delta_p4', v_variacao_patio_delta_p4,
        'fast_path_eligible', v_fast_path_eligible
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_daily_reconciliation_summary(text, boolean) TO authenticated, service_role, anon;


-- ============================================================================
-- 6. SINCRONIZAÇÃO DEFINITIVA DO SNAPSHOT DE 10/09/2026
-- Saldo Bancário Positivo: R$ 149.272,57
-- Dinheiro no Cofre: R$ 880,00
-- Cartões a Compensar: R$ 4.642,10
-- Total Ativos Holding: R$ 154.794,67 (100% alinhado com a planilha oficial)
-- ============================================================================
UPDATE public.daily_snapshots
SET saldo_bancario = 138818.89, -- 149272.57 - 10453.68 (Jabaquara negativo)
    cartoes_a_compensar = 4642.10,
    metadata = jsonb_set(
        jsonb_set(
            jsonb_set(
                jsonb_set(
                    jsonb_set(
                        metadata,
                        '{dinheiro_lojas}', '880.00'::jsonb
                    ),
                    '{dinheiro_em_lojas}', '880.00'::jsonb
                ),
                '{saldo_bancos_positivo}', '149272.57'::jsonb
            ),
            '{saldo_bancos_ofx}', '138818.89'::jsonb
        ),
        '{cartoes_a_compensar}', '4642.10'::jsonb
    ),
    updated_at = now()
WHERE date = '2026-09-10';
