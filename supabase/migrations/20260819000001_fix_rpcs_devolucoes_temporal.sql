-- Migration: 20260819000001_fix_rpcs_devolucoes_temporal.sql
-- Description: Atualiza get_store_pos_triple_reconciliation e get_daily_reconciliation_summary com tratamento de devoluções e âncora temporal

-- 1. DROP para evitar conflito de assinaturas
DROP FUNCTION IF EXISTS public.get_store_pos_triple_reconciliation(date);
DROP FUNCTION IF EXISTS public.get_store_pos_triple_reconciliation(text);
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(date);
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(text);

-- 2. CREATE get_store_pos_triple_reconciliation
CREATE OR REPLACE FUNCTION public.get_store_pos_triple_reconciliation(p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
BEGIN
    WITH store_rede AS (
        SELECT 
            store_id,
            COALESCE(SUM(CASE WHEN transaction_type = 'venda' THEN gross_amount ELSE 0 END), 0) as rede_bruto,
            COALESCE(SUM(CASE WHEN transaction_type = 'venda' THEN net_amount ELSE 0 END), 0) as rede_liquido,
            COALESCE(SUM(fee_amount), 0) as rede_taxas,
            COALESCE(SUM(CASE WHEN transaction_type = 'devolucao' THEN ABS(net_amount) ELSE 0 END), 0) as rede_devolucoes,
            COUNT(*) as total_vendas
        FROM pos_transactions
        WHERE target_date = p_date
        GROUP BY store_id
    ),
    store_ofx AS (
        SELECT 
            store_id,
            COALESCE(SUM(amount), 0) as ofx_maquininhas,
            jsonb_agg(jsonb_build_object(
                'id', id,
                'amount', amount,
                'fitid', fitid,
                'counterpart', counterpart_name
            )) as ofx_transacoes
        FROM ofx_transactions
        WHERE target_date = p_date 
          AND type = 'in' 
          AND (
              counterpart_name ILIKE '%REDE%' 
              OR counterpart_name ILIKE '%CART%' 
              OR counterpart_name ILIKE '%CIELO%' 
              OR counterpart_name ILIKE '%MAQUINA%'
              OR fitid ILIKE '%REDE%' 
              OR fitid ILIKE '%CART%' 
              OR fitid ILIKE '%MAQUINA%'
          )
        GROUP BY store_id
    ),
    store_os_card AS (
        SELECT 
            store_id,
            COALESCE(SUM(COALESCE(credit_value, 0) + COALESCE(debit_value, 0) + COALESCE(paid_value, 0)), 0) as os_pago_total,
            jsonb_agg(jsonb_build_object(
                'id', id,
                'os_number', os_number,
                'plate', plate,
                'total_value', total_value,
                'paid_value', paid_value,
                'credit_value', credit_value,
                'debit_value', debit_value,
                'payment_method', payment_method,
                'status', status
            )) as os_transacoes
        FROM patio_os
        WHERE (opened_at::date = p_date OR closed_at::date = p_date)
          AND (
              payment_method ILIKE '%debito%' 
              OR payment_method ILIKE '%credito%' 
              OR payment_method ILIKE '%cartao%'
              OR payment_method ILIKE '%rede%'
              OR COALESCE(credit_value, 0) > 0
              OR COALESCE(debit_value, 0) > 0
          )
        GROUP BY store_id
    ),
    consolidation AS (
        SELECT 
            s.id as store_id,
            s.name as store_name,
            COALESCE(r.rede_bruto, 0) as rede_bruto,
            COALESCE(r.rede_liquido, 0) as rede_liquido,
            COALESCE(r.rede_taxas, 0) as rede_taxas,
            COALESCE(r.rede_devolucoes, 0) as rede_devolucoes,
            COALESCE(r.total_vendas, 0) as total_vendas_rede,
            COALESCE(o.ofx_maquininhas, 0) as ofx_maquininhas,
            COALESCE(o.ofx_transacoes, '[]'::jsonb) as ofx_transacoes,
            COALESCE(osc.os_pago_total, 0) as os_cartao_total,
            COALESCE(osc.os_transacoes, '[]'::jsonb) as os_cartao_transacoes,
            GREATEST(0, COALESCE(r.rede_liquido, 0) - COALESCE(o.ofx_maquininhas, 0)) as nao_entrou_valor,
            CASE 
                WHEN COALESCE(r.rede_liquido, 0) = 0 AND COALESCE(o.ofx_maquininhas, 0) = 0 AND COALESCE(r.rede_devolucoes, 0) = 0 THEN 'sem_movimento'
                WHEN ABS(COALESCE(r.rede_liquido, 0) - COALESCE(o.ofx_maquininhas, 0)) <= 10 THEN 'entrou'
                WHEN COALESCE(o.ofx_maquininhas, 0) >= COALESCE(r.rede_liquido, 0) THEN 'entrou'
                WHEN COALESCE(o.ofx_maquininhas, 0) > 0 AND COALESCE(r.rede_liquido, 0) > COALESCE(o.ofx_maquininhas, 0) THEN 'parcial'
                ELSE 'nao_entrou'
            END as status_compensacao
        FROM stores s
        LEFT JOIN store_rede r ON r.store_id = s.id
        LEFT JOIN store_ofx o ON o.store_id = s.id
        LEFT JOIN store_os_card osc ON osc.store_id = s.id
        WHERE s.active = true
        ORDER BY s.name
    )
    SELECT jsonb_build_object(
        'target_date', p_date,
        'total_rede_bruto', COALESCE(SUM(rede_bruto), 0),
        'total_rede_liquido', COALESCE(SUM(rede_liquido), 0),
        'total_rede_taxas', COALESCE(SUM(rede_taxas), 0),
        'total_devolucoes', COALESCE(SUM(rede_devolucoes), 0),
        'total_ofx_maquininhas', COALESCE(SUM(ofx_maquininhas), 0),
        'total_nao_entrou', COALESCE(SUM(nao_entrou_valor), 0),
        'stores', COALESCE(jsonb_agg(
            jsonb_build_object(
                'store_id', store_id,
                'store_name', store_name,
                'rede_bruto', rede_bruto,
                'rede_liquido', rede_liquido,
                'rede_taxas', rede_taxas,
                'rede_devolucoes', rede_devolucoes,
                'total_vendas_rede', total_vendas_rede,
                'ofx_maquininhas', ofx_maquininhas,
                'nao_entrou_valor', nao_entrou_valor,
                'status_compensacao', status_compensacao,
                'ofx_transacoes', ofx_transacoes,
                'os_cartao_total', os_cartao_total,
                'os_cartao_transacoes', os_cartao_transacoes
            )
        ), '[]'::jsonb)
    )
    INTO v_result
    FROM consolidation;

    RETURN v_result;
END;
$$;


-- 3. CREATE get_daily_reconciliation_summary
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
    v_dinheiro_mp numeric := 0;
    v_a_receber numeric := 0;
    v_na_loja_os numeric := 0;
    v_contas_manual numeric := 0;
    v_juros_rede numeric := 0;
    v_devolucoes_rede numeric := 0;
    v_ofx_out numeric := 0;
    v_total_faturamento_ofx numeric := 0;
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
    -- Cast seguro de texto para data
    v_target_date := p_date::date;

    -- 1. Obter snapshot do dia atual
    SELECT * INTO v_snapshot_record
    FROM daily_snapshots
    WHERE date = v_target_date;

    IF v_snapshot_record.id IS NOT NULL THEN
        v_dinheiro_mp := COALESCE(v_snapshot_record.dinheiro_mp, 0);
        v_a_receber := COALESCE(v_snapshot_record.a_receber_manual, 0);
        v_contas_manual := COALESCE(v_snapshot_record.contas_a_pagar, 0);
        v_juros_rede := COALESCE(v_snapshot_record.juros_rede, 0);
        v_is_marco_zero := (COALESCE(v_snapshot_record.total_patrimonio, 0) > 0) OR (v_target_date = '2026-08-14'::date);
    END IF;

    -- 2. Obter Caixa Anterior e Faturamento Anterior
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

    -- 3. Juros/Taxas reais da maquininha REDE
    IF v_juros_rede = 0 THEN
        SELECT COALESCE(SUM(fee_amount), 0)
        INTO v_juros_rede
        FROM pos_transactions
        WHERE target_date = v_target_date;
    END IF;

    -- 4. Total de Saídas (OFX Out)
    SELECT COALESCE(ABS(SUM(amount)), 0)
    INTO v_ofx_out
    FROM ofx_transactions
    WHERE target_date = v_target_date AND type = 'out';

    -- 5. Total de Entradas puras do OFX
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_faturamento_ofx
    FROM ofx_transactions
    WHERE target_date = v_target_date AND type = 'in';

    IF v_total_faturamento_ofx = 0 AND v_is_marco_zero AND v_snapshot_record.id IS NOT NULL THEN
        v_total_faturamento_ofx := COALESCE(v_snapshot_record.faturamento, 0);
    END IF;

    -- 6. OS ativas no Pátio (com âncora temporal no paid_value)
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
    v_na_loja_os := COALESCE(v_na_loja_os, 0);

    IF v_is_marco_zero AND v_na_loja_os = 0 AND v_snapshot_record.id IS NOT NULL THEN
        v_na_loja_os := COALESCE(v_snapshot_record.total_patio, 0);
    END IF;

    -- 7. Obter Conciliação Tripla de Maquininhas
    BEGIN
        v_triple_recon := get_store_pos_triple_reconciliation(v_target_date);
        v_cartoes_a_compensar := COALESCE((v_triple_recon->>'total_nao_entrou')::numeric, 0);
        v_devolucoes_rede := COALESCE((v_triple_recon->>'total_devolucoes')::numeric, 0);
    EXCEPTION WHEN OTHERS THEN
        v_triple_recon := '{"stores": [], "total_nao_entrou": 0, "total_devolucoes": 0}'::jsonb;
        v_cartoes_a_compensar := 0;
        v_devolucoes_rede := 0;
    END;

    -- Fallback para devoluções se triple recon não calculou
    IF v_devolucoes_rede = 0 THEN
        SELECT COALESCE(SUM(ABS(net_amount)), 0)
        INTO v_devolucoes_rede
        FROM pos_transactions
        WHERE target_date = v_target_date AND transaction_type = 'devolucao';
    END IF;

    -- 8. Consolidação por Loja
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
    store_calc AS (
        SELECT 
            s.id as store_id,
            s.name as store_name,
            COALESCE(r.bank_total, 0) as saldo_banco_ofx,
            COALESCE(pos.nao_entrou_valor, 0) as nao_entrou_valor,
            (COALESCE(r.bank_total, 0) + COALESCE(pos.nao_entrou_valor, 0)) as saldo_banco,
            COALESCE(pos.rede_liquido, 0) as rede_liquido,
            COALESCE(pos.rede_devolucoes, 0) as rede_devolucoes,
            COALESCE(pos.ofx_maquininhas, 0) as maquininha,
            COALESCE(pos.status_compensacao, 'sem_movimento') as status_compensacao,
            COALESCE(px.pix, 0) as pix,
            COALESCE(pv.previsto_ofx, 0) as previsto_ofx,
            COALESCE(pt.patio_os_sum, 0) as na_loja_os,
            (COALESCE(pv.previsto_ofx, 0) - (COALESCE(pos.ofx_maquininhas, 0) + COALESCE(px.pix, 0))) as diferenca,
            CASE 
                WHEN (COALESCE(pv.previsto_ofx, 0) - (COALESCE(pos.ofx_maquininhas, 0) + COALESCE(px.pix, 0))) >= -1 THEN 'approved' 
                ELSE 'divergence' 
            END as status
        FROM stores s
        LEFT JOIN recon_latest r ON r.store_id = s.id
        LEFT JOIN store_pos_summary pos ON pos.store_id = s.id
        LEFT JOIN pix_store px ON px.store_id = s.id
        LEFT JOIN prev_store pv ON pv.store_id = s.id
        LEFT JOIN patio_store pt ON pt.store_id = s.id
        WHERE s.active = true
        ORDER BY s.name
    )
    SELECT 
        COALESCE(SUM(saldo_banco_ofx), 0),
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'store_id', store_id,
                'store_name', store_name,
                'saldo_banco', saldo_banco,
                'saldo_banco_ofx', saldo_banco_ofx,
                'nao_entrou_valor', nao_entrou_valor,
                'rede_liquido', rede_liquido,
                'rede_devolucoes', rede_devolucoes,
                'status_compensacao', status_compensacao,
                'maquininha', maquininha,
                'pix', pix,
                'na_loja_os', na_loja_os,
                'previsto_ofx', previsto_ofx,
                'diferenca', diferenca,
                'status', status
            )
        ), '[]'::jsonb)
    INTO 
        v_total_saldo_ofx,
        v_stores_list
    FROM store_calc;

    -- Se for marco zero e total de bancos por loja for 0, busca de daily_snapshots.saldo_bancario
    IF v_is_marco_zero AND v_total_saldo_ofx = 0 AND v_snapshot_record.id IS NOT NULL THEN
        v_total_saldo_ofx := COALESCE(v_snapshot_record.saldo_bancario, 0);
    END IF;

    -- 9. Saldo Consolidado do Pilar 1
    v_total_saldo_banco := COALESCE(v_total_saldo_ofx, 0) + COALESCE(v_cartoes_a_compensar, 0);

    -- 10. Matemática da Conciliação Consolidada
    IF v_is_marco_zero AND v_snapshot_record.id IS NOT NULL THEN
        v_caixa_atual := COALESCE(v_snapshot_record.caixa_atual, v_total_saldo_banco + v_dinheiro_mp + v_a_receber + v_na_loja_os);
    ELSE
        v_caixa_atual := v_total_saldo_banco + v_dinheiro_mp + v_a_receber + v_na_loja_os;
    END IF;

    v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;
    v_faturamento_periodo := v_total_faturamento_ofx;
    v_valor_disp_contas := v_faturamento_periodo - v_fluxo_caixa;
    
    -- Subtotal Contas: Juros + Contas Manuais + DEVOLUÇÕES DA REDE (Conta a Pagar)
    v_subtotal_contas := v_juros_rede + v_contas_manual + v_devolucoes_rede;
    v_diferenca_final := ABS(v_valor_disp_contas) - v_subtotal_contas;

    IF ABS(v_diferenca_final) <= 50 THEN
        v_status_geral := 'approved';
    ELSE
        v_status_geral := 'divergence';
    END IF;

    -- 11. Montagem do Objeto JSONB final
    v_result := jsonb_build_object(
        'data_atual', v_target_date,
        'is_marco_zero', v_is_marco_zero,
        'total_saldo_banco', v_total_saldo_banco,
        'saldo_bancos_ofx', v_total_saldo_ofx,
        'cartoes_a_compensar', v_cartoes_a_compensar,
        'dinheiro_mp', v_dinheiro_mp,
        'a_receber', v_a_receber,
        'na_loja_os', v_na_loja_os,
        'contas_manual', v_contas_manual,
        'juros_rede', v_juros_rede,
        'devolucoes_rede', v_devolucoes_rede,
        'ofx_out', v_ofx_out,
        'caixa_atual', v_caixa_atual,
        'caixa_anterior', v_caixa_anterior,
        'fluxo_caixa', v_fluxo_caixa,
        'faturamento_ofx', v_total_faturamento_ofx,
        'faturamento_anterior', v_faturamento_anterior,
        'faturamento_periodo', v_faturamento_periodo,
        'valor_disp_contas', v_valor_disp_contas,
        'subtotal_contas', v_subtotal_contas,
        'diferenca_final', v_diferenca_final,
        'status_geral', v_status_geral,
        'stores', v_stores_list,
        'maquininhas_detalhe', v_triple_recon
    );

    RETURN v_result;
END;
$$;
