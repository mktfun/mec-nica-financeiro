-- Migration: fix_dashboard_patio_math
-- Created: 20260807000007
-- Specs: 115
-- Description: Implementa a lógica de herança de saldo do pátio no cálculo do Dashboard (na_loja).

CREATE OR REPLACE FUNCTION get_dashboard_metrics(p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    -- Variáveis de Matemática (Inicializadas rigorosamente com 0 para evitar Null Contagion)
    v_saldo_total numeric := 0;
    v_dinheiro_mp numeric := 0;
    v_a_receber numeric := 0;
    v_na_loja numeric := 0;
    v_caixa_atual numeric := 0;
    v_fluxo_cx numeric := 0;
    v_fatura numeric := 0;
    v_valor_disp_contas numeric := 0;
    v_valor_contas numeric := 0;
    v_diferenca numeric := 0;

    -- Sub-variáveis
    v_saldo_negativo_itau numeric := 0;
    v_a_receber_manual numeric := 0;
    v_a_receber_boletos numeric := 0;
    v_caixa_anterior numeric := 0;
    v_faturamento_atual numeric := 0;
    v_faturamento_anterior numeric := 0;
    v_outros_fat numeric := 0;
    v_juros_rede numeric := 0;
    v_contas_pagas_ofx numeric := 0;

    -- Controle
    v_date_anterior date;
    v_has_snapshot boolean;
BEGIN
    v_date_anterior := p_date - interval '1 day';

    -- [Passo 1] Saldo = soma de todos os saldos no banco
    SELECT COALESCE(SUM(b_total), 0) INTO v_saldo_total
    FROM (
        SELECT store_id, (
            SELECT COALESCE(bank_total, 0)
            FROM reconciliations r2
            WHERE r2.store_id = stores.id AND r2.date <= p_date
            ORDER BY r2.date DESC LIMIT 1
        ) as b_total FROM stores
    ) sub;

    -- Carregar Snapshots Manuais Diários
    SELECT EXISTS(SELECT 1 FROM daily_snapshots WHERE date = p_date) INTO v_has_snapshot;
    IF v_has_snapshot THEN
        SELECT 
            COALESCE(dinheiro_mp, 0), COALESCE(a_receber_manual, 0), 
            COALESCE(saldo_negativo_itau, 0), COALESCE(faturamento_outros_valor, 0), COALESCE(juros_rede, 0)
        INTO 
            v_dinheiro_mp, v_a_receber_manual, 
            v_saldo_negativo_itau, v_outros_fat, v_juros_rede
        FROM daily_snapshots WHERE date = p_date;
    END IF;

    -- [Passo 3] A receber = boletos + descontos manuais
    SELECT COALESCE(SUM(value), 0) INTO v_a_receber_boletos FROM receivables WHERE status = 'pendente';
    v_a_receber := v_a_receber_manual + v_a_receber_boletos;

    -- [Passo 4] Na loja = soma do historico na_loja_os ou fallback para patio_os (CARRY-OVER)
    SELECT COALESCE(SUM(n_loja), 0) INTO v_na_loja
    FROM (
        SELECT store_id, (
            SELECT COALESCE(na_loja_os, (
                SELECT COALESCE(SUM(COALESCE(total_value, 0) - COALESCE(paid_value, 0)), 0)
                FROM patio_os p WHERE p.store_id = stores.id AND p.status IN ('em_aberto', 'pago_parcial')
            ))
            FROM reconciliations r2
            WHERE r2.store_id = stores.id AND r2.date <= p_date
            ORDER BY r2.date DESC LIMIT 1
        ) as n_loja FROM stores
    ) sub;

    -- [Passo 5] Caixa atual = (soma de todos acima) - negativo (Itaú)
    v_caixa_atual := (v_saldo_total + v_dinheiro_mp + v_a_receber + v_na_loja) - v_saldo_negativo_itau;

    -- [Passo 6] Fluxo CX = Caixa atual - Caixa conciliação anterior
    SELECT EXISTS(SELECT 1 FROM dashboard_daily_logs WHERE date = v_date_anterior) INTO v_has_snapshot;
    IF v_has_snapshot THEN
        SELECT COALESCE(caixa_atual, 0) INTO v_caixa_anterior FROM dashboard_daily_logs WHERE date = v_date_anterior;
    END IF;
    v_fluxo_cx := v_caixa_atual - v_caixa_anterior;

    -- [Passo 7] Fatura = (Faturamento atual - Faturamento anterior) + Outros fat.
    SELECT COALESCE(SUM(amount), 0) INTO v_faturamento_atual FROM transactions WHERE target_date = p_date AND type = 'in' AND source = 'ofx';
    SELECT COALESCE(SUM(amount), 0) INTO v_faturamento_anterior FROM transactions WHERE target_date = v_date_anterior AND type = 'in' AND source = 'ofx';
    v_fatura := (v_faturamento_atual - v_faturamento_anterior) + v_outros_fat;

    -- [Passo 8] Valor disp contas = Fatura + Fluxo CX
    v_valor_disp_contas := v_fatura + v_fluxo_cx;

    -- [Passo 9] Valor contas = Juros + contas (saídas dos OFX)
    SELECT ABS(COALESCE(SUM(amount), 0)) INTO v_contas_pagas_ofx FROM transactions WHERE target_date = p_date AND type = 'out' AND source = 'ofx';
    v_valor_contas := v_juros_rede + v_contas_pagas_ofx;

    -- [Passo 10] Diferença = Valor disp - Valor contas
    v_diferenca := v_valor_disp_contas - v_valor_contas;

    -- Gravar log do Dashboard
    INSERT INTO dashboard_daily_logs (
        date, saldo_total, caixa_atual, contas_a_pagar, diferenca, faturamento_atual, faturamento_anterior,
        variacao_faturamento, fluxo_caixa, a_receber, veiculos_patio, veiculos_patio_valor
    ) VALUES (
        p_date, v_saldo_total, v_caixa_atual, v_valor_contas, v_diferenca, v_faturamento_atual, v_faturamento_anterior,
        0, v_fluxo_cx, v_a_receber, 0, v_na_loja
    )
    ON CONFLICT (date) DO UPDATE SET
        saldo_total = EXCLUDED.saldo_total,
        caixa_atual = EXCLUDED.caixa_atual,
        contas_a_pagar = EXCLUDED.contas_a_pagar,
        diferenca = EXCLUDED.diferenca,
        faturamento_atual = EXCLUDED.faturamento_atual,
        faturamento_anterior = EXCLUDED.faturamento_anterior,
        fluxo_caixa = EXCLUDED.fluxo_caixa,
        a_receber = EXCLUDED.a_receber,
        veiculos_patio_valor = EXCLUDED.veiculos_patio_valor,
        updated_at = now();

    -- Retornar Objeto Completo Rigoroso
    RETURN jsonb_build_object(
        'dataAtual', p_date,
        'saldoTotal', v_saldo_total,
        'dinheiroMp', v_dinheiro_mp,
        'aReceber', v_a_receber,
        'naLoja', v_na_loja,
        'caixaAtual', v_caixa_atual,
        'fluxoCx', v_fluxo_cx,
        'fatura', v_fatura,
        'valorDispContas', v_valor_disp_contas,
        'valorContas', v_valor_contas,
        'diferenca', v_diferenca
    );
END;
$$;
