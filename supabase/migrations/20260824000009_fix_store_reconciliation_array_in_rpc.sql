-- ==============================================================================
-- MIGRATION: 20260824000009_fix_store_reconciliation_array_in_rpc.sql
-- DESCRIPTION: Garante emissão do array 'stores' com todas as propriedades
--              (saldo_banco, saldo_banco_ofx, dinheiro_loja, vault_entries, maquininha,
--              pix, na_loja_os, previsto_ofx, diferenca, etc.) para alimentar tanto
--              os cards de Fechamento por Filial quanto o modal SaldoBancosDetailModal.
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_daily_reconciliation_summary(p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_date date := p_date;
    v_saldo_bancos numeric := 0;
    v_saldo_negativo_itau numeric := 0;
    v_dinheiro_lojas numeric := 0;
    v_cartoes_a_compensar numeric := 0;
    v_devolucoes_rede numeric := 0;
    v_total_saldo_banco numeric := 0;
    v_dinheiro_mp numeric := 0;
    v_a_receber numeric := 0;
    v_na_loja_os numeric := 0;
    v_caixa_atual numeric := 0;
    v_caixa_anterior numeric := 0;
    v_fluxo_caixa numeric := 0;
    v_faturamento_oi_base numeric := 0;
    v_faturamento_ajustes numeric := 0;
    v_faturamento_periodo numeric := 0;
    v_valor_disp_contas numeric := 0;
    v_contas_base numeric := 0;
    v_contas_extras numeric := 0;
    v_contas_manual numeric := 0;
    v_juros_rede numeric := 0;
    v_subtotal_contas numeric := 0;
    v_diferenca_final numeric := 0;
    v_status_geral text := 'divergent';
    v_total_entradas_ofx numeric := 0;
    v_total_saidas_ofx numeric := 0;
    v_contas_itens jsonb := '[]'::jsonb;
    v_faturamento_itens jsonb := '[]'::jsonb;
    v_stores_detail jsonb := '[]'::jsonb;
    v_triple_recon jsonb := '{}'::jsonb;
    v_snapshot record;
BEGIN
    -- 1. Obter Snapshot diário (se existir)
    SELECT * INTO v_snapshot
    FROM daily_snapshots
    WHERE date = v_target_date;

    -- 2. Saldo Bancário Consolidado (10 contas Itaú)
    SELECT 
        COALESCE(SUM(bank_total), 0),
        COALESCE(SUM(CASE WHEN bank_total < 0 THEN ABS(bank_total) ELSE 0 END), 0)
    INTO v_saldo_bancos, v_saldo_negativo_itau
    FROM (
        SELECT DISTINCT ON (store_id) store_id, bank_total
        FROM reconciliations
        WHERE date <= v_target_date
        ORDER BY store_id, date DESC
    ) latest_recons;

    IF v_saldo_bancos = 0 AND v_snapshot.saldo_bancario IS NOT NULL THEN
        v_saldo_bancos := v_snapshot.saldo_bancario;
    END IF;

    -- 3. Entradas e Saídas do OFX do dia
    SELECT 
        COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END), 0)
    INTO v_total_entradas_ofx, v_total_saidas_ofx
    FROM ofx_transactions
    WHERE target_date = v_target_date;

    -- 4. Pátio de OSs
    SELECT COALESCE(SUM(GREATEST(0, COALESCE(total_value, 0) - COALESCE(paid_value, 0))), 0)
    INTO v_na_loja_os
    FROM patio_os
    WHERE opened_at <= (v_target_date || ' 23:59:59')::timestamp
      AND (closed_at IS NULL OR closed_at > (v_target_date || ' 23:59:59')::timestamp)
      AND LOWER(COALESCE(status, 'em_aberto')) NOT IN ('finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado');

    IF v_na_loja_os = 0 AND v_snapshot.total_patio IS NOT NULL THEN
        v_na_loja_os := v_snapshot.total_patio;
    END IF;

    -- 5. Caixa Anterior
    SELECT COALESCE(caixa_atual, 0)
    INTO v_caixa_anterior
    FROM daily_snapshots
    WHERE date < v_target_date
    ORDER BY date DESC
    LIMIT 1;

    IF v_caixa_anterior = 0 AND v_snapshot.metadata->>'caixa_anterior' IS NOT NULL THEN
        v_caixa_anterior := (v_snapshot.metadata->>'caixa_anterior')::numeric;
    END IF;

    -- 6. Faturamento base (OI), Dinheiro MP e A Receber
    v_dinheiro_mp := COALESCE(v_snapshot.dinheiro_mp, 0);
    v_a_receber := COALESCE(v_snapshot.a_receber_manual, 0);
    v_faturamento_oi_base := COALESCE(v_snapshot.faturamento, 0);
    v_juros_rede := COALESCE(v_snapshot.juros_rede, 0);

    -- Ajustes de Faturamento
    SELECT 
        COALESCE(SUM(amount), 0),
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

    v_faturamento_periodo := v_faturamento_oi_base + v_faturamento_ajustes;

    -- 7. Contas a Pagar: Desduplicação Determinística
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', id,
            'title', title,
            'amount', amount,
            'category', category,
            'description', description,
            'store_id', store_id
        )), '[]'::jsonb)
    INTO v_contas_extras, v_contas_itens
    FROM daily_manual_bills
    WHERE date = v_target_date;

    v_contas_base := COALESCE(v_snapshot.contas_a_pagar, 0);

    IF v_contas_extras > 0 THEN
        v_contas_manual := v_contas_extras;
    ELSE
        v_contas_manual := v_contas_base;
    END IF;

    -- 8. Dinheiro no Cofre e Cartões a Compensar
    SELECT COALESCE(SUM(amount), 0)
    INTO v_dinheiro_lojas
    FROM store_cash_vault
    WHERE entry_date <= v_target_date 
      AND status IN ('em_transito', 'pending');

    BEGIN
        v_triple_recon := get_store_pos_triple_reconciliation(v_target_date);
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

    -- 9. Consolidação por Filial com Previsto Canônico e Detalhamento Completo
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
    rede_store AS (
        SELECT store_id, COALESCE(SUM(amount), 0) as rede_in
        FROM ofx_transactions
        WHERE target_date = v_target_date AND type = 'in'
          AND (
            counterpart_name ILIKE '%REDE%' OR counterpart_name ILIKE '%CIELO%' OR 
            counterpart_name ILIKE '%GETNET%' OR counterpart_name ILIKE '%STONE%' OR 
            counterpart_name ILIKE '%REDECARD%' OR counterpart_name ILIKE '%MAST%' OR 
            counterpart_name ILIKE '%VISA%' OR counterpart_name ILIKE '%ELO%' OR 
            counterpart_name ILIKE '%PAGSEGURO%' OR counterpart_name ILIKE '%ADQ%' OR 
            counterpart_name ILIKE '%CART%' OR fitid ILIKE '%REDE%' OR fitid ILIKE '%CIELO%'
          )
        GROUP BY store_id
    ),
    pix_os_store AS (
        SELECT store_id, COALESCE(SUM(amount), 0) as pix_os
        FROM ofx_transactions
        WHERE target_date = v_target_date AND type = 'in'
          AND matched_os_number IS NOT NULL
          AND NOT (
            counterpart_name ILIKE '%REDE%' OR counterpart_name ILIKE '%CIELO%' OR 
            counterpart_name ILIKE '%GETNET%' OR counterpart_name ILIKE '%STONE%' OR 
            counterpart_name ILIKE '%REDECARD%' OR counterpart_name ILIKE '%MAST%' OR 
            counterpart_name ILIKE '%VISA%' OR counterpart_name ILIKE '%ELO%' OR 
            counterpart_name ILIKE '%PAGSEGURO%' OR counterpart_name ILIKE '%ADQ%' OR 
            counterpart_name ILIKE '%CART%' OR fitid ILIKE '%REDE%' OR fitid ILIKE '%CIELO%'
          )
        GROUP BY store_id
    ),
    justified_other_store AS (
        SELECT store_id, COALESCE(SUM(amount), 0) as justified_other
        FROM ofx_transactions
        WHERE target_date = v_target_date AND type = 'in'
          AND (manual_category IS NOT NULL OR manual_justification IS NOT NULL)
          AND matched_os_number IS NULL
          AND NOT (
            counterpart_name ILIKE '%REDE%' OR counterpart_name ILIKE '%CIELO%' OR 
            counterpart_name ILIKE '%GETNET%' OR counterpart_name ILIKE '%STONE%' OR 
            counterpart_name ILIKE '%REDECARD%' OR counterpart_name ILIKE '%MAST%' OR 
            counterpart_name ILIKE '%VISA%' OR counterpart_name ILIKE '%ELO%' OR 
            counterpart_name ILIKE '%PAGSEGURO%' OR counterpart_name ILIKE '%ADQ%' OR 
            counterpart_name ILIKE '%CART%' OR fitid ILIKE '%REDE%' OR fitid ILIKE '%CIELO%'
          )
        GROUP BY store_id
    ),
    ofx_in_store AS (
        SELECT store_id, COALESCE(SUM(amount), 0) as ofx_in_total
        FROM ofx_transactions
        WHERE target_date = v_target_date AND type = 'in'
        GROUP BY store_id
    ),
    patio_store AS (
        SELECT store_id, COALESCE(SUM(GREATEST(0, COALESCE(total_value, 0) - COALESCE(paid_value, 0))), 0) as patio_val
        FROM patio_os
        WHERE opened_at <= (v_target_date || ' 23:59:59')::timestamp
          AND (closed_at IS NULL OR closed_at > (v_target_date || ' 23:59:59')::timestamp)
          AND LOWER(COALESCE(status, 'em_aberto')) NOT IN ('finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado')
        GROUP BY store_id
    ),
    vault_store AS (
        SELECT 
            store_id, 
            COALESCE(SUM(amount), 0) as vault_val,
            COALESCE(jsonb_agg(jsonb_build_object(
                'id', id,
                'amount', amount,
                'description', description,
                'entry_date', entry_date,
                'status', status
            )), '[]'::jsonb) as vault_entries
        FROM store_cash_vault
        WHERE entry_date <= v_target_date AND status IN ('em_transito', 'pending')
        GROUP BY store_id
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'store_id', s.id,
        'store_name', s.name,
        'color', COALESCE(s.avatar_url, ''),
        
        -- Saldos Bancários (Itaú) e Dinheiro
        'saldo_banco', COALESCE(r.bank_total, 0),
        'saldo_banco_ofx', COALESCE(r.bank_total, 0),
        'bank_balance', COALESCE(r.bank_total, 0),
        'dinheiro_loja', COALESCE(v.vault_val, 0),
        'cash_vault', COALESCE(v.vault_val, 0),
        'vault_entries', COALESCE(v.vault_entries, '[]'::jsonb),
        
        -- Maquininhas & Rede
        'maquininha', COALESCE(rs.rede_in, ps.ofx_maquininhas, 0),
        'rede_bruto', COALESCE(ps.rede_bruto, 0),
        'rede_liquido', COALESCE(ps.rede_liquido, 0),
        'rede_devolucoes', COALESCE(ps.rede_devolucoes, 0),
        'rede_ofx', COALESCE(rs.rede_in, ps.ofx_maquininhas, 0),
        'cartoes_a_compensar', COALESCE(ps.nao_entrou_valor, 0),
        'nao_entrou_valor', COALESCE(ps.nao_entrou_valor, 0),
        'status_compensacao', COALESCE(ps.status_compensacao, 'sem_movimento'),
        
        -- PIX & Pátio
        'pix', COALESCE(pos.pix_os, 0),
        'pix_os_ofx', COALESCE(pos.pix_os, 0),
        'justified_other_ofx', COALESCE(jos.justified_other, 0),
        'na_loja_os', COALESCE(p.patio_val, r.historical_na_loja, 0),
        'patio_os', COALESCE(p.patio_val, r.historical_na_loja, 0),
        
        -- Conciliação da Loja
        'previsto_ofx', COALESCE(ois.ofx_in_total, 0),
        'diferenca', GREATEST(0, COALESCE(ois.ofx_in_total, 0) - COALESCE(rs.rede_in, 0) - COALESCE(pos.pix_os, 0) - COALESCE(jos.justified_other, 0)),
        'status', CASE 
            WHEN GREATEST(0, COALESCE(ois.ofx_in_total, 0) - COALESCE(rs.rede_in, 0) - COALESCE(pos.pix_os, 0) - COALESCE(jos.justified_other, 0)) <= 0.05 THEN 'approved' 
            ELSE 'divergence' 
        END
    ) ORDER BY s.name), '[]'::jsonb)
    INTO v_stores_detail
    FROM stores s
    LEFT JOIN recon_latest r ON r.store_id = s.id
    LEFT JOIN patio_store p ON p.store_id = s.id
    LEFT JOIN vault_store v ON v.store_id = s.id
    LEFT JOIN store_pos_summary ps ON ps.store_id = s.id
    LEFT JOIN rede_store rs ON rs.store_id = s.id
    LEFT JOIN pix_os_store pos ON pos.store_id = s.id
    LEFT JOIN justified_other_store jos ON jos.store_id = s.id
    LEFT JOIN ofx_in_store ois ON ois.store_id = s.id
    WHERE s.active = true;

    -- 10. Apuração Consolidada do Fechamento
    v_total_saldo_banco := v_saldo_bancos + v_dinheiro_lojas + v_cartoes_a_compensar;
    v_caixa_atual := v_total_saldo_banco + v_dinheiro_mp + v_a_receber + v_na_loja_os;
    v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;
    v_valor_disp_contas := v_faturamento_periodo - v_fluxo_caixa;
    v_subtotal_contas := v_contas_manual + v_juros_rede;
    v_diferenca_final := v_valor_disp_contas - v_subtotal_contas;

    IF ABS(v_diferenca_final) <= 50.00 THEN
        v_status_geral := 'approved';
    ELSE
        v_status_geral := 'divergent';
    END IF;

    -- 11. Retorno Estruturado Completo com stores e stores_detail
    RETURN jsonb_build_object(
        'date', v_target_date,
        'status_geral', v_status_geral,
        
        -- Pilares
        'saldo_bancos_ofx', v_saldo_bancos,
        'dinheiro_em_lojas', v_dinheiro_lojas,
        'cartoes_a_compensar', v_cartoes_a_compensar,
        'devolucoes_rede', v_devolucoes_rede,
        'total_saldo_banco', v_total_saldo_banco,
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
END;
$$;
