-- Migration: fix_conciliation_carry_over
-- Created: 20260813081500
-- Spec: 177-conciliation-carry-over
-- Description: Corrige o carry-over do bank_total nas conciliações para usar o último fechamento válido. 
-- Também passa a considerar o estoque_os_pendente (Marco Zero) nos cálculos de pátio em todas as RPCs.

-- =========================================================================================
-- 1. calculate_daily_conciliation
-- =========================================================================================
CREATE OR REPLACE FUNCTION calculate_daily_conciliation(p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    store_record RECORD;
    v_faturamento_banco numeric;
    v_maquininha numeric;
    v_pix numeric;
    v_na_loja_os numeric;
    v_previsto_ofx numeric;
    v_diferenca numeric;
    v_status text;
    v_result jsonb := '[]'::jsonb;
    v_has_historical boolean;
    v_historical_na_loja numeric;
    
    v_patio_os_sum numeric;
    v_estoque_os_sum numeric;
BEGIN
    FOR store_record IN SELECT id, name FROM stores LOOP
        -- FIX CARRY-OVER: Buscar do snapshot de conciliação mais recente até a data, não apenas no dia exato.
        SELECT EXISTS(SELECT 1 FROM reconciliations WHERE store_id = store_record.id AND date <= p_date) INTO v_has_historical;
        
        IF v_has_historical THEN
            SELECT COALESCE(bank_total, 0), COALESCE(na_loja_os, NULL) 
            INTO v_faturamento_banco, v_historical_na_loja
            FROM reconciliations 
            WHERE store_id = store_record.id AND date <= p_date
            ORDER BY date DESC
            LIMIT 1;
        ELSE
            v_faturamento_banco := 0;
            v_historical_na_loja := NULL;
        END IF;

        -- Calcula "Maquininha"
        SELECT COALESCE(SUM(amount), 0) INTO v_maquininha
        FROM ofx_transactions 
        WHERE store_id = store_record.id AND target_date = p_date AND type = 'in' AND (description ILIKE '%REDE%' OR description ILIKE '%MAQUINA%');
        
        -- Calcula "PIX"
        SELECT COALESCE(SUM(amount), 0) INTO v_pix
        FROM ofx_transactions 
        WHERE store_id = store_record.id AND target_date = p_date AND type = 'in' AND (description ILIKE '%PIX%' OR fitid ILIKE '%PIX%');
        
        -- Calcula "Previsto OFX" (Todas as Entradas)
        SELECT COALESCE(SUM(amount), 0) INTO v_previsto_ofx
        FROM ofx_transactions 
        WHERE store_id = store_record.id AND target_date = p_date AND type = 'in';

        -- Calcula "Na Loja OS" (Pátio + Estoque Marco Zero)
        IF v_historical_na_loja IS NOT NULL THEN
            v_na_loja_os := v_historical_na_loja;
        ELSE
            -- Patio OS
            SELECT COALESCE(SUM(COALESCE(total_value, 0) - COALESCE(paid_value, 0)), 0) INTO v_patio_os_sum
            FROM patio_os
            WHERE store_id = store_record.id 
              AND opened_at::date <= p_date
              AND (
                  (COALESCE(total_value, 0) - COALESCE(paid_value, 0)) > 0
                  OR closed_at::date = p_date
                  OR opened_at::date = p_date
              );
              
            -- Estoque OS Pendente (Marco Zero)
            SELECT COALESCE(SUM(valor_os), 0) INTO v_estoque_os_sum
            FROM estoque_os_pendente
            WHERE store_id = store_record.id
              AND status = 'PENDENTE'
              AND data_os <= p_date;
              
            v_na_loja_os := v_patio_os_sum + v_estoque_os_sum;
        END IF;

        v_diferenca := v_previsto_ofx - (v_maquininha + v_pix);
        v_status := CASE WHEN v_diferenca >= -1 THEN 'approved' ELSE 'divergence' END;

        INSERT INTO conciliation_daily_logs (
            date, store_id, faturamento_banco, maquininha, pix, na_loja_os, previsto_ofx, diferenca, status
        ) VALUES (
            p_date, store_record.id, v_faturamento_banco, v_maquininha, v_pix, v_na_loja_os, v_previsto_ofx, v_diferenca, v_status
        )
        ON CONFLICT (date, store_id) DO UPDATE SET
            faturamento_banco = EXCLUDED.faturamento_banco,
            maquininha = EXCLUDED.maquininha,
            pix = EXCLUDED.pix,
            na_loja_os = EXCLUDED.na_loja_os,
            previsto_ofx = EXCLUDED.previsto_ofx,
            diferenca = EXCLUDED.diferenca,
            status = EXCLUDED.status,
            updated_at = now();
            
        v_result := v_result || jsonb_build_object(
            'store_id', store_record.id,
            'store_name', store_record.name,
            'faturamento_banco', v_faturamento_banco,
            'maquininha', v_maquininha,
            'pix', v_pix,
            'na_loja_os', v_na_loja_os,
            'previsto_ofx', v_previsto_ofx,
            'diferenca', v_diferenca,
            'status', v_status
        );
    END LOOP;
    
    RETURN v_result;
END;
$$;


-- =========================================================================================
-- 2. get_conciliation_breakdown
-- =========================================================================================
CREATE OR REPLACE FUNCTION get_conciliation_breakdown(p_store_id text, p_date date)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ofx_in json;
  v_ofx_out json;
  v_ofx_out_total numeric;
  v_na_loja_detail json;
  v_na_loja_current numeric;
  v_na_loja_previous numeric;
  v_na_loja_os numeric;
  v_juros_rede numeric;
  v_taxas_detail json;
  v_has_snapshot boolean;
  v_na_loja_os_source text;
  
  v_patio_os_sum numeric;
  v_estoque_os_sum numeric;
BEGIN
  -- FIX CARRY-OVER: Verificar <= p_date
  SELECT EXISTS(SELECT 1 FROM reconciliations WHERE store_id = p_store_id AND date <= p_date::text) INTO v_has_snapshot;

  SELECT COALESCE(json_agg(
    json_build_object(
      'id',          ot.id::text,
      'occurred_at', ot.occurred_at,
      'description', COALESCE(ot.counterpart_name, ot.bank_name, 'Sem descrição'),
      'fitid',       ot.fitid,
      'amount',      ot.amount,
      'matched',     ot.matched_os_number IS NOT NULL
    ) ORDER BY ot.occurred_at DESC
  ), '[]'::json) INTO v_ofx_in
  FROM ofx_transactions ot
  WHERE ot.store_id = p_store_id AND ot.target_date = p_date AND ot.type = 'in';

  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_ofx_out_total
  FROM ofx_transactions
  WHERE store_id = p_store_id AND target_date = p_date AND type = 'out';

  SELECT COALESCE(json_agg(
    json_build_object(
      'id',          ot.id::text,
      'occurred_at', ot.occurred_at,
      'description', COALESCE(ot.counterpart_name, ot.bank_name, 'Sem descrição'),
      'fitid',       ot.fitid,
      'amount',      ABS(ot.amount)
    ) ORDER BY ot.occurred_at DESC
  ), '[]'::json) INTO v_ofx_out
  FROM ofx_transactions ot
  WHERE ot.store_id = p_store_id AND ot.target_date = p_date AND ot.type = 'out';

  -- FIX CARRY-OVER: Buscar do snapshot de conciliação mais recente até a data.
  IF v_has_snapshot THEN
    SELECT COALESCE(na_loja_os, 0) INTO v_na_loja_os
    FROM reconciliations
    WHERE store_id = p_store_id AND date <= p_date::text
    ORDER BY date DESC
    LIMIT 1;
    v_na_loja_os_source := 'snapshot_reconciliations';
  ELSE
    SELECT COALESCE(SUM(COALESCE(total_value, 0) - COALESCE(paid_value, 0)), 0) INTO v_patio_os_sum
    FROM patio_os
    WHERE store_id = p_store_id
      AND opened_at::date <= p_date
      AND (
          (COALESCE(total_value, 0) - COALESCE(paid_value, 0)) > 0
          OR closed_at::date = p_date
          OR opened_at::date = p_date
      );
      
    SELECT COALESCE(SUM(valor_os), 0) INTO v_estoque_os_sum
    FROM estoque_os_pendente
    WHERE store_id = p_store_id
      AND status = 'PENDENTE'
      AND data_os <= p_date;
      
    v_na_loja_os := v_patio_os_sum + v_estoque_os_sum;
    v_na_loja_os_source := 'realtime_patio_os_and_estoque';
  END IF;

  SELECT
    COALESCE(SUM(CASE
      WHEN DATE_TRUNC('month', opened_at) = DATE_TRUNC('month', p_date::timestamp)
      THEN COALESCE(total_value, 0) - COALESCE(paid_value, 0) ELSE 0 END), 0),
    COALESCE(SUM(CASE
      WHEN DATE_TRUNC('month', opened_at) < DATE_TRUNC('month', p_date::timestamp)
      THEN COALESCE(total_value, 0) - COALESCE(paid_value, 0) ELSE 0 END), 0)
  INTO v_na_loja_current, v_na_loja_previous
  FROM patio_os
  WHERE store_id = p_store_id
    AND opened_at::date <= p_date
    AND (
        (COALESCE(total_value, 0) - COALESCE(paid_value, 0)) > 0
        OR closed_at::date = p_date
        OR opened_at::date = p_date
    );

  -- Adicionando estoque_os_pendente ao na_loja_previous (já que vieram do passado)
  DECLARE
    v_estoque_previous numeric;
  BEGIN
    SELECT COALESCE(SUM(valor_os), 0) INTO v_estoque_previous
    FROM estoque_os_pendente
    WHERE store_id = p_store_id
      AND status = 'PENDENTE'
      AND DATE_TRUNC('month', data_os::timestamp) < DATE_TRUNC('month', p_date::timestamp)
      AND data_os <= p_date;
      
    v_na_loja_previous := v_na_loja_previous + v_estoque_previous;
  END;

  SELECT COALESCE(json_agg(
    json_build_object(
      'os_number',         po.os_number,
      'status',            po.status,
      'opened_at',         po.opened_at,
      'closed_at',         po.closed_at,
      'total_value',       COALESCE(po.total_value, 0),
      'paid_value',        COALESCE(po.paid_value, 0),
      'remaining',         COALESCE(po.total_value, 0) - COALESCE(po.paid_value, 0),
      'payment_method',    po.payment_method,
      'is_previous_month', (DATE_TRUNC('month', po.opened_at) < DATE_TRUNC('month', p_date::timestamp))
    ) ORDER BY po.opened_at ASC
  ), '[]'::json) INTO v_na_loja_detail
  FROM patio_os po
  WHERE po.store_id = p_store_id
    AND po.opened_at::date <= p_date
    AND (
        (COALESCE(po.total_value, 0) - COALESCE(po.paid_value, 0)) > 0
        OR po.closed_at::date = p_date
        OR po.opened_at::date = p_date
    );

  -- Injetando o estoque de OS pendente na lista de detail
  DECLARE
    v_estoque_detail json;
  BEGIN
    SELECT COALESCE(json_agg(
      json_build_object(
        'os_number',         eo.numero_os,
        'status',            'em_aberto',
        'opened_at',         eo.data_os,
        'closed_at',         NULL,
        'total_value',       eo.valor_os,
        'paid_value',        0,
        'remaining',         eo.valor_os,
        'payment_method',    'Não especificado',
        'is_previous_month', (DATE_TRUNC('month', eo.data_os::timestamp) < DATE_TRUNC('month', p_date::timestamp)),
        'is_legacy',         true
      ) ORDER BY eo.data_os ASC
    ), '[]'::json) INTO v_estoque_detail
    FROM estoque_os_pendente eo
    WHERE eo.store_id = p_store_id
      AND eo.status = 'PENDENTE'
      AND eo.data_os <= p_date;
      
    IF json_array_length(v_estoque_detail) > 0 THEN
      -- Se a lista principal estiver vazia, apenas usar a do estoque
      IF json_array_length(v_na_loja_detail) = 0 THEN
        v_na_loja_detail := v_estoque_detail;
      ELSE
        -- Concatena arrays em jsonb
        v_na_loja_detail := (v_na_loja_detail::jsonb || v_estoque_detail::jsonb)::json;
      END IF;
    END IF;
  END;

  SELECT COALESCE(SUM(fee_amount), 0) INTO v_juros_rede
  FROM pos_transactions
  WHERE store_id = p_store_id AND occurred_at::date = p_date;

  SELECT COALESCE(json_agg(
    json_build_object(
      'id',             pt.id::text,
      'occurred_at',    pt.occurred_at,
      'machine_name',   pt.machine_name,
      'gross_amount',   pt.gross_amount,
      'fee_amount',     pt.fee_amount,
      'fee_percentage', CASE WHEN pt.gross_amount > 0 THEN ROUND((pt.fee_amount / pt.gross_amount) * 100, 2) ELSE 0 END,
      'net_amount',     pt.net_amount
    ) ORDER BY pt.occurred_at DESC
  ), '[]'::json) INTO v_taxas_detail
  FROM pos_transactions pt
  WHERE pt.store_id = p_store_id AND pt.occurred_at::date = p_date;

  RETURN json_build_object(
    'ofx_in', json_build_object(
      'total', (SELECT COALESCE(SUM(amount), 0) FROM ofx_transactions WHERE store_id = p_store_id AND target_date = p_date AND type = 'in'),
      'transactions', v_ofx_in
    ),
    'ofx_out', json_build_object(
      'total', v_ofx_out_total,
      'transactions', v_ofx_out
    ),
    'na_loja', json_build_object(
      'total', v_na_loja_os,
      'current_month', v_na_loja_current,
      'previous_month', v_na_loja_previous,
      'source', v_na_loja_os_source,
      'transactions', v_na_loja_detail
    ),
    'taxas_rede', json_build_object(
      'total', v_juros_rede,
      'transactions', v_taxas_detail
    )
  );
END;
$$;


-- =========================================================================================
-- 3. get_dashboard_metrics
-- =========================================================================================
CREATE OR REPLACE FUNCTION get_dashboard_metrics(p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_saldo_total numeric := 0;
    v_caixa_atual numeric := 0;
    v_caixa_anterior numeric := 0;
    v_contas_a_pagar_ofx numeric := 0;
    v_contas_a_pagar numeric := 0;
    v_diferenca numeric := 0;
    v_faturamento_atual numeric := 0;
    v_faturamento_anterior numeric := 0;
    v_variacao_faturamento numeric := 0;
    v_fluxo_caixa numeric := 0;
    v_a_receber numeric := 0;
    v_a_receber_manual numeric := 0;
    v_veiculos_patio integer := 0;
    v_veiculos_patio_valor numeric := 0;
    v_saldo_negativo_itau numeric := 0;
    v_dinheiro_mp numeric := 0;
    v_juros_rede numeric := 0;
    
    v_date_anterior date;
    v_por_loja jsonb := '[]'::jsonb;
    v_historico jsonb := '[]'::jsonb;
    store_record RECORD;
    
    v_estoque_count int;
    v_estoque_valor numeric;
BEGIN
    v_date_anterior := p_date - interval '1 day';

    -- Carregar valores manuais do snapshot do dia atual
    SELECT COALESCE(dinheiro_mp, 0), COALESCE(a_receber_manual, 0), COALESCE(saldo_negativo_itau, 0), COALESCE(juros_rede, 0), COALESCE(contas_a_pagar, 0)
    INTO v_dinheiro_mp, v_a_receber_manual, v_saldo_negativo_itau, v_juros_rede, v_contas_a_pagar
    FROM daily_snapshots
    WHERE date = p_date;

    -- =========================================================================
    -- 1. TOTAIS GLOBAIS ABSOLUTOS (Inclui o OFX Global que não tem loja vinculada)
    -- =========================================================================
    
    -- Faturamento Atual (Toda entrada)
    SELECT COALESCE(SUM(amount), 0) INTO v_faturamento_atual
    FROM transactions
    WHERE target_date = p_date AND type = 'in';
    
    -- Despesas do OFX (Apenas saídas do OFX)
    SELECT ABS(COALESCE(SUM(amount), 0)) INTO v_contas_a_pagar_ofx
    FROM transactions
    WHERE target_date = p_date AND type = 'out' AND source = 'ofx';
    
    -- As 'Contas a Pagar' totais são a soma do Manual + As Despesas Reais do OFX
    v_contas_a_pagar := v_contas_a_pagar + v_contas_a_pagar_ofx;

    -- Pátio Global (Count e Valor)
    SELECT COUNT(*), COALESCE(SUM(COALESCE(total_value, 0) - COALESCE(paid_value, 0)), 0)
    INTO v_veiculos_patio, v_veiculos_patio_valor
    FROM patio_os
    WHERE status = 'em_aberto' OR status = 'pago_parcial';
    
    -- INJETAR ESTOQUE OS PENDENTE (MARCO ZERO)
    SELECT COUNT(*), COALESCE(SUM(valor_os), 0)
    INTO v_estoque_count, v_estoque_valor
    FROM estoque_os_pendente
    WHERE status = 'PENDENTE' AND data_os <= p_date;
    
    v_veiculos_patio := v_veiculos_patio + v_estoque_count;
    v_veiculos_patio_valor := v_veiculos_patio_valor + v_estoque_valor;

    -- Buscar o faturamento do último fechamento anterior para variacao correta
    SELECT COALESCE(faturamento, 0) INTO v_faturamento_anterior
    FROM daily_snapshots
    WHERE date < p_date
    ORDER BY date DESC
    LIMIT 1;

    -- =========================================================================
    -- 2. DADOS POR LOJA (Apenas para o grid visual de lojas)
    -- =========================================================================
    FOR store_record IN SELECT id, name FROM stores LOOP
        DECLARE
            v_store_bank_total numeric;
            v_store_fat numeric;
            v_store_contas numeric;
            v_store_patio_count int;
            v_store_patio_valor numeric;
            
            v_store_estoque_count int;
            v_store_estoque_valor numeric;
        BEGIN
            -- Saldo Bancário
            SELECT COALESCE(bank_total, 0) INTO v_store_bank_total
            FROM reconciliations
            WHERE store_id = store_record.id AND date <= p_date
            ORDER BY date DESC LIMIT 1;
            
            v_saldo_total := v_saldo_total + COALESCE(v_store_bank_total, 0);
            
            -- Faturamento Atual Loja
            SELECT COALESCE(SUM(amount), 0) INTO v_store_fat
            FROM transactions
            WHERE store_id = store_record.id AND target_date = p_date AND type = 'in';
            
            -- Contas Loja
            SELECT ABS(COALESCE(SUM(amount), 0)) INTO v_store_contas
            FROM transactions
            WHERE store_id = store_record.id AND target_date = p_date AND type = 'out';
            
            -- Pátio Loja
            SELECT COUNT(*), COALESCE(SUM(COALESCE(total_value, 0) - COALESCE(paid_value, 0)), 0)
            INTO v_store_patio_count, v_store_patio_valor
            FROM patio_os
            WHERE store_id = store_record.id AND (status = 'em_aberto' OR status = 'pago_parcial');
            
            -- INJETAR ESTOQUE DA LOJA
            SELECT COUNT(*), COALESCE(SUM(valor_os), 0)
            INTO v_store_estoque_count, v_store_estoque_valor
            FROM estoque_os_pendente
            WHERE store_id = store_record.id AND status = 'PENDENTE' AND data_os <= p_date;
            
            v_store_patio_count := v_store_patio_count + v_store_estoque_count;
            v_store_patio_valor := v_store_patio_valor + v_store_estoque_valor;
            
            v_por_loja := v_por_loja || jsonb_build_object(
                'storeId', store_record.id,
                'storeName', store_record.name,
                'saldoAtual', v_store_bank_total,
                'faturamento', v_store_fat,
                'contas', v_store_contas,
                'veiculosPatio', v_store_patio_count,
                'veiculosPatioValor', v_store_patio_valor,
                'statusConciliacao', 'pending',
                'resultado', v_store_fat - v_store_contas
            );
        END;
    END LOOP;

    -- =========================================================================
    -- 3. CÁLCULOS FINAIS REVISADOS
    -- =========================================================================
    
    v_a_receber := v_a_receber_manual + v_veiculos_patio_valor;
    
    -- Caixa Atual da Oficina
    v_caixa_atual := (v_saldo_total + v_dinheiro_mp + v_a_receber) - v_saldo_negativo_itau;

    -- Buscar o caixa_atual do último fechamento
    SELECT COALESCE(caixa_atual, 0) INTO v_caixa_anterior
    FROM daily_snapshots
    WHERE date < p_date
    ORDER BY date DESC
    LIMIT 1;
    
    -- FLUXO DE CAIXA CORRIGIDO: Caixa Atual - Caixa Anterior
    v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;
    
    IF v_faturamento_anterior > 0 THEN
        v_variacao_faturamento := ((v_faturamento_atual - v_faturamento_anterior) / v_faturamento_anterior) * 100;
    ELSE
        v_variacao_faturamento := 0;
    END IF;

    -- Diferença Matemática Corrigida (Valor Disponível - Valor Contas)
    v_diferenca := ((v_faturamento_atual - v_faturamento_anterior) - v_fluxo_caixa) - (v_contas_a_pagar + v_juros_rede);

    v_historico := '[]'::jsonb;
    
    INSERT INTO dashboard_daily_logs (
        date, saldo_total, caixa_atual, contas_a_pagar, diferenca, faturamento_atual, faturamento_anterior,
        variacao_faturamento, fluxo_caixa, a_receber, veiculos_patio, veiculos_patio_valor, por_loja, historico_macro
    ) VALUES (
        p_date, v_saldo_total, v_caixa_atual, v_contas_a_pagar, v_diferenca, v_faturamento_atual, v_faturamento_anterior,
        v_variacao_faturamento, v_fluxo_caixa, v_a_receber, v_veiculos_patio, v_veiculos_patio_valor, v_por_loja, v_historico
    )
    ON CONFLICT (date) DO UPDATE SET
        saldo_total = EXCLUDED.saldo_total,
        caixa_atual = EXCLUDED.caixa_atual,
        contas_a_pagar = EXCLUDED.contas_a_pagar,
        diferenca = EXCLUDED.diferenca,
        faturamento_atual = EXCLUDED.faturamento_atual,
        faturamento_anterior = EXCLUDED.faturamento_anterior,
        variacao_faturamento = EXCLUDED.variacao_faturamento,
        fluxo_caixa = EXCLUDED.fluxo_caixa,
        a_receber = EXCLUDED.a_receber,
        veiculos_patio = EXCLUDED.veiculos_patio,
        veiculos_patio_valor = EXCLUDED.veiculos_patio_valor,
        por_loja = EXCLUDED.por_loja,
        historico_macro = EXCLUDED.historico_macro,
        updated_at = now();

    RETURN jsonb_build_object(
        'dataAtual', p_date,
        'dataAnterior', v_date_anterior,
        'saldoTotal', v_saldo_total,
        'caixaAtual', v_caixa_atual,
        'contasAPagar', v_contas_a_pagar,
        'diferenca', v_diferenca,
        'faturamentoAtual', v_faturamento_atual,
        'faturamentoAnterior', v_faturamento_anterior,
        'variacaoFaturamento', v_variacao_faturamento,
        'fluxoCaixa', v_fluxo_caixa,
        'aReceber', v_a_receber,
        'veiculosPatio', v_veiculos_patio,
        'veiculosPatioValor', v_veiculos_patio_valor,
        'porLoja', v_por_loja,
        'historicoMacro', v_historico
    );
END;
$$;
