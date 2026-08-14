-- Migration: 20260814143000_audit_and_harden_dashboard_rpc.sql
-- Description: Auditoria e blindagem da RPC get_dashboard_metrics com CTEs isoladas, delta de odômetro, proteção contra NULLs e índices de performance

-- 1. Índices de alta performance
CREATE INDEX IF NOT EXISTS idx_patio_os_store_status_opened ON public.patio_os (store_id, status, opened_at);
CREATE INDEX IF NOT EXISTS idx_patio_os_opened_closed ON public.patio_os (opened_at, closed_at);
CREATE INDEX IF NOT EXISTS idx_ofx_tx_target_type_store ON public.ofx_transactions (target_date, type, store_id);
CREATE INDEX IF NOT EXISTS idx_reconciliations_store_date ON public.reconciliations (store_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_date ON public.daily_snapshots (date DESC);

-- 2. RPC get_dashboard_metrics revisada e blindada contra produto cartesiano e NULLs
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
    v_total_saldo numeric := 0;
    v_total_dinheiro numeric := 0;
    v_total_areceber numeric := 0;
    v_total_naloja numeric := 0;
    v_total_cxatual numeric := 0;
    v_total_fluxo numeric := 0;
    v_total_fatura numeric := 0;
    v_total_disp_contas numeric := 0;
    v_total_contas numeric := 0;
    v_odometro_hoje numeric := 0;
    v_odometro_ant numeric := 0;
    v_faturamento_delta numeric := 0;
    v_contas_manual numeric := 0;
    v_juros_rede numeric := 0;
    v_snap_found boolean := false;
BEGIN
    -- 1. Snapshot Atual (Odômetro e valores manuais gravados)
    SELECT 
        COALESCE(faturamento, 0),
        COALESCE(dinheiro_mp, 0),
        COALESCE(a_receber_manual, 0),
        COALESCE(contas_a_pagar, 0),
        COALESCE(juros_rede, 0),
        true
    INTO 
        v_odometro_hoje,
        v_total_dinheiro,
        v_total_areceber,
        v_contas_manual,
        v_juros_rede,
        v_snap_found
    FROM daily_snapshots 
    WHERE date = p_date;

    IF NOT FOUND OR v_snap_found IS NOT TRUE THEN
        v_odometro_hoje := 0;
        v_total_dinheiro := 0;
        v_total_areceber := 0;
        v_contas_manual := 0;
        v_juros_rede := 0;
    END IF;

    -- 2. Snapshot Anterior para cálculo do Delta do Odômetro
    SELECT COALESCE(faturamento, 0)
    INTO v_odometro_ant
    FROM daily_snapshots 
    WHERE date < p_date 
    ORDER BY date DESC 
    LIMIT 1;

    IF NOT FOUND OR v_odometro_ant IS NULL THEN
        v_odometro_ant := 0;
    END IF;

    -- Se não houver snapshot anterior, busca no metadata do snapshot atual (ex: primeiro fechamento ou Marco Zero)
    IF v_odometro_ant = 0 THEN
        SELECT COALESCE((metadata->>'faturamento_anterior')::numeric, 0)
        INTO v_odometro_ant
        FROM daily_snapshots
        WHERE date = p_date;

        IF NOT FOUND OR v_odometro_ant IS NULL THEN
            v_odometro_ant := 0;
        END IF;
    END IF;

    -- 3. Cálculo do Faturamento com a regra do Odômetro
    IF v_odometro_hoje > 0 AND v_odometro_ant > 0 AND v_odometro_hoje >= v_odometro_ant THEN
        v_faturamento_delta := v_odometro_hoje - v_odometro_ant;
    ELSIF v_odometro_hoje > 0 THEN
        v_faturamento_delta := v_odometro_hoje;
    ELSE
        -- Fallback: Total de entradas OFX do dia
        SELECT COALESCE(SUM(amount), 0)
        INTO v_faturamento_delta
        FROM ofx_transactions
        WHERE target_date = p_date AND type = 'in';
    END IF;

    IF v_faturamento_delta IS NULL THEN
        v_faturamento_delta := 0;
    END IF;

    -- 4. CTEs Isoladas para Agregação Sem Produto Cartesiano
    WITH bank_recons AS (
        SELECT DISTINCT ON (store_id) store_id, bank_total
        FROM reconciliations
        WHERE date <= p_date
        ORDER BY store_id, date DESC
    ),
    patio_active AS (
        SELECT store_id, COALESCE(SUM(COALESCE(total_value, 0) - COALESCE(paid_value, 0)), 0) as v
        FROM patio_os
        WHERE opened_at::date <= p_date
          AND LOWER(status) NOT IN ('finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado')
          AND ((COALESCE(total_value, 0) - COALESCE(paid_value, 0)) > 0 OR closed_at::date = p_date OR opened_at::date = p_date)
        GROUP BY store_id
    ),
    ofx_saidas AS (
        SELECT COALESCE(ABS(SUM(amount)), 0) as v
        FROM ofx_transactions
        WHERE target_date = p_date AND type = 'out'
    )
    SELECT
        COALESCE((SELECT SUM(bank_total) FROM bank_recons), 0),
        COALESCE((SELECT SUM(v) FROM patio_active), 0),
        COALESCE((SELECT v FROM ofx_saidas), 0)
    INTO
        v_total_saldo,
        v_total_naloja,
        v_total_contas;

    v_total_saldo := COALESCE(v_total_saldo, 0);
    v_total_naloja := COALESCE(v_total_naloja, 0);
    v_total_contas := COALESCE(v_total_contas, 0);
    v_total_dinheiro := COALESCE(v_total_dinheiro, 0);
    v_total_areceber := COALESCE(v_total_areceber, 0);

    -- Se o operador digitou contas manuais no snapshot, prioriza o valor manual
    IF v_contas_manual > 0 THEN
        v_total_contas := v_contas_manual;
    END IF;

    -- 5. Fórmulas Consolidadas do Dashboard (Nunca nulas)
    v_total_cxatual := v_total_saldo + v_total_dinheiro + v_total_areceber;
    v_total_disp_contas := v_total_cxatual;
    v_total_fluxo := v_total_cxatual - v_total_contas;
    v_total_fatura := v_faturamento_delta;

    v_result := jsonb_build_object(
        'dataAtual', p_date,
        'saldoTotal', COALESCE(v_total_saldo, 0),
        'dinheiroMp', COALESCE(v_total_dinheiro, 0),
        'aReceber', COALESCE(v_total_areceber, 0),
        'naLoja', COALESCE(v_total_naloja, 0),
        'caixaAtual', COALESCE(v_total_cxatual, 0),
        'fluxoCx', COALESCE(v_total_fluxo, 0),
        'fatura', COALESCE(v_total_fatura, 0),
        'faturamentoAtual', COALESCE(v_total_fatura, 0),
        'valorDispContas', COALESCE(v_total_disp_contas, 0),
        'valorContas', COALESCE(v_total_contas, 0),
        'diferenca', COALESCE(v_total_areceber - v_total_saldo, 0)
    );

    RETURN v_result;
END;
$$;
