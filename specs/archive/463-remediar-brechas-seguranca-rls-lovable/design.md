# Design Document 463 — Remediação de Segurança AppSec & RLS Hardening (Lovable Security Findings)

## 1. Arquitetura de Fluxo e Segurança de Dados

```mermaid
flowchart TD
    subgraph Client["Cliente Web (Navegador)"]
        User["Operador / Gestor"] --> AuthContext["useAuth / useSession (JWT Autenticado)"]
        AnonAttacker["Atacante Externo (Anon Key)"]
    end

    subgraph SupabaseGateway["Supabase PostgREST Gateway"]
        AuthMiddleware["JWT Validation (auth.uid, auth.role)"]
    end

    subgraph Database["PostgreSQL 17 (Supabase cnwzsvowkfymtdiryhqc)"]
        subgraph RLS["Camada de Row Level Security (RLS)"]
            ProfileCheck{"auth.uid() existe em public.profiles?"}
            PermCheck{"can_edit_data = true OU role = 'admin'?"}
        end
        subgraph Objects["Objetos de Banco de Dados"]
            Tables["38 Tabelas Financeiras (ofx, pos, patio, reconciliations, etc.)"]
            Storage["storage.objects (bucket knowledge_graph)"]
            Views["View public.transactions (security_invoker = true)"]
            Functions["RPCs (search_path = public, REVOKE EXECUTE FROM anon)"]
        end
    end

    AuthContext -->|Bearer JWT| AuthMiddleware
    AnonAttacker -->|Chave Anon sem JWT| AuthMiddleware

    AuthMiddleware -->|Role: anon| ProfileCheck
    ProfileCheck -->|NÃO| Blocked["🚫 401 / 403 Acesso Negado (PostgREST)"]

    AuthMiddleware -->|Role: authenticated| ProfileCheck
    ProfileCheck -->|SIM| PermCheck
    PermCheck -->|Leitura (SELECT)| Tables
    PermCheck -->|Escrita Autorizada| Tables
    PermCheck -->|Acesso Storage Restrito| Storage
    PermCheck -->|Consulta View Segura| Views
    PermCheck -->|Execução Segura| Functions
```

---

## 2. Contratos DDL Detalhados da Migração

A migração `20261001000001_remediar_brechas_seguranca_lovable.sql` executa 5 módulos cirúrgicos:

### Módulo 1: Correção de View com Security Definer (`0010_security_definer_view`)
```sql
-- Garantir que a view transactions execute com as permissões do invocador (RLS do usuário)
ALTER VIEW public.transactions SET (security_invoker = true);
```

### Módulo 2: Correção de Search Path Mutável nas Funções (`0011_function_search_path_mutable`)
Para cada uma das 29 funções identificadas, fixar `search_path = public`:
```sql
ALTER FUNCTION public.admin_create_user(text, text, text, text, boolean, boolean) SET search_path = public;
ALTER FUNCTION public.admin_update_user_permissions(uuid, text, text, boolean, boolean) SET search_path = public;
ALTER FUNCTION public.apply_ofx_balance_selection(jsonb, date, text, text) SET search_path = public;
ALTER FUNCTION public.apply_rede_ofx_settlements(date, jsonb) SET search_path = public;
ALTER FUNCTION public.auto_match_daily_transactions(text) SET search_path = public;
ALTER FUNCTION public.auto_match_receivables(text, text) SET search_path = public;
ALTER FUNCTION public.auto_match_saidas(text) SET search_path = public;
ALTER FUNCTION public.auto_match_transactions(date) SET search_path = public;
ALTER FUNCTION public.batch_upsert_patio_os(text, date, jsonb) SET search_path = public;
ALTER FUNCTION public.categorize_orphan_transaction(uuid, text, text) SET search_path = public;
ALTER FUNCTION public.check_client_name_match(text, text) SET search_path = public;
ALTER FUNCTION public.clear_all_financial_data() SET search_path = public;
ALTER FUNCTION public.close_daily_snapshot(text, text, jsonb) SET search_path = public;
ALTER FUNCTION public.create_and_link_manual_os(text, uuid, text, text, text, text, numeric, text, numeric) SET search_path = public;
ALTER FUNCTION public.dar_baixa_dinheiro(uuid, text, text, numeric, date, uuid, text) SET search_path = public;
ALTER FUNCTION public.delete_import_batch(text, text[], boolean, uuid[], timestamp with time zone[]) SET search_path = public;
ALTER FUNCTION public.fechar_dia(text, boolean) SET search_path = public;
ALTER FUNCTION public.get_conciliation_breakdown(text, date) SET search_path = public;
ALTER FUNCTION public.get_daily_reconciliation_summary(text, boolean) SET search_path = public;
ALTER FUNCTION public.get_dashboard_metrics(date) SET search_path = public;
ALTER FUNCTION public.get_ofx_account_history(text, integer) SET search_path = public;
ALTER FUNCTION public.get_ofx_balance_rules(text[]) SET search_path = public;
ALTER FUNCTION public.get_patio_summary() SET search_path = public;
ALTER FUNCTION public.get_pending_patio_os_for_ocr(date) SET search_path = public;
ALTER FUNCTION public.get_pipeline_session_state(date) SET search_path = public;
ALTER FUNCTION public.get_pix_os_eligible_candidates(uuid, boolean) SET search_path = public;
ALTER FUNCTION public.get_raw_ofx_data(text, date) SET search_path = public;
ALTER FUNCTION public.get_raw_os_data(text, text) SET search_path = public;
ALTER FUNCTION public.get_raw_rede_data(text, date) SET search_path = public;
ALTER FUNCTION public.get_receivables_summary(text) SET search_path = public;
ALTER FUNCTION public.get_rede_os_eligible_candidates(uuid, boolean) SET search_path = public;
ALTER FUNCTION public.get_store_financial_stats(text, text, text) SET search_path = public;
ALTER FUNCTION public.get_store_pos_triple_reconciliation(text) SET search_path = public;
ALTER FUNCTION public.get_system_users() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.link_manual_pix_to_os(uuid, text, text, numeric) SET search_path = public;
ALTER FUNCTION public.link_manual_rede_to_os(uuid, text, text, numeric) SET search_path = public;
ALTER FUNCTION public.liquidate_legacy_os(uuid[]) SET search_path = public;
ALTER FUNCTION public.log_daily_snapshot_audit() SET search_path = public;
ALTER FUNCTION public.log_import_batch_audit() SET search_path = public;
ALTER FUNCTION public.match_bank_transactions(uuid, date) SET search_path = public;
ALTER FUNCTION public.match_stage2_rede_os(date, text) SET search_path = public;
ALTER FUNCTION public.preview_ofx_balance_selection(jsonb, date) SET search_path = public;
ALTER FUNCTION public.process_marco_zero_import(text, jsonb, jsonb) SET search_path = public;
ALTER FUNCTION public.purge_daily_financial_data(date) SET search_path = public;
ALTER FUNCTION public.purge_expired_bot_files() SET search_path = public;
ALTER FUNCTION public.recompute_patio_for_date_and_store(date, text) SET search_path = public;
ALTER FUNCTION public.record_os_import_batch(text, date, text, jsonb, jsonb) SET search_path = public;
ALTER FUNCTION public.register_or_update_os_payments(uuid, numeric, numeric, numeric, numeric, numeric, numeric, text, date) SET search_path = public;
ALTER FUNCTION public.resolve_orphan_ofx_decision(uuid, text, text, text, uuid, text, text) SET search_path = public;
ALTER FUNCTION public.resolve_orphan_saida_ofx(uuid, text, text, boolean, text, numeric, date, uuid) SET search_path = public;
ALTER FUNCTION public.resolve_orphan_transaction(uuid, text, jsonb) SET search_path = public;
ALTER FUNCTION public.run_autonomous_reconciliation_loop(text) SET search_path = public;
ALTER FUNCTION public.save_ofx_balance_rule(text, text, text, text, boolean, text) SET search_path = public;
ALTER FUNCTION public.save_pipeline_step_progress(date, integer, text, jsonb, boolean, uuid, text) SET search_path = public;
ALTER FUNCTION public.test_ramal_1(text) SET search_path = public;
ALTER FUNCTION public.trg_transactions_instead_of_update() SET search_path = public;
ALTER FUNCTION public.unlink_manual_os_match(text, uuid, text) SET search_path = public;
ALTER FUNCTION public.update_manual_bill(uuid, text, numeric, text, text, text, boolean) SET search_path = public;
ALTER FUNCTION public.update_reconciliacoes_triplas_updated_at() SET search_path = public;
ALTER FUNCTION public.update_reconciliation_bank_total() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.upsert_daily_revenue_adjustment(date, text, numeric, text, text, text, uuid) SET search_path = public;
```

### Módulo 3: Revogação de Permissões Anônimas em Funções Críticas (`0028_anon_security_definer_function_executable`)
```sql
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
```

### Módulo 4: Saneamento das 38 Tabelas com RLS Excessivamente Permissivo
Para cada tabela com `Allow anon` / `qual = 'true'`:
1. Remover policies antigas permissivas (`DROP POLICY IF EXISTS ... ON public.<table>;`).
2. Criar policy canônica de leitura restrita `TO authenticated`:
```sql
CREATE POLICY "authenticated_read_<table>"
ON public.<table> FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()));
```
3. Criar policy canônica de escrita restrita `TO authenticated`:
```sql
CREATE POLICY "authenticated_write_<table>"
ON public.<table> FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND (profiles.can_edit_data = true OR profiles.role = 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
      AND (profiles.can_edit_data = true OR profiles.role = 'admin')
  )
);
```

### Módulo 5: Hardening do Storage Bucket `knowledge_graph`
```sql
DROP POLICY IF EXISTS "Leitura bucket knowledge_graph" ON storage.objects;

CREATE POLICY "Leitura restrita bucket knowledge_graph"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'knowledge_graph' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid())
);
```

---

## 3. Cenários Obrigatórios

### Cenário 1: Happy Path (Operador Autenticado)
1. Usuário realiza login no frontend (`/login`) com credenciais válidas.
2. `useSession()` obtém o JWT assinado pelo Supabase.
3. Requisições às tabelas `patio_os`, `ofx_transactions`, `pos_transactions` e `reconciliations` enviam o cabeçalho `Authorization: Bearer <jwt>`.
4. Postgres valida `auth.uid() = profiles.id` e `can_edit_data = true`.
5. Operações de leitura, conciliação e salvamento ocorrem com status 200 OK sem qualquer bloqueio.

### Cenário 2: Edge Case (Tentativa de Bypass Anônimo / Injection)
1. Atacante obtém a chave pública `anon` do bundle JavaScript do frontend.
2. Atacante envia `POST /rest/v1/patio_os` ou `DELETE /rest/v1/reconciliations` diretamente ao endpoint Supabase sem token JWT.
3. Postgres avalia as novas políticas RLS: nenhuma política para o papel `anon` existe.
4. RLS bloqueia compulsoriamente a operação e retorna payload vazio ou erro 401/403.
5. Tentativas de chamar RPCs `SECURITY DEFINER` retornam `permission denied for function`.

---

## 4. Critérios de Aceitação Verificáveis

1. **Supabase Advisors Security Clean:**
   - Chamada `supabase:get_advisors { type: 'security' }` confirma que `security_definer_view` foi zerado (count: 0).
   - `function_search_path_mutable` foi reduzido a 0.
   - `anon_security_definer_function_executable` foi reduzido a 0.
2. **Eliminação de Políticas Anônimas:**
   - Consulta `SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND 'anon' = ANY(roles) AND qual = 'true';` retorna `0`.
3. **Build do Frontend Intacto:**
   - `npm run build` executa sem nenhum erro de compilação ou tipo TypeScript (`exit code 0`).
4. **Deploy Lovable Desbloqueado:**
   - Publicação na Lovable conclui sem bloqueios de vulnerabilidades críticas de banco.

---

## 5. Cenários de Teste [SCAN -> INFER -> VERIFY -> FIX]

1. **[TEST 1 - RLS Isolation]:**
   - *Scan:* Consultar tabela `pg_policies` para as tabelas `daily_snapshots`, `patio_os`, `ofx_transactions`.
   - *Infer:* Nenhuma policy deve conceder `ALL` ou `SELECT` para `anon`.
   - *Verify:* Executar query simulando role `anon` (`SET ROLE anon; SELECT count(*) FROM patio_os; RESET ROLE;`) -> Deve retornar 0 linhas (ou erro de permissão).
   - *Fix:* Caso alguma tabela retenha policy residual, aplicar drop cirúrgico.

2. **[TEST 2 - Function Security Definer Executability]:**
   - *Scan:* Inspecionar `information_schema.routine_privileges` para rotinas `SECURITY DEFINER`.
   - *Infer:* Nenhuma RPC crítica deve ter privilégio `EXECUTE` concedido a `anon`.
   - *Verify:* `SELECT routine_name FROM information_schema.routine_privileges WHERE grantee = 'anon' AND routine_schema = 'public';` retorna 0 rotinas de mutação financeira.
