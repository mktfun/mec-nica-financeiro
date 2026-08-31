-- Migration: 20260831000002_fix_automatch_and_odometro_encadeamento.sql
DROP FUNCTION IF EXISTS public.auto_match_transactions(date);
DROP FUNCTION IF EXISTS public.auto_match_transactions(text);
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(text, boolean);
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(date, boolean);
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(text);
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(date);
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary();
DROP FUNCTION IF EXISTS public.calculate_daily_conciliation(date);
DROP FUNCTION IF EXISTS public.calculate_daily_conciliation(text);
CREATE OR REPLACE FUNCTION public.auto_match_transactions(p_date date)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    ofx_record RECORD;
    os_record RECORD;
    rede_record RECORD;
    v_target_amount numeric;
    v_accumulated numeric;
    v_rede_ids uuid[];
    v_count_matched_os int := 0;
    v_count_matched_rede int := 0;
    v_search_text text;
BEGIN
    IF p_date IS NULL THEN
        RAISE EXCEPTION 'Data obrigatória para conciliação.';
    END IF;

    FOR ofx_record IN 
        SELECT id, amount, store_id, counterpart_name, fitid, bank_name, matched_os_number
        FROM public.ofx_transactions 
        WHERE (target_date = p_date OR occurred_at::date = p_date)
          AND type = 'in' 
          AND matched_os_number IS NULL
          AND NOT (
              COALESCE(counterpart_name, '') ILIKE '%REDE%' 
              OR COALESCE(counterpart_name, '') ILIKE '%REDECARD%' 
              OR COALESCE(counterpart_name, '') ILIKE '%CIELO%' 
              OR COALESCE(counterpart_name, '') ILIKE '%STONE%' 
              OR COALESCE(counterpart_name, '') ILIKE '%PAGSEGURO%'
              OR COALESCE(fitid, '') ILIKE '%REDE%'
              OR COALESCE(bank_name, '') ILIKE '%REDE%'
          )
    LOOP
        v_target_amount := ofx_record.amount;
        v_search_text := CONCAT_WS(' ', ofx_record.counterpart_name, ofx_record.fitid, ofx_record.bank_name);
        os_record := NULL;

        -- 1A: Match Textual por Número de OS
        SELECT p.id, p.os_number, p.store_id, p.total_value, COALESCE(p.paid_value, 0) as current_paid, p.status
        INTO os_record
        FROM public.patio_os p
        WHERE (ofx_record.store_id IS NULL OR p.store_id = ofx_record.store_id)
          AND p.matched_ofx_id IS NULL
          AND (
              v_search_text ~* ('\y' || p.os_number || '\y')
              OR v_search_text ILIKE ('%OS ' || p.os_number || '%')
              OR v_search_text ILIKE ('%OS#' || p.os_number || '%')
              OR v_search_text ILIKE ('%OS' || p.os_number || '%')
          )
        ORDER BY 
          CASE WHEN ofx_record.store_id = p.store_id THEN 0 ELSE 1 END,
          ABS(COALESCE(p.pix_transfer_value, p.total_value - COALESCE(p.paid_value, 0)) - v_target_amount) ASC,
          p.opened_at DESC
        LIMIT 1;

        -- 1B: Match por Saldo em Aberto
        IF os_record.id IS NULL AND ofx_record.store_id IS NOT NULL THEN
            SELECT p.id, p.os_number, p.store_id, p.total_value, COALESCE(p.paid_value, 0) as current_paid, p.status
            INTO os_record
            FROM public.patio_os p
            WHERE p.store_id = ofx_record.store_id
              AND p.matched_ofx_id IS NULL
              AND LOWER(COALESCE(p.status, 'em_aberto')) IN ('em_aberto', 'pago_parcial', 'em_andamento', 'aberta', 'aberto', 'pendente')
              AND (
                  ABS((p.total_value - COALESCE(p.paid_value, 0)) - v_target_amount) < 0.05
                  OR ABS(COALESCE(p.pix_transfer_value, 0) - v_target_amount) < 0.05
                  OR ABS(p.total_value - v_target_amount) < 0.05
              )
            ORDER BY 
              ABS((p.total_value - COALESCE(p.paid_value, 0)) - v_target_amount) ASC,
              p.opened_at DESC
            LIMIT 1;
        END IF;

        -- 1C: Match de Quitação em OS Finalizada
        IF os_record.id IS NULL AND ofx_record.store_id IS NOT NULL THEN
            SELECT p.id, p.os_number, p.store_id, p.total_value, COALESCE(p.paid_value, 0) as current_paid, p.status
            INTO os_record
            FROM public.patio_os p
            WHERE p.store_id = ofx_record.store_id
              AND p.matched_ofx_id IS NULL
              AND LOWER(COALESCE(p.status, '')) IN ('finalizada', 'finalizado', 'faturada', 'faturado', 'paga', 'pago', 'concluida')
              AND (
                  p.closed_at::date = p_date 
                  OR p.last_payment_date::date = p_date 
                  OR p.opened_at::date BETWEEN (p_date - INTERVAL '7 days')::date AND p_date
              )
              AND (
                  ABS(COALESCE(p.pix_transfer_value, 0) - v_target_amount) < 0.05
                  OR ABS(COALESCE(p.paid_value, 0) - v_target_amount) < 0.05
                  OR ABS(p.total_value - v_target_amount) < 0.05
              )
            ORDER BY 
              ABS(COALESCE(p.pix_transfer_value, 0) - v_target_amount) ASC,
              p.opened_at DESC
            LIMIT 1;
        END IF;

        -- Aplicação do Vínculo
        IF os_record.id IS NOT NULL THEN
            IF LOWER(COALESCE(os_record.status, 'em_aberto')) IN ('em_aberto', 'pago_parcial', 'em_andamento', 'aberta', 'aberto', 'pendente') THEN
                UPDATE public.patio_os 
                SET 
                    paid_value = LEAST(total_value, os_record.current_paid + v_target_amount),
                    status = CASE 
                        WHEN (os_record.current_paid + v_target_amount) >= (total_value - 0.05) THEN 'finalizada' 
                        ELSE 'pago_parcial' 
                    END,
                    closed_at = CASE 
                        WHEN (os_record.current_paid + v_target_amount) >= (total_value - 0.05) THEN p_date 
                        ELSE closed_at 
                    END,
                    matched_ofx_id = ofx_record.id,
                    match_status = 'MATCHED',
                    updated_at = NOW()
                WHERE id = os_record.id;
            ELSE
                UPDATE public.patio_os 
                SET 
                    matched_ofx_id = ofx_record.id,
                    match_status = 'MATCHED',
                    updated_at = NOW()
                WHERE id = os_record.id;
            END IF;

            UPDATE public.ofx_transactions 
            SET 
                matched_os_number = os_record.os_number,
                store_id = COALESCE(ofx_record.store_id, os_record.store_id)
            WHERE id = ofx_record.id;

            INSERT INTO public.conciliation_matches (
                store_id, target_date, system_os_number, ofx_transaction_id, status, divergence_amount
            ) VALUES (
                COALESCE(ofx_record.store_id, os_record.store_id), p_date, os_record.os_number, ofx_record.id, 'matched', 0
            ) ON CONFLICT DO NOTHING;

            v_count_matched_os := v_count_matched_os + 1;
            CONTINUE;
        END IF;

        -- 2: Parear Lotes da Rede
        IF ofx_record.store_id IS NOT NULL THEN
            v_accumulated := 0;
            v_rede_ids := '{}'::uuid[];

            FOR rede_record IN
                SELECT id, net_amount 
                FROM public.pos_transactions 
                WHERE (target_date = p_date OR occurred_at::date = p_date)
                  AND matched_os_number IS NULL 
                  AND store_id = ofx_record.store_id
                ORDER BY occurred_at DESC, net_amount DESC
            LOOP
                v_accumulated := v_accumulated + rede_record.net_amount;
                v_rede_ids := array_append(v_rede_ids, rede_record.id);

                IF ABS(v_accumulated - v_target_amount) < 0.05 THEN
                    UPDATE public.pos_transactions 
                    SET matched_os_number = ofx_record.id::text 
                    WHERE id = ANY(v_rede_ids);

                    UPDATE public.ofx_transactions 
                    SET matched_os_number = 'LOTE_REDE_' || ofx_record.id::text 
                    WHERE id = ofx_record.id;

                    v_count_matched_rede := v_count_matched_rede + 1;
                    EXIT;
                END IF;

                IF v_accumulated > v_target_amount THEN
                    v_accumulated := v_accumulated - rede_record.net_amount;
                    v_rede_ids := array_remove(v_rede_ids, rede_record.id);
                END IF;
            END LOOP;
        END IF;

    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'date', p_date,
        'matched_os_count', v_count_matched_os,
        'matched_rede_count', v_count_matched_rede
    );
END;
$$;
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
    
    v_saldo_bancos numeric := 0;
    v_saldo_bancos_positivo numeric := 0;
    v_saldo_negativo_itau numeric := 0;
    v_dinheiro_lojas numeric := 0;
    v_cartoes_a_compensar numeric := 0;
    v_devolucoes_rede numeric := 0;
    v_total_saldo_banco numeric := 0;
    v_total_saldo_banco_positivo numeric := 0;
    v_dinheiro_mp numeric := 0;
    v_a_receber numeric := 0;
    v_na_loja_os numeric := 0;
    v_caixa_atual numeric := 0;
    v_caixa_anterior numeric := 0;
    v_fluxo_caixa numeric := 0;
    
    v_odometro_hoje numeric := 0;
    v_faturamento_oi_base numeric := 0;
    v_faturamento_ajustes numeric := 0;
    v_faturamento_periodo numeric := 0;
    v_faturamento_anterior numeric := 0;
    v_faturamento_itens jsonb := '[]'::jsonb;
    
    v_valor_disp_contas numeric := 0;
    v_contas_base numeric := 0;
    v_contas_extras numeric := 0;
    v_contas_manual numeric := 0;
    v_total_bills numeric := 0;
    v_contas_imported_bills numeric := 0;
    v_juros_rede numeric := 0;
    v_subtotal_contas numeric := 0;
    v_diferenca_final numeric := 0;
    v_status_geral text := 'divergent';
    v_contas_itens jsonb := '[]'::jsonb;
    
    v_total_entradas_ofx numeric := 0;
    v_total_saidas_ofx numeric := 0;
    
    v_triple_recon jsonb;
    v_stores_detail jsonb := '[]'::jsonb;
BEGIN
    SELECT * INTO v_snapshot FROM daily_snapshots WHERE date = v_target_date;
    IF FOUND THEN
        v_snapshot_found := true;
    END IF;

    -- RAMAL 1: DIA FECHADO (Snapshot Consolidado e Blindado)
    IF NOT p_force_dynamic AND v_snapshot_found AND v_snapshot.is_closed = true THEN
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

        IF v_saldo_bancos = 0 AND v_snapshot.saldo_bancario IS NOT NULL AND v_snapshot.saldo_bancario != 0 THEN
            v_saldo_bancos := COALESCE(v_snapshot.saldo_bancario, 0);
            v_saldo_negativo_itau := COALESCE(v_snapshot.saldo_negativo_itau, (v_snapshot.metadata->>'saldo_negativo_itau')::numeric, 0);
            v_saldo_bancos_positivo := CASE WHEN v_saldo_negativo_itau > 0 THEN v_saldo_bancos + v_saldo_negativo_itau ELSE v_saldo_bancos END;
        END IF;
        
        IF v_saldo_negativo_itau = 0 THEN
            v_saldo_negativo_itau := COALESCE(v_snapshot.saldo_negativo_itau, (v_snapshot.metadata->>'saldo_negativo_itau')::numeric, 0);
        END IF;

        v_dinheiro_mp := COALESCE(v_snapshot.dinheiro_mp, 0);
        v_a_receber := COALESCE(v_snapshot.a_receber_manual, 0);
        v_na_loja_os := COALESCE(v_snapshot.total_patio, 0);
        v_caixa_atual := COALESCE(v_snapshot.caixa_atual, 0);
        v_caixa_anterior := COALESCE((v_snapshot.metadata->>'caixa_anterior')::numeric, 0);
        v_fluxo_caixa := COALESCE((v_snapshot.metadata->>'fluxo_caixa')::numeric, v_caixa_atual - v_caixa_anterior);
        
        SELECT COALESCE(
            (metadata->>'odometro_hoje')::numeric,
            (metadata->>'faturamento_acumulado')::numeric,
            (metadata->>'faturamento_anterior')::numeric,
            (metadata->>'odometro_anterior')::numeric,
            faturamento,
            0
        )
        INTO v_faturamento_anterior
        FROM daily_snapshots
        WHERE date < v_target_date
        ORDER BY date DESC
        LIMIT 1;

        IF (v_snapshot.metadata->>'faturamento_anterior') IS NOT NULL THEN
            v_faturamento_anterior := (v_snapshot.metadata->>'faturamento_anterior')::numeric;
        ELSIF (v_snapshot.metadata->>'odometro_anterior') IS NOT NULL THEN
            v_faturamento_anterior := (v_snapshot.metadata->>'odometro_anterior')::numeric;
        END IF;

        IF (v_snapshot.metadata->>'faturamento_oi_base') IS NOT NULL AND (v_snapshot.metadata->>'faturamento_oi_base')::numeric > 0 THEN
            v_faturamento_oi_base := (v_snapshot.metadata->>'faturamento_oi_base')::numeric;
        ELSIF v_snapshot.faturamento IS NOT NULL AND v_faturamento_anterior > 0 AND v_snapshot.faturamento > v_faturamento_anterior THEN
            v_faturamento_oi_base := v_snapshot.faturamento - v_faturamento_anterior;
        ELSE
            v_faturamento_oi_base := COALESCE(v_snapshot.faturamento, 0);
        END IF;

        v_faturamento_ajustes := COALESCE((v_snapshot.metadata->>'faturamento_ajustes')::numeric, 0);
        v_faturamento_periodo := v_faturamento_oi_base + v_faturamento_ajustes;
        v_valor_disp_contas := COALESCE((v_snapshot.metadata->>'valor_disp_contas')::numeric, v_faturamento_periodo - v_fluxo_caixa);
        
        v_contas_manual := COALESCE(v_snapshot.contas_a_pagar, 0);
        v_contas_base := COALESCE((v_snapshot.metadata->>'contas_base')::numeric, v_contas_manual);
        v_contas_extras := COALESCE((v_snapshot.metadata->>'contas_extras')::numeric, 0);
        v_juros_rede := COALESCE(v_snapshot.juros_rede, 0);
        v_subtotal_contas := COALESCE((v_snapshot.metadata->>'subtotal_contas')::numeric, v_contas_manual + v_juros_rede);
        v_diferenca_final := COALESCE((v_snapshot.metadata->>'diferenca_final')::numeric, v_valor_disp_contas - v_subtotal_contas);
        v_status_geral := CASE WHEN ABS(v_diferenca_final) <= 50.00 THEN 'approved' ELSE 'divergent' END;

        v_dinheiro_lojas := COALESCE((v_snapshot.metadata->>'dinheiro_em_lojas')::numeric, 0);
        v_cartoes_a_compensar := COALESCE((v_snapshot.metadata->>'cartoes_a_compensar')::numeric, 0);
        v_devolucoes_rede := COALESCE((v_snapshot.metadata->>'devolucoes_rede')::numeric, 0);
        
        v_total_saldo_banco_positivo := v_saldo_bancos_positivo + v_dinheiro_lojas + v_cartoes_a_compensar - v_devolucoes_rede;
        v_total_saldo_banco := v_saldo_bancos + v_dinheiro_lojas + v_cartoes_a_compensar - v_devolucoes_rede;

        BEGIN
            v_triple_recon := get_store_pos_triple_reconciliation(v_target_date::text);
        EXCEPTION WHEN OTHERS THEN
            v_triple_recon := '{}'::jsonb;
        END;

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
        store_vault AS (
            SELECT 
                store_id,
                COALESCE(SUM(amount), 0) as dinheiro_loja,
                jsonb_agg(jsonb_build_object(
                    'id', id,
                    'amount', amount,
                    'status', status,
                    'entry_date', entry_date,
                    'description', description
                )) as vault_entries
            FROM store_cash_vault
            WHERE entry_date <= v_target_date
              AND (
                status IN ('em_transito', 'pending')
                OR (status = 'depositado' AND deposited_at IS NOT NULL AND deposited_at::date > v_target_date)
              )
            GROUP BY store_id
        )
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'store_id', s.id,
            'store_name', s.name,
            'color', COALESCE(s.avatar_url, ''),
            'saldo_banco', ROUND(COALESCE(r.bank_total, 0) + COALESCE(v.dinheiro_loja, 0) + COALESCE(pos.nao_entrou_valor, 0), 2),
            'saldo_banco_ofx', ROUND(COALESCE(r.bank_total, 0), 2),
            'bank_balance', ROUND(COALESCE(r.bank_total, 0), 2),
            'dinheiro_loja', ROUND(COALESCE(v.dinheiro_loja, 0), 2),
            'vault_entries', COALESCE(v.vault_entries, '[]'::jsonb),
            'na_loja_os', ROUND(COALESCE(r.historical_na_loja, 0), 2),
            'patio_os', ROUND(COALESCE(r.historical_na_loja, 0), 2),
            'maquininha', ROUND(COALESCE(pos.rede_liquido, 0), 2),
            'rede_bruto', ROUND(COALESCE(pos.rede_bruto, 0), 2),
            'rede_liquido', ROUND(COALESCE(pos.rede_liquido, 0), 2),
            'rede_devolucoes', ROUND(COALESCE(pos.rede_devolucoes, 0), 2),
            'ofx_maquininhas', ROUND(COALESCE(pos.ofx_maquininhas, 0), 2),
            'nao_entrou_maquininhas', ROUND(COALESCE(pos.nao_entrou_valor, 0), 2),
            'nao_entrou_valor', ROUND(COALESCE(pos.nao_entrou_valor, 0), 2),
            'pix', 0,
            'pix_os', 0,
            'previsto_ofx', ROUND(COALESCE(pos.rede_liquido, 0), 2),
            'diferenca', 0,
            'status_compensacao', COALESCE(pos.status_compensacao, 'sem_movimento'),
            'status', 'approved'
        ) ORDER BY s.name), '[]'::jsonb)
        INTO v_stores_detail
        FROM stores s
        LEFT JOIN recon_latest r ON r.store_id = s.id
        LEFT JOIN store_pos_summary pos ON pos.store_id = s.id
        LEFT JOIN store_vault v ON v.store_id = s.id
        WHERE s.active = true;

        RETURN jsonb_build_object(
            'date', v_target_date,
            'status_geral', v_status_geral,
            'is_closed', true,
            'closed_at', v_snapshot.closed_at,
            'saldo_bancos_ofx', v_saldo_bancos,
            'saldo_bancos_positivo', v_saldo_bancos_positivo,
            'dinheiro_em_lojas', v_dinheiro_lojas,
            'cartoes_a_compensar', v_cartoes_a_compensar,
            'devolucoes_rede', v_devolucoes_rede,
            'total_saldo_banco', v_total_saldo_banco,
            'total_saldo_banco_positivo', v_total_saldo_banco_positivo,
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
            'faturamento_anterior', v_faturamento_anterior,
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
    END IF;

    -- RAMAL 2: DIA ABERTO / DRAFT (Cálculo Dinâmico)
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

    SELECT 
        COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN type = 'out' THEN amount ELSE 0 END), 0)
    INTO v_total_entradas_ofx, v_total_saidas_ofx
    FROM ofx_transactions
    WHERE target_date = v_target_date;

    SELECT COALESCE(SUM(na_loja_os), 0)
    INTO v_na_loja_os
    FROM reconciliations
    WHERE date = v_target_date;

    IF v_na_loja_os = 0 THEN
        SELECT COALESCE(SUM(GREATEST(0, COALESCE(total_value, 0) - COALESCE(paid_value, 0))), 0)
        INTO v_na_loja_os
        FROM patio_os
        WHERE opened_at <= (v_target_date || ' 23:59:59')::timestamp
          AND (closed_at IS NULL OR closed_at::date > v_target_date)
          AND LOWER(COALESCE(status, 'em_aberto')) IN ('em_aberto', 'pago_parcial', 'em_andamento', 'aberta', 'aberto', 'pendente')
          AND (COALESCE(total_value, 0) - COALESCE(paid_value, 0)) > 0.05
          AND total_value < 100000;
    END IF;

    IF v_na_loja_os = 0 AND v_snapshot.total_patio IS NOT NULL THEN
        v_na_loja_os := v_snapshot.total_patio;
    END IF;

    SELECT 
        COALESCE(caixa_atual, 0),
        COALESCE(
            (metadata->>'odometro_hoje')::numeric,
            (metadata->>'faturamento_acumulado')::numeric,
            (metadata->>'faturamento_anterior')::numeric,
            (metadata->>'odometro_anterior')::numeric,
            faturamento,
            0
        )
    INTO v_caixa_anterior, v_faturamento_anterior
    FROM daily_snapshots
    WHERE date < v_target_date
    ORDER BY date DESC
    LIMIT 1;

    IF v_caixa_anterior = 0 AND v_snapshot.metadata->>'caixa_anterior' IS NOT NULL THEN
        v_caixa_anterior := (v_snapshot.metadata->>'caixa_anterior')::numeric;
    END IF;

    IF v_faturamento_anterior = 0 AND v_snapshot.metadata->>'faturamento_anterior' IS NOT NULL THEN
        v_faturamento_anterior := (v_snapshot.metadata->>'faturamento_anterior')::numeric;
    ELSIF v_faturamento_anterior = 0 AND v_snapshot.metadata->>'odometro_anterior' IS NOT NULL THEN
        v_faturamento_anterior := (v_snapshot.metadata->>'odometro_anterior')::numeric;
    END IF;

    v_odometro_hoje := COALESCE(
        (v_snapshot.metadata->>'odometro_hoje')::numeric,
        (v_snapshot.metadata->>'faturamento_odometro')::numeric,
        v_snapshot.faturamento,
        0
    );

    IF v_odometro_hoje > 0 AND v_faturamento_anterior > 0 AND v_odometro_hoje >= v_faturamento_anterior THEN
        v_faturamento_oi_base := v_odometro_hoje - v_faturamento_anterior;
    ELSIF v_snapshot.faturamento IS NOT NULL AND v_snapshot.faturamento > 0 AND (v_snapshot.metadata->>'odometro_hoje') IS NULL THEN
        v_faturamento_oi_base := v_snapshot.faturamento;
    ELSE
        SELECT COALESCE(SUM(amount), 0)
        INTO v_faturamento_oi_base
        FROM ofx_transactions
        WHERE target_date = v_target_date AND type = 'in';
    END IF;

    v_dinheiro_mp := COALESCE(v_snapshot.dinheiro_mp, 0);
    v_a_receber := COALESCE(v_snapshot.a_receber_manual, 0);
    v_juros_rede := COALESCE(v_snapshot.juros_rede, 0);

    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', id, 'title', title, 'amount', amount, 'type', type, 'description', description
        )), '[]'::jsonb)
    INTO v_faturamento_ajustes, v_faturamento_itens
    FROM daily_revenue_adjustments
    WHERE date = v_target_date;

    v_faturamento_periodo := v_faturamento_oi_base + v_faturamento_ajustes;

    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(CASE WHEN external_code IS NULL THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN external_code IS NOT NULL THEN amount ELSE 0 END), 0),
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', id, 'title', title, 'amount', amount, 'category', category,
            'description', description, 'store_id', store_id, 'external_code', external_code
        )), '[]'::jsonb)
    INTO v_total_bills, v_contas_extras, v_contas_imported_bills, v_contas_itens
    FROM daily_manual_bills
    WHERE date = v_target_date;

    IF v_total_bills > 0 THEN
        v_contas_manual := v_total_bills;
        v_contas_base := v_contas_imported_bills;
    ELSE
        v_contas_base := COALESCE(v_snapshot.contas_a_pagar, 0);
        v_contas_manual := v_contas_base;
    END IF;

    SELECT COALESCE(SUM(amount), 0)
    INTO v_dinheiro_lojas
    FROM store_cash_vault
    WHERE entry_date <= v_target_date 
      AND (
        status IN ('em_transito', 'pending')
        OR (status = 'depositado' AND deposited_at IS NOT NULL AND deposited_at::date > v_target_date)
      );

    BEGIN
        v_triple_recon := get_store_pos_triple_reconciliation(v_target_date::text);
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
    patio_store AS (
        SELECT store_id, COALESCE(SUM(GREATEST(0, total_value - paid_value)), 0) as patio_val
        FROM patio_os
        WHERE opened_at <= (v_target_date || ' 23:59:59')::timestamp
          AND (closed_at IS NULL OR closed_at::date > v_target_date)
          AND LOWER(COALESCE(status, 'em_aberto')) IN ('em_aberto', 'pago_parcial', 'em_andamento', 'aberta', 'aberto', 'pendente')
          AND (COALESCE(total_value, 0) - COALESCE(paid_value, 0)) > 0.05
          AND total_value < 100000
        GROUP BY store_id
    ),
    pix_store AS (
        SELECT 
            store_id,
            COALESCE(SUM(amount), 0) as pix_total
        FROM ofx_transactions
        WHERE target_date = v_target_date 
          AND type = 'in'
          AND (
              matched_os_number IS NOT NULL 
              OR counterpart_name ILIKE '%PIX%' 
              OR fitid ILIKE '%PIX%' 
              OR fitid ILIKE '%TRANSF%'
          )
          AND NOT (
              counterpart_name ILIKE '%REDE%' 
              OR counterpart_name ILIKE '%REDECARD%' 
              OR counterpart_name ILIKE '%CIELO%' 
              OR counterpart_name ILIKE '%STONE%' 
              OR counterpart_name ILIKE '%PAGSEGURO%'
              OR fitid ILIKE '%REDE%'
              OR bank_name ILIKE '%REDE%'
          )
        GROUP BY store_id
    ),
    ofx_pending_store AS (
        SELECT 
            store_id,
            COALESCE(SUM(amount), 0) as pending_total
        FROM ofx_transactions
        WHERE target_date = v_target_date
          AND matched_os_number IS NULL
          AND manual_category IS NULL
          AND NOT (
              counterpart_name ILIKE '%REDE%' 
              OR counterpart_name ILIKE '%REDECARD%' 
              OR counterpart_name ILIKE '%CIELO%' 
              OR counterpart_name ILIKE '%STONE%' 
              OR counterpart_name ILIKE '%PAGSEGURO%'
              OR fitid ILIKE '%REDE%'
              OR bank_name ILIKE '%REDE%'
              OR type = 'out'
          )
        GROUP BY store_id
    ),
    store_vault AS (
        SELECT 
            store_id,
            COALESCE(SUM(amount), 0) as dinheiro_loja,
            jsonb_agg(jsonb_build_object(
                'id', id, 'amount', amount, 'status', status, 'entry_date', entry_date, 'description', description
            )) as vault_entries
        FROM store_cash_vault
        WHERE entry_date <= v_target_date
          AND (
            status IN ('em_transito', 'pending')
            OR (status = 'depositado' AND deposited_at IS NOT NULL AND deposited_at::date > v_target_date)
          )
        GROUP BY store_id
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'store_id', s.id,
        'store_name', s.name,
        'color', COALESCE(s.avatar_url, ''),
        'saldo_banco', ROUND(COALESCE(r.bank_total, 0) + COALESCE(v.dinheiro_loja, 0) + COALESCE(pos.nao_entrou_valor, 0), 2),
        'saldo_banco_ofx', ROUND(COALESCE(r.bank_total, 0), 2),
        'bank_balance', ROUND(COALESCE(r.bank_total, 0), 2),
        'dinheiro_loja', ROUND(COALESCE(v.dinheiro_loja, 0), 2),
        'vault_entries', COALESCE(v.vault_entries, '[]'::jsonb),
        'na_loja_os', ROUND(COALESCE(r.historical_na_loja, p.patio_val, 0), 2),
        'patio_os', ROUND(COALESCE(r.historical_na_loja, p.patio_val, 0), 2),
        'maquininha', ROUND(COALESCE(pos.rede_liquido, 0), 2),
        'rede_bruto', ROUND(COALESCE(pos.rede_bruto, 0), 2),
        'rede_liquido', ROUND(COALESCE(pos.rede_liquido, 0), 2),
        'rede_devolucoes', ROUND(COALESCE(pos.rede_devolucoes, 0), 2),
        'ofx_maquininhas', ROUND(COALESCE(pos.ofx_maquininhas, 0), 2),
        'nao_entrou_maquininhas', ROUND(COALESCE(pos.nao_entrou_valor, 0), 2),
        'nao_entrou_valor', ROUND(COALESCE(pos.nao_entrou_valor, 0), 2),
        'pix', ROUND(COALESCE(pix.pix_total, 0), 2),
        'pix_os', ROUND(COALESCE(pix.pix_total, 0), 2),
        'previsto_ofx', ROUND(COALESCE(pos.rede_liquido, 0) + COALESCE(pix.pix_total, 0), 2),
        'diferenca', ROUND(COALESCE(pend.pending_total, 0), 2),
        'status_compensacao', COALESCE(pos.status_compensacao, 'sem_movimento'),
        'status', CASE WHEN COALESCE(pend.pending_total, 0) = 0 THEN 'approved' ELSE 'divergent' END
    ) ORDER BY s.name), '[]'::jsonb)
    INTO v_stores_detail
    FROM stores s
    LEFT JOIN recon_latest r ON r.store_id = s.id
    LEFT JOIN patio_store p ON p.store_id = s.id
    LEFT JOIN store_pos_summary pos ON pos.store_id = s.id
    LEFT JOIN pix_store pix ON pix.store_id = s.id
    LEFT JOIN ofx_pending_store pend ON pend.store_id = s.id
    LEFT JOIN store_vault v ON v.store_id = s.id
    WHERE s.active = true;

    v_total_saldo_banco_positivo := v_saldo_bancos_positivo + v_dinheiro_lojas + v_cartoes_a_compensar - v_devolucoes_rede;
    v_total_saldo_banco := v_saldo_bancos + v_dinheiro_lojas + v_cartoes_a_compensar - v_devolucoes_rede;
    
    v_caixa_atual := (v_total_saldo_banco_positivo + v_dinheiro_mp + v_a_receber + v_na_loja_os) - v_saldo_negativo_itau;
    v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;
    v_valor_disp_contas := v_faturamento_periodo - v_fluxo_caixa;
    v_subtotal_contas := v_contas_manual + v_juros_rede;
    v_diferenca_final := v_valor_disp_contas - v_subtotal_contas;
    v_status_geral := CASE WHEN ABS(v_diferenca_final) <= 50.00 THEN 'approved' ELSE 'divergent' END;

    RETURN jsonb_build_object(
        'date', v_target_date,
        'status_geral', v_status_geral,
        'is_closed', false,
        'closed_at', NULL,
        'saldo_bancos_ofx', ROUND(v_saldo_bancos, 2),
        'saldo_bancos_positivo', ROUND(v_saldo_bancos_positivo, 2),
        'dinheiro_em_lojas', ROUND(v_dinheiro_lojas, 2),
        'cartoes_a_compensar', ROUND(v_cartoes_a_compensar, 2),
        'devolucoes_rede', ROUND(v_devolucoes_rede, 2),
        'total_saldo_banco', ROUND(v_total_saldo_banco, 2),
        'total_saldo_banco_positivo', ROUND(v_total_saldo_banco_positivo, 2),
        'saldo_negativo_itau', ROUND(v_saldo_negativo_itau, 2),
        'dinheiro_mp', ROUND(v_dinheiro_mp, 2),
        'a_receber', ROUND(v_a_receber, 2),
        'na_loja_os', ROUND(v_na_loja_os, 2),
        'caixa_atual', ROUND(v_caixa_atual, 2),
        'caixa_anterior', ROUND(v_caixa_anterior, 2),
        'fluxo_caixa', ROUND(v_fluxo_caixa, 2),
        'faturamento_oi_base', ROUND(v_faturamento_oi_base, 2),
        'faturamento_ajustes', ROUND(v_faturamento_ajustes, 2),
        'faturamento_periodo', ROUND(v_faturamento_periodo, 2),
        'faturamento_anterior', ROUND(v_faturamento_anterior, 2),
        'valor_disp_contas', ROUND(v_valor_disp_contas, 2),
        'contas_base', ROUND(v_contas_base, 2),
        'contas_extras', ROUND(v_contas_extras, 2),
        'contas_manual', ROUND(v_contas_manual, 2),
        'juros_rede', ROUND(v_juros_rede, 2),
        'subtotal_contas', ROUND(v_subtotal_contas, 2),
        'diferenca_final', ROUND(v_diferenca_final, 2),
        'total_entradas_ofx', ROUND(v_total_entradas_ofx, 2),
        'total_saidas_ofx', ROUND(v_total_saidas_ofx, 2),
        'contas_itens', v_contas_itens,
        'faturamento_itens', v_faturamento_itens,
        'stores', v_stores_detail,
        'stores_detail', v_stores_detail
    );
END;
$$;
CREATE OR REPLACE FUNCTION public.calculate_daily_conciliation(p_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result jsonb;
BEGIN
    WITH recon AS (
        SELECT DISTINCT ON (store_id) store_id, bank_total as faturamento_banco, na_loja_os as historical_na_loja
        FROM reconciliations
        WHERE date <= p_date
        ORDER BY store_id, date DESC
    ),
    maq AS (
        SELECT store_id, COALESCE(SUM(amount), 0) as maquininha
        FROM ofx_transactions 
        WHERE target_date = p_date AND type = 'in' 
          AND (
            COALESCE(counterpart_name, '') ILIKE '%REDE%' 
            OR COALESCE(counterpart_name, '') ILIKE '%MAQUINA%' 
            OR COALESCE(bank_name, '') ILIKE '%REDE%' 
            OR COALESCE(bank_name, '') ILIKE '%MAQUINA%' 
            OR COALESCE(fitid, '') ILIKE '%REDE%' 
            OR COALESCE(fitid, '') ILIKE '%MAQUINA%'
          )
        GROUP BY store_id
    ),
    pix AS (
        SELECT store_id, COALESCE(SUM(amount), 0) as pix
        FROM ofx_transactions 
        WHERE target_date = p_date AND type = 'in' 
          AND (
            matched_os_number IS NOT NULL
            OR COALESCE(counterpart_name, '') ILIKE '%PIX%' 
            OR COALESCE(bank_name, '') ILIKE '%PIX%' 
            OR COALESCE(fitid, '') ILIKE '%PIX%'
            OR COALESCE(fitid, '') ILIKE '%TRANSF%'
          )
          AND NOT (
            COALESCE(counterpart_name, '') ILIKE '%REDE%' 
            OR COALESCE(counterpart_name, '') ILIKE '%MAQUINA%' 
            OR COALESCE(bank_name, '') ILIKE '%REDE%' 
            OR COALESCE(fitid, '') ILIKE '%REDE%'
          )
        GROUP BY store_id
    ),
    prev AS (
        SELECT store_id, COALESCE(SUM(amount), 0) as previsto_ofx
        FROM ofx_transactions 
        WHERE target_date = p_date AND type = 'in'
        GROUP BY store_id
    ),
    patio AS (
        SELECT store_id, COALESCE(SUM(GREATEST(0, COALESCE(total_value, 0) - COALESCE(paid_value, 0))), 0) as patio_os_sum
        FROM patio_os
        WHERE opened_at <= (p_date || ' 23:59:59')::timestamp
          AND (closed_at IS NULL OR closed_at::date > p_date)
          AND LOWER(COALESCE(status, 'em_aberto')) IN ('em_aberto', 'pago_parcial', 'em_andamento', 'aberta', 'aberto', 'pendente')
          AND (COALESCE(total_value, 0) - COALESCE(paid_value, 0)) > 0.05
          AND total_value < 100000
        GROUP BY store_id
    ),
    store_data AS (
        SELECT 
            s.id as store_id,
            s.name as store_name,
            COALESCE(r.faturamento_banco, 0) as faturamento_banco,
            COALESCE(m.maquininha, 0) as maquininha,
            COALESCE(px.pix, 0) as pix,
            COALESCE(pv.previsto_ofx, 0) as previsto_ofx,
            COALESCE(r.historical_na_loja, pt.patio_os_sum, 0) as na_loja_os
        FROM stores s
        LEFT JOIN recon r ON r.store_id = s.id
        LEFT JOIN maq m ON m.store_id = s.id
        LEFT JOIN pix px ON px.store_id = s.id
        LEFT JOIN prev pv ON pv.store_id = s.id
        LEFT JOIN patio pt ON pt.store_id = s.id
        WHERE s.active = true
    ),
    calculated AS (
        SELECT 
            store_id,
            store_name,
            faturamento_banco,
            maquininha,
            pix,
            previsto_ofx,
            na_loja_os,
            (previsto_ofx - (maquininha + pix)) as diferenca,
            CASE WHEN ABS(previsto_ofx - (maquininha + pix)) <= 1.00 THEN 'approved' ELSE 'divergence' END as status
        FROM store_data
    )
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'store_id', store_id,
            'store_name', store_name,
            'faturamento_banco', faturamento_banco,
            'maquininha', maquininha,
            'pix', pix,
            'na_loja_os', na_loja_os,
            'previsto_ofx', previsto_ofx,
            'diferenca', diferenca,
            'status', status
        )
    ), '[]'::jsonb) INTO v_result
    FROM calculated;

    RETURN v_result;
END;
$$;
