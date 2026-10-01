-- ==============================================================================
-- Migração: 20261001000001_remediar_brechas_seguranca_lovable.sql
-- Propósito: Remediar os 5 achados de segurança do Lovable / Supabase Security Advisor:
--   1. View public.transactions com security_invoker = true (0010_security_definer_view)
--   2. search_path = public em todas as funções do schema public (0011_function_search_path_mutable)
--   3. Revogar privilégios EXECUTE da role anon em RPCs (0028_anon_security_definer_function_executable)
--   4. Eliminação de políticas permissivas anon/public nas 38 tabelas com RLS
--   5. Hardening da política de storage do bucket knowledge_graph
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. VIEW TRANSACTIONS: Definir security_invoker = true
-- ------------------------------------------------------------------------------
ALTER VIEW public.transactions SET (security_invoker = true);

-- ------------------------------------------------------------------------------
-- 2. FIXAR search_path = public EM TODAS AS FUNÇÕES DE public
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
    LOOP
        BEGIN
            EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public;', r.proname, r.args);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Não foi possível alterar search_path para public.%(%): %', r.proname, r.args, SQLERRM;
        END;
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 3. REVOGAR EXECUTE DA ROLE anon EM TODAS AS FUNÇÕES DE public
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ------------------------------------------------------------------------------
-- 4. HARDENING DE STORAGE: BUCKET knowledge_graph
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Leitura bucket knowledge_graph" ON storage.objects;
DROP POLICY IF EXISTS "Leitura restrita bucket knowledge_graph" ON storage.objects;

CREATE POLICY "Leitura restrita bucket knowledge_graph" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'knowledge_graph' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid()
  )
);

-- ------------------------------------------------------------------------------
-- 5. EXPURGO DE POLÍTICAS ANÔNIMAS E PERMISSIVAS EM TODAS AS TABELAS FINANCEIRAS
-- ------------------------------------------------------------------------------

-- accounts_payable_imports
DROP POLICY IF EXISTS "Allow public insert accounts_payable_imports" ON public.accounts_payable_imports;
DROP POLICY IF EXISTS "Allow public read accounts_payable_imports" ON public.accounts_payable_imports;
CREATE POLICY "authenticated_read_accounts_payable_imports" ON public.accounts_payable_imports
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "authenticated_write_accounts_payable_imports" ON public.accounts_payable_imports
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

-- ai_settings
DROP POLICY IF EXISTS "ai_settings_read_policy" ON public.ai_settings;
DROP POLICY IF EXISTS "ai_settings_write_policy" ON public.ai_settings;
CREATE POLICY "authenticated_read_ai_settings" ON public.ai_settings
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "authenticated_write_ai_settings" ON public.ai_settings
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.can_edit_data = true)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.can_edit_data = true)));

-- cash_registers
DROP POLICY IF EXISTS "Allow all operations for all users" ON public.cash_registers;
CREATE POLICY "authenticated_read_cash_registers" ON public.cash_registers
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "authenticated_write_cash_registers" ON public.cash_registers
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

-- conciliation_matches
DROP POLICY IF EXISTS "Allow all on conciliation_matches" ON public.conciliation_matches;
CREATE POLICY "authenticated_read_conciliation_matches" ON public.conciliation_matches
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "authenticated_write_conciliation_matches" ON public.conciliation_matches
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

-- conversations & messages
DROP POLICY IF EXISTS "allow_manage_conversations" ON public.conversations;
DROP POLICY IF EXISTS "allow_read_conversations" ON public.conversations;
CREATE POLICY "authenticated_manage_conversations" ON public.conversations
  FOR ALL TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "allow_manage_messages" ON public.messages;
DROP POLICY IF EXISTS "allow_read_messages" ON public.messages;
CREATE POLICY "authenticated_manage_messages" ON public.messages
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

-- daily_manual_bills
DROP POLICY IF EXISTS "Allow public all on daily_manual_bills" ON public.daily_manual_bills;
DROP POLICY IF EXISTS "Authenticated users can manage daily_manual_bills" ON public.daily_manual_bills;
CREATE POLICY "authenticated_manage_daily_manual_bills" ON public.daily_manual_bills
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

-- daily_revenue_adjustments
DROP POLICY IF EXISTS "Allow public all on daily_revenue_adjustments" ON public.daily_revenue_adjustments;
DROP POLICY IF EXISTS "Authenticated users can manage daily_revenue_adjustments" ON public.daily_revenue_adjustments;
CREATE POLICY "authenticated_manage_daily_revenue_adjustments" ON public.daily_revenue_adjustments
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

-- daily_snapshots
DROP POLICY IF EXISTS "Admins can manage daily_snapshots" ON public.daily_snapshots;
DROP POLICY IF EXISTS "Allow anon modify daily_snapshots" ON public.daily_snapshots;
DROP POLICY IF EXISTS "Allow anon read daily_snapshots" ON public.daily_snapshots;
DROP POLICY IF EXISTS "Authenticated users can read daily_snapshots" ON public.daily_snapshots;
CREATE POLICY "authenticated_read_daily_snapshots" ON public.daily_snapshots
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "authenticated_manage_daily_snapshots" ON public.daily_snapshots
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

-- expense_category_rules
DROP POLICY IF EXISTS "Allow public insert/update expense_category_rules" ON public.expense_category_rules;
DROP POLICY IF EXISTS "Allow public read expense_category_rules" ON public.expense_category_rules;
CREATE POLICY "authenticated_manage_expense_category_rules" ON public.expense_category_rules
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

-- import_batches & import_logs
DROP POLICY IF EXISTS "Allow all on import_batches" ON public.import_batches;
CREATE POLICY "authenticated_manage_import_batches" ON public.import_batches
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Enable delete access for all users" ON public.import_logs;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.import_logs;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.import_logs;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.import_logs;
CREATE POLICY "authenticated_manage_import_logs" ON public.import_logs
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

-- intercompany_entities
DROP POLICY IF EXISTS "Allow public insert/update intercompany_entities" ON public.intercompany_entities;
DROP POLICY IF EXISTS "Allow public read intercompany_entities" ON public.intercompany_entities;
CREATE POLICY "authenticated_manage_intercompany_entities" ON public.intercompany_entities
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

-- ofx_balance_*
DROP POLICY IF EXISTS "Allow all access to ofx_balance_candidates for anon" ON public.ofx_balance_candidates;
DROP POLICY IF EXISTS "Allow all access to ofx_balance_candidates for authenticated" ON public.ofx_balance_candidates;
DROP POLICY IF EXISTS "Allow read access to ofx_balance_candidates" ON public.ofx_balance_candidates;
CREATE POLICY "authenticated_manage_ofx_balance_candidates" ON public.ofx_balance_candidates
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Allow all access to ofx_balance_rules for anon" ON public.ofx_balance_rules;
DROP POLICY IF EXISTS "Allow all access to ofx_balance_rules for authenticated" ON public.ofx_balance_rules;
DROP POLICY IF EXISTS "Allow read access to ofx_balance_rules" ON public.ofx_balance_rules;
CREATE POLICY "authenticated_manage_ofx_balance_rules" ON public.ofx_balance_rules
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Allow insert access to ofx_balance_selection_events for authent" ON public.ofx_balance_selection_events;
DROP POLICY IF EXISTS "Allow read access to ofx_balance_selection_events" ON public.ofx_balance_selection_events;
CREATE POLICY "authenticated_manage_ofx_balance_selection_events" ON public.ofx_balance_selection_events
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Allow all access to ofx_balance_selections for anon" ON public.ofx_balance_selections;
DROP POLICY IF EXISTS "Allow all access to ofx_balance_selections for authenticated" ON public.ofx_balance_selections;
DROP POLICY IF EXISTS "Allow read access to ofx_balance_selections" ON public.ofx_balance_selections;
CREATE POLICY "authenticated_manage_ofx_balance_selections" ON public.ofx_balance_selections
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

-- ofx_transactions
DROP POLICY IF EXISTS "Allow anon modify ofx_transactions" ON public.ofx_transactions;
DROP POLICY IF EXISTS "Allow anon read ofx_transactions" ON public.ofx_transactions;
DROP POLICY IF EXISTS "Users can manage ofx_transactions for their stores" ON public.ofx_transactions;
DROP POLICY IF EXISTS "Authenticated users can manage ofx_transactions" ON public.ofx_transactions;
CREATE POLICY "authenticated_manage_ofx_transactions" ON public.ofx_transactions
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

-- orphan_justification_history
DROP POLICY IF EXISTS "Allow read access to orphan_justification_history" ON public.orphan_justification_history;
DROP POLICY IF EXISTS "Allow write access to orphan_justification_history" ON public.orphan_justification_history;
CREATE POLICY "authenticated_manage_orphan_justification_history" ON public.orphan_justification_history
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

-- os_import_observations
DROP POLICY IF EXISTS "Allow all access to os_import_observations for authenticated" ON public.os_import_observations;
DROP POLICY IF EXISTS "Allow anon all on os_import_observations" ON public.os_import_observations;
DROP POLICY IF EXISTS "Allow read access to os_import_observations" ON public.os_import_observations;
CREATE POLICY "authenticated_manage_os_import_observations" ON public.os_import_observations
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

-- patio_os & patio_os_daily_backups
DROP POLICY IF EXISTS "Allow anon modify patio_os" ON public.patio_os;
DROP POLICY IF EXISTS "Allow anon read patio_os" ON public.patio_os;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.patio_os;
DROP POLICY IF EXISTS "patio_read" ON public.patio_os;
DROP POLICY IF EXISTS "patio_update" ON public.patio_os;
DROP POLICY IF EXISTS "patio_write" ON public.patio_os;
CREATE POLICY "authenticated_manage_patio_os" ON public.patio_os
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Allow all access to patio_os_daily_backups for anon" ON public.patio_os_daily_backups;
DROP POLICY IF EXISTS "Allow all access to patio_os_daily_backups for authenticated" ON public.patio_os_daily_backups;
DROP POLICY IF EXISTS "Allow read access to patio_os_daily_backups" ON public.patio_os_daily_backups;
CREATE POLICY "authenticated_manage_patio_os_daily_backups" ON public.patio_os_daily_backups
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

-- pos_ofx_settlements & pos_transactions
DROP POLICY IF EXISTS "Allow all on pos_ofx_settlements" ON public.pos_ofx_settlements;
CREATE POLICY "authenticated_manage_pos_ofx_settlements" ON public.pos_ofx_settlements
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Allow anon modify pos_transactions" ON public.pos_transactions;
DROP POLICY IF EXISTS "Allow anon read pos_transactions" ON public.pos_transactions;
DROP POLICY IF EXISTS "Users can manage pos_transactions for their stores" ON public.pos_transactions;
DROP POLICY IF EXISTS "Authenticated users can manage pos_transactions" ON public.pos_transactions;
CREATE POLICY "authenticated_manage_pos_transactions" ON public.pos_transactions
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

-- reconciliation_audit_logs
DROP POLICY IF EXISTS "Allow anon insert reconciliation_audit_logs" ON public.reconciliation_audit_logs;
DROP POLICY IF EXISTS "Allow anon read reconciliation_audit_logs" ON public.reconciliation_audit_logs;
DROP POLICY IF EXISTS "Allow authenticated insert reconciliation_audit_logs" ON public.reconciliation_audit_logs;
DROP POLICY IF EXISTS "Allow authenticated read reconciliation_audit_logs" ON public.reconciliation_audit_logs;
CREATE POLICY "authenticated_manage_reconciliation_audit_logs" ON public.reconciliation_audit_logs
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

-- reconciliation_pipeline_sessions
DROP POLICY IF EXISTS "allow_all_pipeline_sessions" ON public.reconciliation_pipeline_sessions;
CREATE POLICY "authenticated_manage_pipeline_sessions" ON public.reconciliation_pipeline_sessions
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

-- reconciliations
DROP POLICY IF EXISTS "Allow anon modify reconciliations" ON public.reconciliations;
DROP POLICY IF EXISTS "Allow anon read reconciliations" ON public.reconciliations;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.reconciliations;
DROP POLICY IF EXISTS "reconciliations_read" ON public.reconciliations;
DROP POLICY IF EXISTS "reconciliations_update" ON public.reconciliations;
DROP POLICY IF EXISTS "reconciliations_write" ON public.reconciliations;
CREATE POLICY "authenticated_manage_reconciliations" ON public.reconciliations
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

-- store_cash_vault
DROP POLICY IF EXISTS "Allow public all on store_cash_vault" ON public.store_cash_vault;
DROP POLICY IF EXISTS "Allow public read on store_cash_vault" ON public.store_cash_vault;
DROP POLICY IF EXISTS "Authenticated users can manage store_cash_vault" ON public.store_cash_vault;
DROP POLICY IF EXISTS "Authenticated users can read store_cash_vault" ON public.store_cash_vault;
CREATE POLICY "authenticated_manage_store_cash_vault" ON public.store_cash_vault
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

-- store_file_mappings & stores
DROP POLICY IF EXISTS "Allow all access to store_file_mappings" ON public.store_file_mappings;
CREATE POLICY "authenticated_manage_store_file_mappings" ON public.store_file_mappings
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "stores_read_all" ON public.stores;
CREATE POLICY "authenticated_read_stores" ON public.stores
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

-- manual_transactions & receivables
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.manual_transactions;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.manual_transactions;
DROP POLICY IF EXISTS "transactions_read" ON public.manual_transactions;
DROP POLICY IF EXISTS "transactions_write" ON public.manual_transactions;
CREATE POLICY "authenticated_manage_manual_transactions" ON public.manual_transactions
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.receivables;
DROP POLICY IF EXISTS "receivables_read" ON public.receivables;
DROP POLICY IF EXISTS "receivables_update" ON public.receivables;
DROP POLICY IF EXISTS "receivables_write" ON public.receivables;
CREATE POLICY "authenticated_manage_receivables" ON public.receivables
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

-- audit_logs & system_logs
DROP POLICY IF EXISTS "Permitir insercao de logs para autenticados" ON public.audit_logs;
DROP POLICY IF EXISTS "Permitir leitura de logs para autenticados" ON public.audit_logs;
CREATE POLICY "authenticated_manage_audit_logs" ON public.audit_logs
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));

DROP POLICY IF EXISTS "Users can view and insert system_logs" ON public.system_logs;
CREATE POLICY "authenticated_manage_system_logs" ON public.system_logs
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));
