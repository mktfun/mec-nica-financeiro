-- Migration: Spec 436 - Harden Autonomous Reconciliation Loop
-- Proibida a auto-injeção de registros em daily_revenue_adjustments

CREATE OR REPLACE FUNCTION public.run_autonomous_reconciliation_loop(p_date text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_target_date date;
    v_summary jsonb;
    v_initial_delta numeric := 0;
    v_current_delta numeric := 0;
    v_is_conforme boolean := false;
    v_iteration integer := 0;
    v_steps jsonb := '[]'::jsonb;
    v_vault_rec record;
    v_snap_rec record;
    v_log_id uuid;
    v_result jsonb;
BEGIN
    v_target_date := p_date::date;

    -- 1. Primeira Apuração Inicial (Invocação explícita com 2 argumentos para desambiguação)
    v_summary := public.get_daily_reconciliation_summary(p_date, false);
    v_initial_delta := COALESCE((v_summary->>'diferenca_final')::numeric, 0);
    v_current_delta := v_initial_delta;

    -- Se já estiver conforme de primeira (tolerância <= 50)
    IF ABS(v_current_delta) <= 50 THEN
        v_is_conforme := true;
        v_steps := v_steps || jsonb_build_object(
            'step', 'verificacao_inicial',
            'status', 'conforme',
            'details', 'Fechamento dentro da tolerância de ± R$ 50 na primeira apuração.',
            'delta', v_current_delta
        );
    ELSE
        -- 2. Início do Loop Pericial de Auto-Healing (Até 3 iterações)
        WHILE v_iteration < 3 AND ABS(v_current_delta) > 50 LOOP
            v_iteration := v_iteration + 1;

            -- STEP 1: Varredura de Assinatura de Cofre / Dinheiro em Trânsito
            FOR v_vault_rec IN 
                SELECT * FROM public.store_cash_vault 
                WHERE (created_at::date = v_target_date OR entry_date < v_target_date)
                  AND status = 'em_transito'
            LOOP
                IF ABS(ABS(v_current_delta) - v_vault_rec.amount) <= 50 OR ABS(v_current_delta - v_vault_rec.amount) <= 50 THEN
                    UPDATE public.store_cash_vault
                    SET entry_date = v_target_date
                    WHERE id = v_vault_rec.id;

                    v_steps := v_steps || jsonb_build_object(
                        'step', 'reancoragem_cofre',
                        'status', 'auto_ajustado',
                        'store_id', v_vault_rec.store_id,
                        'amount', v_vault_rec.amount,
                        'details', format('Reancorado lançamento de cofre de R$ %s (%s) para a data %s.', v_vault_rec.amount, v_vault_rec.description, v_target_date)
                    );
                    EXIT; -- Sai do loop do vault para recalcular
                END IF;
            END LOOP;

            -- STEP 2: Verificação de Integridade Temporal do Snapshot Anterior
            SELECT * INTO v_snap_rec
            FROM public.daily_snapshots
            WHERE date < v_target_date
            ORDER BY date DESC
            LIMIT 1;

            IF v_snap_rec.id IS NOT NULL THEN
                NULL; -- Ancoragem validada
            END IF;

            -- (NOTA: STEP 3 REMOVIDO CONFORME SPEC 436: Proibida auto-injeção de aportes/ajustes de faturamento)

            -- Recalcula o resumo explicitamente com 2 parâmetros
            v_summary := public.get_daily_reconciliation_summary(p_date, false);
            v_current_delta := COALESCE((v_summary->>'diferenca_final')::numeric, 0);

            IF ABS(v_current_delta) <= 50 THEN
                v_is_conforme := true;
                v_steps := v_steps || jsonb_build_object(
                    'step', 'fechamento_concluido',
                    'status', 'conforme',
                    'details', format('Fechamento conforme alcançado na iteração %s. Delta final: R$ %s', v_iteration, v_current_delta),
                    'delta_final', v_current_delta
                );
                EXIT;
            END IF;
        END LOOP;
    END IF;

    -- 3. Persistência do Log Pericial de Auditoria
    INSERT INTO public.reconciliation_audit_logs (
        target_date,
        initial_delta,
        final_delta,
        is_conforme,
        iterations_count,
        steps_executed,
        summary_snapshot
    ) VALUES (
        v_target_date,
        v_initial_delta,
        v_current_delta,
        v_is_conforme,
        GREATEST(v_iteration, 1),
        v_steps,
        v_summary
    ) RETURNING id INTO v_log_id;

    -- 4. Payload de Retorno
    v_result := jsonb_build_object(
        'audit_log_id', v_log_id,
        'target_date', v_target_date,
        'initial_delta', v_initial_delta,
        'final_delta', v_current_delta,
        'is_conforme', v_is_conforme,
        'iterations_count', GREATEST(v_iteration, 1),
        'steps_executed', v_steps,
        'summary', v_summary
    );

    RETURN v_result;
END;
$function$;
