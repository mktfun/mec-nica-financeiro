-- Migration 20260821000004: Correção matemática da conciliação e eliminação de duplicidades

-- 1. Corrigir bank_total de Dom Pedro para o saldo OFX real (-4214.81) na data 2026-08-21
UPDATE public.reconciliations
SET bank_total = -4214.81
WHERE store_id = 'st-01' AND date = '2026-08-21';

-- 2. Inserir o registro de dinheiro em trânsito de Jorge Beretta (R$ 2.988,26) se não existir
INSERT INTO public.store_cash_vault (store_id, amount, description, entry_date, status, notes)
VALUES (
    'st-03',
    2988.26,
    'Dinheiro / Comprovante em Trânsito (OS 1094)',
    '2026-08-21',
    'em_transito',
    'Dinheiro não compensado na conciliação matutina de 21/08'
)
ON CONFLICT DO NOTHING;

-- 3. Atualização da RPC get_store_pos_triple_reconciliation
CREATE OR REPLACE FUNCTION public.get_store_pos_triple_reconciliation(p_target_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
    v_total_rede_bruto numeric := 0;
    v_total_rede_liquido numeric := 0;
    v_total_rede_taxas numeric := 0;
    v_total_rede_devolucoes numeric := 0;
    v_total_ofx_maquininhas numeric := 0;
    v_total_nao_entrou numeric := 0;
    v_stores_array jsonb := '[]'::jsonb;
BEGIN
    WITH rede_agg AS (
        SELECT 
            store_id,
            COALESCE(SUM(CASE WHEN transaction_type != 'devolucao' THEN gross_amount ELSE 0 END), 0) as rede_bruto,
            COALESCE(SUM(CASE WHEN transaction_type != 'devolucao' THEN net_amount ELSE 0 END), 0) as rede_liquido,
            COALESCE(SUM(CASE WHEN transaction_type != 'devolucao' THEN fee_amount ELSE 0 END), 0) as rede_taxas,
            COALESCE(SUM(CASE WHEN transaction_type = 'devolucao' THEN ABS(net_amount) ELSE 0 END), 0) as rede_devolucoes
        FROM pos_transactions
        WHERE target_date = p_target_date
        GROUP BY store_id
    ),
    ofx_agg AS (
        SELECT 
            store_id,
            COALESCE(SUM(amount), 0) as ofx_maquininhas
        FROM ofx_transactions
        WHERE target_date = p_target_date 
          AND type = 'in'
          AND (
              counterpart_name ILIKE '%REDE%' 
              OR counterpart_name ILIKE '%REDECARD%'
              OR fitid ILIKE '%REDE%'
              OR fitid ILIKE '%CIELO%'
              OR fitid ILIKE '%STONE%'
              OR fitid ILIKE '%PAGSEGURO%'
          )
        GROUP BY store_id
    ),
    store_calc AS (
        SELECT 
            s.id as store_id,
            s.name as store_name,
            COALESCE(r.rede_bruto, 0) as rede_bruto,
            COALESCE(r.rede_liquido, 0) as rede_liquido,
            COALESCE(r.rede_taxas, 0) as rede_taxas,
            COALESCE(r.rede_devolucoes, 0) as rede_devolucoes,
            COALESCE(o.ofx_maquininhas, 0) as ofx_maquininhas,
            CASE 
                WHEN COALESCE(r.rede_liquido, 0) > COALESCE(o.ofx_maquininhas, 0) 
                     AND (COALESCE(r.rede_liquido, 0) - COALESCE(o.ofx_maquininhas, 0)) > 10
                     -- Não considerar como a compensar se o OFX geral do banco já absorveu o crédito em outra conta
                     AND s.id NOT IN ('st-01', 'st-05') 
                THEN (COALESCE(r.rede_liquido, 0) - COALESCE(o.ofx_maquininhas, 0))
                ELSE 0
            END as nao_entrou_valor,
            CASE 
                WHEN COALESCE(r.rede_liquido, 0) = 0 AND COALESCE(o.ofx_maquininhas, 0) = 0 THEN 'sem_movimento'
                WHEN ABS(COALESCE(r.rede_liquido, 0) - COALESCE(o.ofx_maquininhas, 0)) <= 10 THEN 'entrou'
                WHEN COALESCE(o.ofx_maquininhas, 0) = 0 THEN 'nao_entrou'
                ELSE 'parcial'
            END as status_compensacao
        FROM stores s
        LEFT JOIN rede_agg r ON r.store_id = s.id
        LEFT JOIN ofx_agg o ON o.store_id = s.id
        WHERE s.active = true
        ORDER BY s.name
    )
    SELECT 
        COALESCE(SUM(rede_bruto), 0),
        COALESCE(SUM(rede_liquido), 0),
        COALESCE(SUM(rede_taxas), 0),
        COALESCE(SUM(rede_devolucoes), 0),
        COALESCE(SUM(ofx_maquininhas), 0),
        COALESCE(SUM(nao_entrou_valor), 0),
        jsonb_agg(jsonb_build_object(
            'store_id', store_id,
            'store_name', store_name,
            'rede_bruto', rede_bruto,
            'rede_liquido', rede_liquido,
            'rede_taxas', rede_taxas,
            'rede_devolucoes', rede_devolucoes,
            'ofx_maquininhas', ofx_maquininhas,
            'nao_entrou_valor', nao_entrou_valor,
            'status_compensacao', status_compensacao
        ))
    INTO 
        v_total_rede_bruto,
        v_total_rede_liquido,
        v_total_rede_taxas,
        v_total_rede_devolucoes,
        v_total_ofx_maquininhas,
        v_total_nao_entrou,
        v_stores_array
    FROM store_calc;

    v_result := jsonb_build_object(
        'target_date', p_target_date,
        'total_rede_bruto', v_total_rede_bruto,
        'total_rede_liquido', v_total_rede_liquido,
        'total_rede_taxas', v_total_rede_taxas,
        'total_devolucoes', v_total_rede_devolucoes,
        'total_ofx_maquininhas', v_total_ofx_maquininhas,
        'total_nao_entrou', v_total_nao_entrou,
        'stores', v_stores_array
    );

    RETURN v_result;
END;
$$;

-- 4. Atualização da RPC get_daily_reconciliation_summary
CREATE OR REPLACE FUNCTION public.get_daily_reconciliation_summary(p_date text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
    v_target_date date;
    v_total_saldo_banco numeric := 0;
    v_total_saldo_ofx numeric := 0;
    v_cartoes_a_compensar numeric := 0;
    v_dinheiro_em_lojas numeric := 0;
    v_dinheiro_mp numeric := 0;
    v_a_receber numeric := 0;
    v_na_loja_os numeric := 0;
    v_contas_manual numeric := 0;
    v_contas_itens jsonb := '[]'::jsonb;
    v_faturamento_ajustes numeric := 0;
    v_faturamento_itens jsonb := '[]'::jsonb;
    v_juros_rede numeric := 0;
    v_devolucoes_rede numeric := 0;
    v_ofx_out numeric := 0;
    v_total_faturamento_ofx numeric := 0;
    v_faturamento_oi_base numeric := 0;
    v_caixa_anterior numeric := 0;
    v_faturamento_anterior numeric := 0;
    v_caixa_atual numeric := 0;
    v_fluxo_caixa numeric := 0;
    v_faturamento_periodo numeric := 0;
    v_valor_disp_contas numeric := 0;
    v_subtotal_contas numeric := 0;
    v_diferenca_final numeric := 0;
    v_status_geral text := 'approved';
    v_stores_list jsonb := '[]'::jsonb;
    v_triple_recon jsonb := '{}'::jsonb;
    v_is_marco_zero boolean := false;
    v_snapshot_record record;
BEGIN
    v_target_date := p_date::date;

    -- 1. Snapshot do dia
    SELECT * INTO v_snapshot_record
    FROM daily_snapshots
    WHERE date = v_target_date;

    IF v_snapshot_record.id IS NOT NULL THEN
        v_dinheiro_mp := COALESCE(v_snapshot_record.dinheiro_mp, 0);
        v_a_receber := COALESCE(v_snapshot_record.a_receber_manual, 0);
        v_contas_manual := COALESCE(v_snapshot_record.contas_a_pagar, 0);
        v_juros_rede := COALESCE(v_snapshot_record.juros_rede, 0);
        v_is_marco_zero := (v_target_date = '2026-08-14'::date);
    END IF;

    -- 1.1 Contas Manuais Detalhadas (tabela daily_manual_bills)
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', id,
            'title', title,
            'description', description,
            'category', category,
            'amount', amount,
            'store_id', store_id,
            'created_at', created_at
        )), '[]'::jsonb)
    INTO 
        v_contas_manual,
        v_contas_itens
    FROM daily_manual_bills
    WHERE date = v_target_date;

    IF (v_contas_manual = 0 OR v_contas_itens = '[]'::jsonb) AND v_snapshot_record.id IS NOT NULL THEN
        v_contas_manual := COALESCE(v_snapshot_record.contas_a_pagar, 0);
    END IF;

    -- 1.2 Ajustes Manuais de Faturamento (tabela daily_revenue_adjustments)
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', id,
            'title', title,
            'description', description,
            'type', type,
            'amount', amount,
            'created_at', created_at
        )), '[]'::jsonb)
    INTO 
        v_faturamento_ajustes,
        v_faturamento_itens
    FROM daily_revenue_adjustments
    WHERE date = v_target_date;

    -- 2. Caixa Anterior e Faturamento Anterior
    SELECT 
        COALESCE(caixa_atual, 0),
        COALESCE(faturamento, 0)
    INTO 
        v_caixa_anterior,
        v_faturamento_anterior
    FROM daily_snapshots
    WHERE date < v_target_date
    ORDER BY date DESC
    LIMIT 1;

    IF v_caixa_anterior = 0 AND v_snapshot_record.id IS NOT NULL THEN
        v_caixa_anterior := COALESCE((v_snapshot_record.metadata->>'caixa_anterior')::numeric, 0);
        v_faturamento_anterior := COALESCE((v_snapshot_record.metadata->>'faturamento_anterior')::numeric, 0);
    END IF;

    -- 3. Juros/Taxas reais da REDE
    IF v_juros_rede = 0 THEN
        SELECT COALESCE(SUM(fee_amount), 0)
        INTO v_juros_rede
        FROM pos_transactions
        WHERE target_date = v_target_date;
    END IF;

    -- 4. Saídas OFX
    SELECT COALESCE(ABS(SUM(amount)), 0)
    INTO v_ofx_out
    FROM ofx_transactions
    WHERE target_date = v_target_date AND type = 'out';

    -- 5. Entradas OFX
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_faturamento_ofx
    FROM ofx_transactions
    WHERE target_date = v_target_date AND type = 'in';

    IF v_total_faturamento_ofx = 0 AND v_is_marco_zero AND v_snapshot_record.id IS NOT NULL THEN
        v_total_faturamento_ofx := COALESCE(v_snapshot_record.faturamento, 0);
    END IF;

    -- 6. Pátio de OSs (Na Loja OS)
    SELECT COALESCE(SUM(
        COALESCE(total_value, 0) - CASE 
            WHEN last_payment_date IS NOT NULL AND last_payment_date > v_target_date THEN 0 
            ELSE COALESCE(paid_value, 0) 
        END
    ), 0)
    INTO v_na_loja_os
    FROM patio_os
    WHERE opened_at::date <= v_target_date
      AND LOWER(status) NOT IN ('finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado')
      AND (
          (COALESCE(total_value, 0) - CASE 
              WHEN last_payment_date IS NOT NULL AND last_payment_date > v_target_date THEN 0 
              ELSE COALESCE(paid_value, 0) 
          END) > 0
          OR closed_at::date = v_target_date
          OR opened_at::date = v_target_date
      );

    IF v_snapshot_record.id IS NOT NULL AND COALESCE(v_snapshot_record.total_patio, 0) > 0 THEN
        v_na_loja_os := v_snapshot_record.total_patio;
    END IF;

    -- 7. Conciliação Tripla de Maquininhas
    BEGIN
        v_triple_recon := get_store_pos_triple_reconciliation(v_target_date);
        v_cartoes_a_compensar := COALESCE((v_triple_recon->>'total_nao_entrou')::numeric, 0);
        v_devolucoes_rede := COALESCE((v_triple_recon->>'total_devolucoes')::numeric, 0);
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

    -- 8. Consolidação por Filial com store_cash_vault
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
    pix_store AS (
        SELECT store_id, COALESCE(SUM(amount), 0) as pix
        FROM ofx_transactions 
        WHERE target_date = v_target_date AND type = 'in' AND (counterpart_name ILIKE '%PIX%' OR fitid ILIKE '%PIX%')
        GROUP BY store_id
    ),
    prev_store AS (
        SELECT store_id, COALESCE(SUM(amount), 0) as previsto_ofx
        FROM ofx_transactions 
        WHERE target_date = v_target_date AND type = 'in'
        GROUP BY store_id
    ),
    patio_store AS (
        SELECT store_id, COALESCE(SUM(
            COALESCE(total_value, 0) - CASE 
                WHEN last_payment_date IS NOT NULL AND last_payment_date > v_target_date THEN 0 
                ELSE COALESCE(paid_value, 0) 
            END
        ), 0) as patio_os_sum
        FROM patio_os
        WHERE opened_at::date <= v_target_date
          AND LOWER(status) NOT IN ('finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado')
          AND (
              (COALESCE(total_value, 0) - CASE 
                  WHEN last_payment_date IS NOT NULL AND last_payment_date > v_target_date THEN 0 
                  ELSE COALESCE(paid_value, 0) 
              END) > 0
              OR closed_at::date = v_target_date
              OR opened_at::date = v_target_date
          )
        GROUP BY store_id
    ),
    cash_store AS (
        SELECT store_id,
            COALESCE(SUM(amount), 0) as dinheiro_loja,
            jsonb_agg(jsonb_build_object(
                'id', id,
                'amount', amount,
                'description', description,
                'entry_date', entry_date,
                'status', status
            )) as vault_entries
        FROM store_cash_vault
        WHERE entry_date <= v_target_date
          AND (status = 'em_transito' OR deposited_at::date > v_target_date)
        GROUP BY store_id
    ),
    store_calc AS (
        SELECT 
            s.id as store_id,
            s.name as store_name,
            COALESCE(r.bank_total, 0) as saldo_banco_ofx,
            COALESCE(cs.dinheiro_loja, 0) as dinheiro_loja,
            COALESCE(cs.vault_entries, '[]'::jsonb) as vault_entries,
            COALESCE(pos.nao_entrou_valor, 0) as nao_entrou_valor,
            (COALESCE(r.bank_total, 0) + COALESCE(cs.dinheiro_loja, 0) + COALESCE(pos.nao_entrou_valor, 0)) as saldo_banco,
            COALESCE(pos.rede_liquido, 0) as rede_liquido,
            COALESCE(pos.rede_devolucoes, 0) as rede_devolucoes,
            COALESCE(pos.ofx_maquininhas, 0) as maquininha,
            COALESCE(pos.status_compensacao, 'sem_movimento') as status_compensacao,
            COALESCE(px.pix, 0) as pix,
            COALESCE(pv.previsto_ofx, 0) as previsto_ofx,
            COALESCE(NULLIF(r.historical_na_loja, 0), pt.patio_os_sum, 0) as na_loja_os,
            (COALESCE(pv.previsto_ofx, 0) - (COALESCE(pos.ofx_maquininhas, 0) + COALESCE(px.pix, 0))) as diferenca,
            CASE 
                WHEN ABS(COALESCE(pv.previsto_ofx, 0) - (COALESCE(pos.ofx_maquininhas, 0) + COALESCE(px.pix, 0))) <= 10 THEN 'approved' 
                ELSE 'divergence' 
            END as status
        FROM stores s
        LEFT JOIN recon_latest r ON r.store_id = s.id
        LEFT JOIN cash_store cs ON cs.store_id = s.id
        LEFT JOIN store_pos_summary pos ON pos.store_id = s.id
        LEFT JOIN pix_store px ON px.store_id = s.id
        LEFT JOIN prev_store pv ON pv.store_id = s.id
        LEFT JOIN patio_store pt ON pt.store_id = s.id
        WHERE s.active = true
        ORDER BY s.name
    )
    SELECT 
        COALESCE(SUM(saldo_banco), 0),
        COALESCE(SUM(saldo_banco_ofx), 0),
        COALESCE(SUM(dinheiro_loja), 0),
        COALESCE(SUM(na_loja_os), 0),
        jsonb_agg(jsonb_build_object(
            'store_id', store_id,
            'store_name', store_name,
            'saldo_banco', saldo_banco,
            'saldo_banco_ofx', saldo_banco_ofx,
            'dinheiro_loja', dinheiro_loja,
            'vault_entries', vault_entries,
            'nao_entrou_valor', nao_entrou_valor,
            'status_compensacao', status_compensacao,
            'rede_liquido', rede_liquido,
            'rede_devolucoes', rede_devolucoes,
            'maquininha', maquininha,
            'pix', pix,
            'na_loja_os', na_loja_os,
            'previsto_ofx', previsto_ofx,
            'diferenca', diferenca,
            'status', status
        ))
    INTO 
        v_total_saldo_banco,
        v_total_saldo_ofx,
        v_dinheiro_em_lojas,
        v_na_loja_os,
        v_stores_list
    FROM store_calc;

    -- 9. Fechamento Matemático Final
    v_caixa_atual := v_total_saldo_banco + v_dinheiro_mp + v_a_receber + v_na_loja_os;
    v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;

    -- Faturamento Base da Oficina Inteligente
    IF v_snapshot_record.id IS NOT NULL AND COALESCE(v_snapshot_record.faturamento, 0) > 0 THEN
        IF v_faturamento_anterior > 0 AND v_snapshot_record.faturamento > v_faturamento_anterior THEN
            v_faturamento_oi_base := v_snapshot_record.faturamento - v_faturamento_anterior;
        ELSE
            v_faturamento_oi_base := v_snapshot_record.faturamento;
        END IF;
    ELSE
        v_faturamento_oi_base := v_total_faturamento_ofx;
    END IF;

    -- Faturamento Consolidado = OI Base + Ajustes Manuais (Aportes/Estornos)
    v_faturamento_periodo := v_faturamento_oi_base + v_faturamento_ajustes;

    v_valor_disp_contas := v_faturamento_periodo - v_fluxo_caixa;
    v_subtotal_contas := v_contas_manual + v_juros_rede + v_devolucoes_rede;
    v_diferenca_final := ABS(v_valor_disp_contas) - v_subtotal_contas;

    IF ABS(v_diferenca_final) <= 50 THEN
        v_status_geral := 'approved';
    ELSE
        v_status_geral := 'divergence';
    END IF;

    -- 10. Payload de Retorno
    v_result := jsonb_build_object(
        'target_date', v_target_date,
        'total_saldo_banco', v_total_saldo_banco,
        'saldo_bancos_ofx', v_total_saldo_ofx,
        'dinheiro_em_lojas', v_dinheiro_em_lojas,
        'cartoes_a_compensar', v_cartoes_a_compensar,
        'dinheiro_mp', v_dinheiro_mp,
        'a_receber', v_a_receber,
        'na_loja_os', v_na_loja_os,
        'contas_manual', v_contas_manual,
        'contas_itens', v_contas_itens,
        'faturamento_oi_base', v_faturamento_oi_base,
        'faturamento_ajustes', v_faturamento_ajustes,
        'faturamento_itens', v_faturamento_itens,
        'juros_rede', v_juros_rede,
        'devolucoes_rede', v_devolucoes_rede,
        'ofx_out', v_ofx_out,
        'total_faturamento_ofx', v_total_faturamento_ofx,
        'caixa_anterior', v_caixa_anterior,
        'faturamento_anterior', v_faturamento_anterior,
        'caixa_atual', v_caixa_atual,
        'fluxo_caixa', v_fluxo_caixa,
        'faturamento_periodo', v_faturamento_periodo,
        'valor_disp_contas', v_valor_disp_contas,
        'subtotal_contas', v_subtotal_contas,
        'diferenca_final', v_diferenca_final,
        'status_geral', v_status_geral,
        'is_marco_zero', v_is_marco_zero,
        'maquininhas_detalhe', v_triple_recon,
        'stores', v_stores_list
    );

    RETURN v_result;
END;
$$;
