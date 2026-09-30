-- ==============================================================================
-- MIGRATION: 20260930000005_fix_ofx_balance_rule_and_daily_purge_reversion.sql
-- DESCRIÇÃO: Persistência Definitiva de Regras OFX e Reversão Completa de OSs no Reset Diário
-- SPEC: 459
-- ==============================================================================

-- 1. TABELA DE BACKUP PRÉ-IMPORTAÇÃO DO PÁTIO DE OS
CREATE TABLE IF NOT EXISTS public.patio_os_daily_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_date DATE NOT NULL,
    store_id TEXT NOT NULL,
    os_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_patio_os_daily_backups UNIQUE (target_date, store_id)
);

CREATE INDEX IF NOT EXISTS idx_patio_os_daily_backups_date_store 
    ON public.patio_os_daily_backups (target_date, store_id);

ALTER TABLE public.patio_os_daily_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to patio_os_daily_backups" ON public.patio_os_daily_backups;
CREATE POLICY "Allow read access to patio_os_daily_backups"
    ON public.patio_os_daily_backups FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all access to patio_os_daily_backups for authenticated" ON public.patio_os_daily_backups;
CREATE POLICY "Allow all access to patio_os_daily_backups for authenticated"
    ON public.patio_os_daily_backups FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to patio_os_daily_backups for anon" ON public.patio_os_daily_backups;
CREATE POLICY "Allow all access to patio_os_daily_backups for anon"
    ON public.patio_os_daily_backups FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.patio_os_daily_backups TO authenticated, anon, service_role;


-- 2. LIBERAÇÃO DE RLS PARA ANON EM REGRAS E SELEÇÕES DE SALDO OFX (Spec 439 / 459)
DROP POLICY IF EXISTS "Allow all access to ofx_balance_rules for anon" ON public.ofx_balance_rules;
CREATE POLICY "Allow all access to ofx_balance_rules for anon"
    ON public.ofx_balance_rules FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to ofx_balance_selections for anon" ON public.ofx_balance_selections;
CREATE POLICY "Allow all access to ofx_balance_selections for anon"
    ON public.ofx_balance_selections FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to ofx_balance_candidates for anon" ON public.ofx_balance_candidates;
CREATE POLICY "Allow all access to ofx_balance_candidates for anon"
    ON public.ofx_balance_candidates FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.ofx_balance_rules TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.ofx_balance_selections TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.ofx_balance_candidates TO authenticated, anon, service_role;


-- 3. RPC CANÔNICA: save_ofx_balance_rule (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.save_ofx_balance_rule(
    p_account_key TEXT,
    p_source_kind TEXT,
    p_memo_normalized TEXT DEFAULT NULL,
    p_store_id TEXT DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT true,
    p_user_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_next_version INT := 1;
    v_rule_id UUID;
BEGIN
    IF p_account_key IS NULL OR p_source_kind IS NULL THEN
        RAISE EXCEPTION 'account_key e source_kind são obrigatórios.';
    END IF;

    -- Se for desativar/revogar a regra:
    IF NOT p_is_active THEN
        UPDATE public.ofx_balance_rules
        SET is_active = false, updated_at = now()
        WHERE account_key = p_account_key AND is_active = true;
        
        RETURN jsonb_build_object(
            'success', true, 
            'action', 'revoked', 
            'account_key', p_account_key
        );
    END IF;

    -- Se for salvar/atualizar regra:
    -- 1. Desativa regras ativas anteriores para esta conta
    UPDATE public.ofx_balance_rules
    SET is_active = false, updated_at = now()
    WHERE account_key = p_account_key AND is_active = true;

    -- 2. Calcula próxima versão
    SELECT COALESCE(MAX(version), 0) + 1 INTO v_next_version
    FROM public.ofx_balance_rules
    WHERE account_key = p_account_key;

    -- 3. Insere a nova regra ativa
    INSERT INTO public.ofx_balance_rules (
        account_key,
        store_id,
        source_kind,
        memo_normalized,
        date_role,
        is_active,
        version,
        updated_by,
        created_at,
        updated_at
    ) VALUES (
        p_account_key,
        p_store_id,
        p_source_kind,
        p_memo_normalized,
        'SAME_DAY',
        true,
        v_next_version,
        p_user_id,
        now(),
        now()
    )
    RETURNING id INTO v_rule_id;

    RETURN jsonb_build_object(
        'success', true, 
        'action', 'saved', 
        'rule_id', v_rule_id, 
        'account_key', p_account_key, 
        'version', v_next_version
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_ofx_balance_rule(TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated, anon, service_role;


-- 4. RPC EVOLUÍDA: purge_daily_financial_data (COM ROLLBACK DE OS E RECÁLCULO DO PÁTIO)
CREATE OR REPLACE FUNCTION public.purge_daily_financial_data(p_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count_snapshots INT := 0;
    v_count_reconciliations INT := 0;
    v_count_manual_tx INT := 0;
    v_count_pos_tx INT := 0;
    v_count_ofx INT := 0;
    v_count_matches INT := 0;
    v_count_bills INT := 0;
    v_count_adjustments INT := 0;
    v_count_logs INT := 0;
    v_count_vault INT := 0;
    v_count_ap INT := 0;
    v_count_audit INT := 0;
    v_count_receivables INT := 0;
    v_count_observations INT := 0;
    v_count_ofx_selections INT := 0;
    v_count_os_restored INT := 0;
    v_count_os_deleted INT := 0;
    v_count_backups_cleared INT := 0;

    v_backup RECORD;
    v_os_rec RECORD;
    v_store TEXT;
    v_affected_stores TEXT[] := '{}';
    v_has_backup BOOLEAN := false;
BEGIN
    IF p_date IS NULL THEN
        RAISE EXCEPTION 'Data de exclusão é obrigatória.';
    END IF;

    -- 0. Mapear lojas afetadas pela conciliação desta data
    SELECT ARRAY_AGG(DISTINCT s_id) INTO v_affected_stores
    FROM (
        SELECT store_id AS s_id FROM public.reconciliations WHERE date = p_date
        UNION
        SELECT store_id AS s_id FROM public.pos_transactions WHERE target_date = p_date
        UNION
        SELECT store_id AS s_id FROM public.os_import_observations WHERE target_date = p_date
        UNION
        SELECT store_id AS s_id FROM public.patio_os_daily_backups WHERE target_date = p_date
    ) t
    WHERE s_id IS NOT NULL AND s_id <> '' AND s_id <> 'GLOBAL';

    -- 1. REVERSÃO DE ORDENS DE SERVIÇO (PATIO_OS)
    -- 1.1 Se houver backup pré-importação gravado em patio_os_daily_backups:
    SELECT EXISTS (
        SELECT 1 FROM public.patio_os_daily_backups WHERE target_date = p_date
    ) INTO v_has_backup;

    IF v_has_backup THEN
        FOR v_backup IN 
            SELECT store_id, os_data 
            FROM public.patio_os_daily_backups 
            WHERE target_date = p_date
        LOOP
            -- Deleta OSs adicionadas exclusivamente durante a importação desta data nesta filial
            DELETE FROM public.patio_os
            WHERE store_id = v_backup.store_id
              AND NOT (id::text IN (
                  SELECT item->>'id' 
                  FROM jsonb_array_elements(v_backup.os_data) item 
                  WHERE item->>'id' IS NOT NULL
              ));
            GET DIAGNOSTICS v_count_os_deleted = ROW_COUNT;

            -- Restaura valores e status originais de todas as OSs existentes no backup
            FOR v_os_rec IN 
                SELECT 
                    (item->>'id')::uuid AS id,
                    item->>'os_number' AS os_number,
                    COALESCE((item->>'total_value')::numeric, 0) AS total_value,
                    COALESCE((item->>'paid_value')::numeric, 0) AS paid_value,
                    COALESCE(item->>'status', 'em_aberto') AS status,
                    item->>'raw_status' AS raw_status,
                    COALESCE((item->>'credit_value')::numeric, 0) AS credit_value,
                    COALESCE((item->>'debit_value')::numeric, 0) AS debit_value,
                    COALESCE((item->>'pix_transfer_value')::numeric, 0) AS pix_transfer_value,
                    COALESCE((item->>'cash_value')::numeric, 0) AS cash_value,
                    (item->>'last_payment_date')::date AS last_payment_date,
                    (item->>'closed_at')::timestamptz AS closed_at,
                    COALESCE(item->>'match_status', 'UNMATCHED') AS match_status
                FROM jsonb_array_elements(v_backup.os_data) item
            LOOP
                UPDATE public.patio_os
                SET 
                    total_value = v_os_rec.total_value,
                    paid_value = v_os_rec.paid_value,
                    status = v_os_rec.status,
                    raw_status = v_os_rec.raw_status,
                    credit_value = v_os_rec.credit_value,
                    debit_value = v_os_rec.debit_value,
                    pix_transfer_value = v_os_rec.pix_transfer_value,
                    cash_value = v_os_rec.cash_value,
                    last_payment_date = v_os_rec.last_payment_date,
                    closed_at = v_os_rec.closed_at,
                    match_status = v_os_rec.match_status,
                    updated_at = now()
                WHERE id = v_os_rec.id;

                v_count_os_restored := v_count_os_restored + 1;
            END LOOP;
        END LOOP;

        DELETE FROM public.patio_os_daily_backups WHERE target_date = p_date;
        GET DIAGNOSTICS v_count_backups_cleared = ROW_COUNT;

    ELSE
        -- 1.2 Fallback: Reversão baseada em os_import_observations
        UPDATE public.patio_os p
        SET 
            paid_value = obs.paid_before,
            credit_value = obs.credit_before,
            debit_value = obs.debit_before,
            pix_transfer_value = obs.pix_before,
            status = CASE 
                WHEN obs.paid_before <= 0 THEN 'em_aberto'
                WHEN obs.paid_before >= p.total_value - 0.05 THEN 'finalizada'
                ELSE 'pago_parcial'
            END,
            closed_at = CASE 
                WHEN obs.paid_before >= p.total_value - 0.05 THEN p.closed_at
                ELSE NULL
            END,
            last_payment_date = CASE 
                WHEN p.last_payment_date = p_date THEN NULL
                ELSE p.last_payment_date
            END,
            match_status = CASE 
                WHEN obs.paid_before <= 0 THEN 'UNMATCHED'
                ELSE p.match_status
            END,
            updated_at = now()
        FROM public.os_import_observations obs
        WHERE obs.target_date = p_date
          AND p.store_id = obs.store_id
          AND p.os_number = obs.os_number;
        GET DIAGNOSTICS v_count_os_restored = ROW_COUNT;
    END IF;

    -- 2. EXPURGO DE DADOS DA CONCILIAÇÃO E ARTEFATOS SATÉLITES
    -- 2.1 Observações de importação
    DELETE FROM public.os_import_observations WHERE target_date = p_date;
    GET DIAGNOSTICS v_count_observations = ROW_COUNT;

    -- 2.2 Recebíveis importados da data
    DELETE FROM public.receivables WHERE date = p_date;
    GET DIAGNOSTICS v_count_receivables = ROW_COUNT;

    -- 2.3 Seleções e eventos de saldo OFX da data
    DELETE FROM public.ofx_balance_selections WHERE reconciliation_date = p_date;
    GET DIAGNOSTICS v_count_ofx_selections = ROW_COUNT;

    DELETE FROM public.ofx_balance_selection_events WHERE reconciliation_date = p_date;

    -- 2.4 Snapshots diários e reconciliações por loja
    DELETE FROM public.daily_snapshots WHERE date = p_date;
    GET DIAGNOSTICS v_count_snapshots = ROW_COUNT;

    DELETE FROM public.reconciliations WHERE date = p_date;
    GET DIAGNOSTICS v_count_reconciliations = ROW_COUNT;

    -- 2.5 Pareamentos de conciliação
    DELETE FROM public.conciliation_matches WHERE target_date = p_date;
    GET DIAGNOSTICS v_count_matches = ROW_COUNT;

    -- 2.6 Transações Manuais e POS (Maquininha)
    DELETE FROM public.manual_transactions 
    WHERE target_date = p_date 
       OR DATE(occurred_at) = p_date;
    GET DIAGNOSTICS v_count_manual_tx = ROW_COUNT;

    DELETE FROM public.pos_transactions 
    WHERE target_date = p_date 
       OR DATE(occurred_at) = p_date;
    GET DIAGNOSTICS v_count_pos_tx = ROW_COUNT;

    -- 2.7 Transações OFX brutas
    DELETE FROM public.ofx_transactions 
    WHERE target_date = p_date 
       OR DATE(occurred_at) = p_date;
    GET DIAGNOSTICS v_count_ofx = ROW_COUNT;

    -- 2.8 Despesas manuais e contas a pagar do dia
    DELETE FROM public.daily_manual_bills WHERE date = p_date;
    GET DIAGNOSTICS v_count_bills = ROW_COUNT;

    -- 2.9 Ajustes de faturamento
    DELETE FROM public.daily_revenue_adjustments WHERE date = p_date;
    GET DIAGNOSTICS v_count_adjustments = ROW_COUNT;

    -- 2.10 Logs de auditoria pericial
    DELETE FROM public.reconciliation_audit_logs WHERE target_date = p_date;
    GET DIAGNOSTICS v_count_audit = ROW_COUNT;

    -- 2.11 Movimentações de cofre geradas na data
    DELETE FROM public.store_cash_vault WHERE entry_date = p_date;
    GET DIAGNOSTICS v_count_vault = ROW_COUNT;

    -- 2.12 Lotes de contas a pagar importados
    DELETE FROM public.accounts_payable_imports WHERE date = p_date;
    GET DIAGNOSTICS v_count_ap = ROW_COUNT;

    -- 2.13 Logs de importação do dia
    DELETE FROM public.import_logs WHERE target_date = p_date;
    GET DIAGNOSTICS v_count_logs = ROW_COUNT;

    -- 3. RECÁLCULO ATÔMICO DO PÁTIO PARA CADA FILIAL AFETADA
    IF v_affected_stores IS NOT NULL AND array_length(v_affected_stores, 1) > 0 THEN
        FOREACH v_store IN ARRAY v_affected_stores
        LOOP
            BEGIN
                PERFORM public.recompute_patio_for_date_and_store(p_date, v_store);
            EXCEPTION WHEN OTHERS THEN NULL; END;
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'date', p_date,
        'restored_os_count', v_count_os_restored,
        'deleted_new_os_count', v_count_os_deleted,
        'deleted_observations', v_count_observations,
        'deleted_receivables', v_count_receivables,
        'deleted_ofx_selections', v_count_ofx_selections,
        'deleted_snapshots', v_count_snapshots,
        'deleted_reconciliations', v_count_reconciliations,
        'deleted_manual_transactions', v_count_manual_tx,
        'deleted_pos_transactions', v_count_pos_tx,
        'deleted_ofx', v_count_ofx,
        'deleted_matches', v_count_matches,
        'deleted_bills', v_count_bills,
        'deleted_adjustments', v_count_adjustments,
        'deleted_logs', v_count_logs,
        'deleted_vault', v_count_vault,
        'deleted_audit_logs', v_count_audit,
        'affected_stores', v_affected_stores
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_daily_financial_data(DATE) TO authenticated, anon, service_role;
