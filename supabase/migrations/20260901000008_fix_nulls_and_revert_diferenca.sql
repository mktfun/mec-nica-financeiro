-- Fix NULLs in transaction_type and Revert Diferenca formula
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
    
    v_saldo_bancos numeric := 0; v_saldo_bancos_positivo numeric := 0; v_saldo_negativo_itau numeric := 0;
    v_dinheiro_lojas numeric := 0; v_cartoes_a_compensar numeric := 0; v_devolucoes_rede numeric := 0;
    v_total_saldo_banco numeric := 0; v_total_saldo_banco_positivo numeric := 0; v_dinheiro_mp numeric := 0;
    v_a_receber numeric := 0; v_na_loja_os numeric := 0; v_caixa_atual numeric := 0; v_caixa_anterior numeric := 0;
    v_fluxo_caixa numeric := 0; v_faturamento_oi_base numeric := 0; v_faturamento_ajustes numeric := 0;
    v_faturamento_periodo numeric := 0; v_faturamento_anterior numeric := 0; v_faturamento_itens jsonb := '[]'::jsonb;
    v_valor_disp_contas numeric := 0; v_contas_base numeric := 0; v_contas_extras numeric := 0;
    v_contas_manual numeric := 0; v_total_bills numeric := 0; v_contas_imported_bills numeric := 0;
    v_juros_rede numeric := 0; v_subtotal_contas numeric := 0; v_diferenca_final numeric := 0;
    v_status_geral text := 'divergent'; v_contas_itens jsonb := '[]'::jsonb;
    v_total_entradas_ofx numeric := 0; v_total_saidas_ofx numeric := 0;
    v_triple_recon jsonb; v_stores_detail jsonb := '[]'::jsonb;
BEGIN
    SELECT * INTO v_snapshot FROM daily_snapshots WHERE date = v_target_date;
    IF FOUND THEN v_snapshot_found := true; END IF;

    -- =========================================================================
    -- APURAÇÃO DAS CTEs (TRIM e COALESCE em transaction_type)
    -- =========================================================================
    WITH rede_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(CASE WHEN COALESCE(transaction_type, '') != 'devolucao' THEN gross_amount ELSE 0 END), 0) as rede_bruto,
            COALESCE(SUM(CASE WHEN COALESCE(transaction_type, '') != 'devolucao' THEN net_amount ELSE 0 END), 0) as rede_liquido,
            COALESCE(SUM(CASE WHEN COALESCE(transaction_type, '') != 'devolucao' THEN fee_amount ELSE 0 END), 0) as rede_taxas,
            COALESCE(SUM(CASE WHEN COALESCE(transaction_type, '') = 'devolucao' THEN ABS(net_amount) ELSE 0 END), 0) as rede_devolucoes
        FROM pos_transactions
        WHERE target_date = v_target_date
        GROUP BY TRIM(store_id::text)
    ),
    ofx_rede_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(amount), 0) as ofx_maquininhas
        FROM ofx_transactions
        WHERE target_date = v_target_date AND type = 'in'
          AND (counterpart_name ILIKE '%REDE%' OR counterpart_name ILIKE '%REDECARD%' OR counterpart_name ILIKE '%CIELO%' OR counterpart_name ILIKE '%STONE%' OR counterpart_name ILIKE '%PAGSEGURO%' OR counterpart_name ILIKE '%GETNET%' OR fitid ILIKE '%REDE%' OR fitid ILIKE '%CIELO%' OR fitid ILIKE '%STONE%' OR fitid ILIKE '%PAGSEGURO%')
        GROUP BY TRIM(store_id::text)
    ),
    pix_agg AS (
        SELECT 
            TRIM(store_id::text) as store_id,
            COALESCE(SUM(amount), 0) as pix_total
        FROM ofx_transactions
        WHERE target_date = v_target_date AND type = 'in'
          AND (matched_os_number IS NOT NULL OR counterpart_name ILIKE '%PIX%' OR fitid ILIKE '%PIX%' OR fitid ILIKE '%TRANSF%')
          AND NOT (counterpart_name ILIKE '%REDE%' OR counterpart_name ILIKE '%REDECARD%' OR fitid ILIKE '%REDE%')
        GROUP BY TRIM(store_id::text)
    ),
    patio_agg AS (
        SELECT TRIM(store_id::text) as store_id, COALESCE(SUM(GREATEST(0, total_value - paid_value)), 0) as patio_total
        FROM patio_os
        WHERE opened_at <= (v_target_date || ' 23:59:59')::timestamp
          AND (closed_at IS NULL OR closed_at::date > v_target_date)
          AND LOWER(COALESCE(status, 'em_aberto')) NOT IN ('finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado')
          AND (COALESCE(total_value, 0) - COALESCE(paid_value, 0)) > 0.05
        GROUP BY TRIM(store_id::text)
    ),
    vault_agg AS (
        SELECT TRIM(store_id::text) as store_id, COALESCE(SUM(amount), 0) as vault_total
        FROM store_cash_vault
        WHERE entry_date <= v_target_date
          AND (status IN ('em_transito', 'pending') OR (status = 'depositado' AND deposited_at IS NOT NULL AND deposited_at::date > v_target_date))
        GROUP BY TRIM(store_id::text)
    ),
    recon_latest AS (
        SELECT DISTINCT ON (TRIM(store_id::text)) 
            TRIM(store_id::text) as store_id, bank_total, na_loja_os as historical_na_loja
        FROM reconciliations
        WHERE date <= v_target_date
        ORDER BY TRIM(store_id::text), date DESC
    )
    SELECT jsonb_agg(jsonb_build_object(
        'store_id', s.id,
        'store_name', s.name,
        'saldo_banco_ofx', COALESCE(r.bank_total, 0),
        'saldo_banco_itau', COALESCE(r.bank_total, 0),
        'saldo_banco', (COALESCE(r.bank_total, 0) + COALESCE(v.vault_total, 0) + GREATEST(0, COALESCE(rd.rede_liquido, 0) - COALESCE(o.ofx_maquininhas, 0))),
        'maquininha', COALESCE(rd.rede_liquido, 0),
        'rede_bruto', COALESCE(rd.rede_bruto, 0),
        'rede_liquido', COALESCE(rd.rede_liquido, 0),
        'rede_taxas', COALESCE(rd.rede_taxas, 0),
        'ofx_maquininhas', COALESCE(o.ofx_maquininhas, 0),
        'nao_entrou_valor', GREATEST(0, COALESCE(rd.rede_liquido, 0) - COALESCE(o.ofx_maquininhas, 0)),
        'pix', COALESCE(px.pix_total, 0),
        'pix_os', COALESCE(px.pix_total, 0),
        'na_loja_os', COALESCE(p.patio_total, r.historical_na_loja, 0),
        'patio_os', COALESCE(p.patio_total, r.historical_na_loja, 0),
        'dinheiro_loja', COALESCE(v.vault_total, 0),
        'previsto_ofx', (COALESCE(rd.rede_liquido, 0) + COALESCE(px.pix_total, 0)),
        'diferenca', (COALESCE(rd.rede_liquido, 0) + COALESCE(px.pix_total, 0)) - (COALESCE(o.ofx_maquininhas, 0) + COALESCE(px.pix_total, 0)),
        'status_compensacao', CASE 
            WHEN COALESCE(rd.rede_liquido, 0) = 0 AND COALESCE(o.ofx_maquininhas, 0) = 0 THEN 'sem_movimento'
            WHEN GREATEST(0, COALESCE(rd.rede_liquido, 0) - COALESCE(o.ofx_maquininhas, 0)) = 0 THEN 'entrou'
            WHEN COALESCE(o.ofx_maquininhas, 0) > 0 AND GREATEST(0, COALESCE(rd.rede_liquido, 0) - COALESCE(o.ofx_maquininhas, 0)) > 0 THEN 'parcial'
            ELSE 'a_compensar'
        END,
        'status', CASE WHEN ABS((COALESCE(rd.rede_liquido, 0) + COALESCE(px.pix_total, 0)) - (COALESCE(o.ofx_maquininhas, 0) + COALESCE(px.pix_total, 0))) <= 0.05 THEN 'approved' ELSE 'divergence' END
    ))
    INTO v_stores_detail
    FROM stores s
    LEFT JOIN recon_latest r ON r.store_id = TRIM(s.id::text)
    LEFT JOIN rede_agg rd ON rd.store_id = TRIM(s.id::text)
    LEFT JOIN ofx_rede_agg o ON o.store_id = TRIM(s.id::text)
    LEFT JOIN pix_agg px ON px.store_id = TRIM(s.id::text)
    LEFT JOIN patio_agg p ON p.store_id = TRIM(s.id::text)
    LEFT JOIN vault_agg v ON v.store_id = TRIM(s.id::text)
    WHERE s.active = true;

    -- =========================================================================
    -- RAMAL 1: SNAPSHOT FECHADO (Leitura O-1 Imutável)
    -- =========================================================================
    IF v_snapshot_found AND v_snapshot.is_closed = true AND p_force_dynamic = false THEN
        v_saldo_bancos := COALESCE(v_snapshot.saldo_bancario, 0);
        v_saldo_bancos_positivo := COALESCE((v_snapshot.metadata->>'saldo_bancos_positivo')::numeric, v_saldo_bancos);
        v_saldo_negativo_itau := COALESCE(v_snapshot.saldo_negativo_itau, (v_snapshot.metadata->>'saldo_negativo_itau')::numeric, 0);

        IF v_saldo_bancos = 0 THEN
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
        END IF;

        v_dinheiro_mp := COALESCE(v_snapshot.dinheiro_mp, 0);
        v_a_receber := COALESCE(v_snapshot.a_receber_manual, 0);
        v_na_loja_os := COALESCE(v_snapshot.total_patio, 0);
        v_caixa_atual := COALESCE(v_snapshot.caixa_atual, 0);
        v_caixa_anterior := COALESCE(v_snapshot.caixa_anterior, 0);
        v_fluxo_caixa := COALESCE(v_snapshot.fluxo_caixa, 0);
        v_faturamento_oi_base := COALESCE(v_snapshot.faturamento, 0);
        v_faturamento_anterior := COALESCE(v_snapshot.faturamento_anterior, 0);
        v_faturamento_periodo := COALESCE(v_snapshot.faturamento_periodo, 0);
        v_valor_disp_contas := COALESCE(v_snapshot.valor_disponivel, 0);
        v_contas_base := COALESCE(v_snapshot.contas_a_pagar, 0);
        
        v_total_entradas_ofx := COALESCE((v_snapshot.metadata->>'total_entradas_ofx')::numeric, 0);
        v_total_saidas_ofx := COALESCE((v_snapshot.metadata->>'total_saidas_ofx')::numeric, 0);
        v_faturamento_ajustes := COALESCE((v_snapshot.metadata->>'faturamento_ajustes')::numeric, 0);
        v_contas_extras := COALESCE((v_snapshot.metadata->>'contas_extras')::numeric, 0);
        v_contas_manual := COALESCE((v_snapshot.metadata->>'contas_manual')::numeric, 0);
        v_subtotal_contas := COALESCE((v_snapshot.metadata->>'subtotal_contas')::numeric, 0);
        v_diferenca_final := COALESCE((v_snapshot.metadata->>'diferenca_final')::numeric, 0);
        v_status_geral := COALESCE(v_snapshot.metadata->>'status_geral', 'divergent');
        
        v_dinheiro_lojas := COALESCE((v_snapshot.metadata->>'dinheiro_lojas')::numeric, 0);
        v_cartoes_a_compensar := COALESCE((v_snapshot.metadata->>'cartoes_a_compensar')::numeric, 0);
        v_devolucoes_rede := COALESCE((v_snapshot.metadata->>'devolucoes_rede')::numeric, 0);
        v_juros_rede := COALESCE(v_snapshot.juros_rede, 0);

        v_triple_recon := COALESCE(v_snapshot.metadata->'triple_recon', '{}'::jsonb);
        v_faturamento_itens := COALESCE(v_snapshot.metadata->'faturamento_itens', '[]'::jsonb);
        v_contas_itens := COALESCE(v_snapshot.metadata->'contas_itens', '[]'::jsonb);
        
        v_total_saldo_banco_positivo := v_saldo_bancos_positivo + v_dinheiro_lojas + v_cartoes_a_compensar - v_devolucoes_rede;
        v_total_saldo_banco := v_saldo_bancos + v_dinheiro_lojas + v_cartoes_a_compensar - v_devolucoes_rede;

        IF v_snapshot.metadata->'stores' IS NOT NULL AND jsonb_array_length(v_snapshot.metadata->'stores') > 0 THEN
            IF (v_snapshot.metadata->'stores'->0->>'saldo_banco')::numeric = 0 AND (v_stores_detail->0->>'saldo_banco')::numeric > 0 THEN
                NULL;
            ELSE
                v_stores_detail := v_snapshot.metadata->'stores';
            END IF;
        END IF;

        RETURN jsonb_build_object(
            'date', v_target_date,
            'is_closed', true,
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
            'na_loja_os', v_na_loja_os,
            'caixa_atual', v_caixa_atual,
            'caixa_anterior', v_caixa_anterior,
            'fluxo_caixa', v_fluxo_caixa,
            'faturamento_oi_base', v_faturamento_oi_base,
            'faturamento_anterior', v_faturamento_anterior,
            'faturamento_ajustes', v_faturamento_ajustes,
            'faturamento_periodo', v_faturamento_periodo,
            'valor_disp_contas', v_valor_disp_contas,
            'contas_base', v_contas_base,
            'contas_extras', v_contas_extras,
            'contas_manual', v_contas_manual,
            'juros_rede', v_juros_rede,
            'subtotal_contas', v_subtotal_contas,
            'diferenca_final', v_diferenca_final,
            'status_geral', v_status_geral,
            'total_entradas_ofx', v_total_entradas_ofx,
            'total_saidas_ofx', v_total_saidas_ofx,
            'stores', COALESCE(v_stores_detail, '[]'::jsonb),
            'stores_detail', COALESCE(v_stores_detail, '[]'::jsonb),
            'triple_recon', v_triple_recon,
            'faturamento_itens', v_faturamento_itens,
            'contas_itens', v_contas_itens
        );
    END IF;

    -- =========================================================================
    -- RAMAL 2: DIA ABERTO / DRAFT (Cálculo Dinâmico Canônico)
    -- =========================================================================

    -- 1. Saldo Bancário Consolidado (10 contas Itaú)
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

    -- 2. Dinheiro MP
    IF v_snapshot.dinheiro_mp IS NOT NULL AND v_snapshot.dinheiro_mp > 0 THEN
        v_dinheiro_mp := v_snapshot.dinheiro_mp;
    ELSE
        SELECT COALESCE(dinheiro_mp, 0) INTO v_dinheiro_mp FROM daily_snapshots WHERE date <= v_target_date AND dinheiro_mp > 0 ORDER BY date DESC LIMIT 1;
    END IF;

    -- 3. A Receber
    IF v_snapshot.a_receber_manual IS NOT NULL AND v_snapshot.a_receber_manual > 0 THEN
        v_a_receber := v_snapshot.a_receber_manual;
    ELSE
        SELECT COALESCE(a_receber_manual, 0) INTO v_a_receber FROM daily_snapshots WHERE date <= v_target_date AND a_receber_manual > 0 ORDER BY date DESC LIMIT 1;
    END IF;

    -- 4. Na Loja OS (Pátio)
    SELECT COALESCE(SUM(na_loja_os), 0)
    INTO v_na_loja_os
    FROM (
        SELECT DISTINCT ON (store_id) store_id, na_loja_os
        FROM reconciliations
        WHERE date <= v_target_date
        ORDER BY store_id, date DESC
    ) latest_patio;

    IF v_na_loja_os = 0 AND v_snapshot.total_patio IS NOT NULL THEN
        v_na_loja_os := v_snapshot.total_patio;
    END IF;

    -- 5. Caixa Anterior e Faturamento Anterior
    SELECT COALESCE(caixa_atual, 0), COALESCE(faturamento, 0)
    INTO v_caixa_anterior, v_faturamento_anterior
    FROM daily_snapshots
    WHERE date < v_target_date
    ORDER BY date DESC
    LIMIT 1;

    -- 6. Faturamento (Odômetro & Ajustes)
    IF v_snapshot_found AND v_snapshot.faturamento IS NOT NULL AND v_snapshot.faturamento > 0 THEN
        v_faturamento_oi_base := v_snapshot.faturamento;
    ELSE
        SELECT COALESCE(SUM(total_value), 0)
        INTO v_faturamento_oi_base
        FROM patio_os
        WHERE opened_at::date <= v_target_date;
    END IF;

    IF v_faturamento_anterior > 0 AND v_faturamento_oi_base >= v_faturamento_anterior THEN
        v_faturamento_periodo := v_faturamento_oi_base - v_faturamento_anterior;
    ELSIF v_faturamento_oi_base < v_faturamento_anterior AND v_faturamento_oi_base > 0 THEN
        v_faturamento_periodo := v_faturamento_oi_base;
    ELSE
        v_faturamento_periodo := 0;
    END IF;

    SELECT 
        COALESCE(SUM(CASE WHEN type = 'addition' THEN amount WHEN type = 'deduction' THEN -amount ELSE 0 END), 0),
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', id,
            'title', title,
            'amount', amount,
            'type', type,
            'description', description
        )), '[]'::jsonb)
    INTO v_faturamento_ajustes, v_faturamento_itens
    FROM daily_revenue_adjustments
    WHERE date = v_target_date;

    v_faturamento_periodo := v_faturamento_periodo + v_faturamento_ajustes;

    -- 7. Contas a Pagar
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN external_code IS NULL THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN external_code IS NOT NULL THEN amount ELSE 0 END), 0),
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', id,
            'title', title,
            'amount', amount,
            'category', category,
            'is_paid', (payment_date IS NOT NULL),
            'external_code', external_code
        )), '[]'::jsonb)
    INTO v_total_bills, v_contas_extras, v_contas_imported_bills, v_contas_itens
    FROM daily_manual_bills
    WHERE date = v_target_date;

    IF v_contas_imported_bills > 0 THEN
        v_contas_base := v_contas_imported_bills;
    ELSIF v_snapshot.contas_a_pagar IS NOT NULL AND v_snapshot.contas_a_pagar > 0 THEN
        v_contas_base := v_snapshot.contas_a_pagar;
    ELSE
        v_contas_base := 0;
    END IF;

    v_contas_manual := v_contas_base + v_contas_extras;

    -- 8. Conciliação Tripla e Lojas
    v_triple_recon := get_store_pos_triple_reconciliation(v_target_date::text);
    v_cartoes_a_compensar := COALESCE((v_triple_recon->>'total_nao_entrou')::numeric, 0);
    v_devolucoes_rede := COALESCE((v_triple_recon->>'total_rede_devolucoes')::numeric, 0);
    v_juros_rede := COALESCE(v_snapshot.juros_rede, 0);

    -- 9. Dinheiro em Lojas (Cofre em Trânsito)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_dinheiro_lojas
    FROM store_cash_vault
    WHERE entry_date <= v_target_date
      AND (deposited_at IS NULL OR deposited_at::date > v_target_date)
      AND status IN ('em_transito', 'pending');

    IF v_dinheiro_lojas = 0 AND v_snapshot.metadata->>'dinheiro_em_lojas' IS NOT NULL THEN
        v_dinheiro_lojas := (v_snapshot.metadata->>'dinheiro_em_lojas')::numeric;
    END IF;

    -- 10. Totais Canônicos
    v_total_saldo_banco_positivo := v_saldo_bancos_positivo + v_dinheiro_lojas + v_cartoes_a_compensar - v_devolucoes_rede;
    v_total_saldo_banco := v_saldo_bancos + v_dinheiro_lojas + v_cartoes_a_compensar - v_devolucoes_rede;

    v_caixa_atual := (v_total_saldo_banco_positivo + v_dinheiro_mp + v_a_receber + v_na_loja_os) - v_saldo_negativo_itau;

    v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;
    v_valor_disp_contas := v_faturamento_periodo - v_fluxo_caixa;
    v_subtotal_contas := v_contas_manual + v_juros_rede + v_devolucoes_rede;
    v_diferenca_final := v_valor_disp_contas - v_subtotal_contas;

    IF ABS(v_diferenca_final) <= 50.00 THEN
        v_status_geral := 'balanced';
    ELSE
        v_status_geral := 'divergent';
    END IF;
    
    SELECT 
        COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END), 0)
    INTO v_total_entradas_ofx, v_total_saidas_ofx
    FROM ofx_transactions
    WHERE target_date = v_target_date;

    RETURN jsonb_build_object(
        'date', v_target_date,
        'is_closed', false,
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
        'na_loja_os', v_na_loja_os,
        'caixa_atual', v_caixa_atual,
        'caixa_anterior', v_caixa_anterior,
        'fluxo_caixa', v_fluxo_caixa,
        'faturamento_oi_base', v_faturamento_oi_base,
        'faturamento_anterior', v_faturamento_anterior,
        'faturamento_ajustes', v_faturamento_ajustes,
        'faturamento_periodo', v_faturamento_periodo,
        'valor_disp_contas', v_valor_disp_contas,
        'contas_base', v_contas_base,
        'contas_extras', v_contas_extras,
        'contas_manual', v_contas_manual,
        'juros_rede', v_juros_rede,
        'subtotal_contas', v_subtotal_contas,
        'diferenca_final', v_diferenca_final,
        'status_geral', v_status_geral,
        'total_entradas_ofx', v_total_entradas_ofx,
        'total_saidas_ofx', v_total_saidas_ofx,
        'triple_recon', v_triple_recon,
        'stores', COALESCE(v_stores_detail, '[]'::jsonb),
        'stores_detail', COALESCE(v_stores_detail, '[]'::jsonb),
        'faturamento_itens', v_faturamento_itens,
        'contas_itens', v_contas_itens
    );
END;
$$;
