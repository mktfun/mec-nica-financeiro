# Proposal 463 — Remediação de Segurança AppSec & RLS Hardening (Lovable Security Findings)

## 1. Problema

Ao tentar publicar a aplicação na plataforma Lovable, o scanner automático de segurança e integridade de banco de dados (integrado com o Supabase Security Advisor / Database Linter) bloqueou/alertou o deploy com **5 security findings**:

1. **🔴 Exposed personal & sensitive data (1 Critical — 38 tabelas afetadas):**
   - *Finding Lovable:* "Some access rules let everyone through. 38 affected tables · These rules don't restrict which data people can see, change or add, so anyone they apply to can reach all of it."
   - *Evidência pericial:* 30 tabelas possuem políticas RLS com `roles: {anon, authenticated}` ou `{public}` com `qual = 'true'` ou `with_check = 'true'` (ex: `accounts_payable_imports`, `daily_snapshots`, `ofx_transactions`, `patio_os`, `pos_transactions`, `reconciliations`, `store_cash_vault`, `ofx_balance_candidates`, etc.), e mais 8 tabelas possuem `qual = 'true'` sem restrição de role/usuário. Qualquer agente externo com a anon key pública consegue ler ou injetar dados diretamente no PostgREST REST API.

2. **🟠 Storage Policy Excessiva (1 Warning — bucket `knowledge_graph`):**
   - *Finding Lovable:* "A rule lets any signed-in user download files in knowledge_graph. On its own, this file storage rule lets any signed-in user download the files it covers in knowledge_graph regardless of who uploaded them."
   - *Evidência pericial:* Política `Leitura bucket knowledge_graph` em `storage.objects` com `qual = "((bucket_id = 'knowledge_graph') AND (auth.role() = 'authenticated'))"` permite que qualquer usuário cadastrado faça download do `graph.json` estrutural do sistema.

3. **🟠 Access Control & Authorization (1 Warning — 12 tabelas afetadas):**
   - *Finding Lovable:* "Some access rules only check that someone is signed in. 12 affected tables · Every signed-in user gets the same access to everything these rules cover, whether or not it's theirs."
   - *Evidência pericial:* Tabelas como `alerts`, `goals`, `claritas_policies`, `conciliation_daily_logs`, `estoque_os_pendente`, `manual_transactions`, `receivables` possuem regras que checam apenas `auth.uid() IS NOT NULL` ou `auth.role() = 'authenticated'`, sem verificar vínculo com a tabela de controle de acesso `public.profiles` (`EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid())`).

4. **🟠 Infrastructure & Configuration (1 Warning — 22+ funções e views afetadas):**
   - *Finding Lovable:* "Some database functions could run someone else's code. 22 affected functions · Someone who can add their own tables or functions to your database could make these functions run their code with the function owner's permissions."
   - *Evidência pericial:* A consulta pericial ao catálogo do Postgres (`pg_proc`) confirmou **29 funções** no schema `public` com `proconfig IS NULL` (sem `SET search_path = public`). Além disso, o Supabase Advisor reportou a view `public.transactions` como `SECURITY DEFINER` (falta `security_invoker = true`) e 56 funções `SECURITY DEFINER` executáveis pela role `anon` (`anon_security_definer_function_executable`).

5. **ℹ️ Authentication & Account Security (1 Info — Leaked Password Protection):**
   - *Finding Lovable:* "People can choose a password that is already leaked. Your app does not check new or changed passwords against known leaks, so people can pick passwords that attackers already have on their lists."
   - *Evidência pericial:* Flag de HaveIBeenPwned do Supabase Auth desabilitada na instância do projeto (`cnwzsvowkfymtdiryhqc`).

---

## 2. Solução Proposta

Aplicar uma intervenção determinística de segurança em camadas via migração SQL idempotente e configuração de banco:

1. **Remoção de Políticas Anônimas (`anon` / `public`) nas Tabelas Financeiras:**
   - Expurgo de todas as políticas antigas `Allow anon read...`, `Allow anon modify...`, `Allow all on...` que concediam `qual: 'true'` para `anon` ou `public`.
   - Substituição por políticas estritas `TO authenticated` que validam compulsoriamente a existência de perfil ativo na tabela `public.profiles`:
     ```sql
     USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))
     WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.can_edit_data = true OR profiles.role = 'admin')))
     ```
   - Nenhuma tabela do ERP financeiro ficará acessível sem JWT assinado de usuário ativo.

2. **Hardening do Bucket `knowledge_graph`:**
   - Atualizar a política em `storage.objects` para restringir leitura/download do bucket `knowledge_graph` a usuários autenticados com perfil ativo registrado em `public.profiles`:
     ```sql
     CREATE POLICY "Leitura restrita bucket knowledge_graph"
     ON storage.objects FOR SELECT TO authenticated
     USING (
       bucket_id = 'knowledge_graph' AND
       EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid())
     );
     ```

3. **Blindagem de Permissões nas 12 Tabelas de Acesso Autenticado:**
   - Unificar a verificação de autorização contra `public.profiles`: usuários autenticados só operam tabelas caso possuam registro válido no sistema.

4. **Blindagem de `search_path` e Execução em Funções e Views:**
   - Aplicar `ALTER FUNCTION public.<nome>(<args>) SET search_path = public;` em todas as 29 funções do schema `public`.
   - Aplicar `REVOKE EXECUTE ON FUNCTION public.<nome>(<args>) FROM anon;` nas funções críticas/administrativas, mantendo `GRANT EXECUTE TO authenticated`.
   - Executar `ALTER VIEW public.transactions SET (security_invoker = true);` para garantir que a view avalie o RLS do usuário chamador.

5. **Configuração de Leaked Password Protection:**
   - Documentar e orientar ativação no Supabase Auth Dashboard (ou via API de gerenciamento).

---

## 3. Skills Especializadas Aplicadas

- `security` (AppSec, OWASP A01:2021 Broken Access Control, OWASP A05:2021 Security Misconfiguration).
- `database` (PostgreSQL DDL defensivo, idempotência de migrações, `SET search_path = public`, `security_invoker` em views, RLS com `pg_policies`).
- `auth` (Supabase JWT, `auth.uid()`, RBAC baseado em `public.profiles`).

---

## 4. Contratos de Dados & DDL

### Migração: `supabase/migrations/20261001000001_remediar_brechas_seguranca_lovable.sql`

A migração atuará nos seguintes blocos:

1. **Bloco 1: View `public.transactions`**
   - `ALTER VIEW public.transactions SET (security_invoker = true);`

2. **Bloco 2: Funções com `search_path` mutável**
   - `ALTER FUNCTION` para as 29 funções identificadas (`admin_create_user`, `admin_update_user_permissions`, `apply_ofx_balance_selection`, `auto_match_receivables`, `categorize_orphan_transaction`, `clear_all_financial_data`, `delete_import_batch`, `get_conciliation_breakdown`, `get_daily_reconciliation_summary`, `get_ofx_account_history`, `get_ofx_balance_rules`, `get_patio_summary`, `get_receivables_summary`, `get_store_financial_stats`, `get_system_users`, `handle_new_user`, `liquidate_legacy_os`, `log_daily_snapshot_audit`, `log_import_batch_audit`, `match_bank_transactions`, `preview_ofx_balance_selection`, `process_marco_zero_import`, `purge_expired_bot_files`, `test_ramal_1`, `trg_transactions_instead_of_update`, `update_reconciliacoes_triplas_updated_at`, `update_reconciliation_bank_total`, `update_updated_at_column`, `check_client_name_match`) definindo `SET search_path = public`.

3. **Bloco 3: Revogação de `EXECUTE` da role `anon` em RPCs `SECURITY DEFINER`**
   - `REVOKE EXECUTE ON FUNCTION ... FROM anon;` nas RPCs de mutação, exclusão e visualização de relatórios.

4. **Bloco 4: Saneamento das Políticas RLS das Tabelas Financeiras**
   - Drop de todas as políticas permissivas para `anon` e `public`.
   - Criação de políticas padronizadas `TO authenticated` com cláusulas `USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))`.
   - Para mutações (INSERT, UPDATE, DELETE): exigência de `profiles.can_edit_data = true OR profiles.role = 'admin'`.

5. **Bloco 5: Bucket `knowledge_graph`**
   - Drop da policy antiga e criação de policy vinculada a perfil autenticado ativo.

---

## 5. Arquivos Afetados

### Arquivos Novos
- `supabase/migrations/20261001000001_remediar_brechas_seguranca_lovable.sql` [NEW]

### Arquivos Existentes Modificados / Reutilizados
- `specs/global/features.md` [MODIFY] — registro da Feature 463
- `.agent/memory/supabase.md` [MODIFY] — atualização do catálogo de segurança e advisors
- `.agent/memory/auth.md` [MODIFY] — registro da política de acesso restrito a `authenticated` + `profiles`

---

## 6. Evidência e Decisão

| Caminho / Símbolo | Ação | Motivo | Verificação |
|---|---|---|---|
| `pg_policies` (38 tabelas com `anon`/`public`) | EDITAR (via migration) | Eliminar vulnerabilidade crítica de bypass de autenticação e acesso total anônimo ao banco financeiro | `SELECT count(*) FROM pg_policies WHERE 'anon' = ANY(roles) AND (qual = 'true' OR with_check = 'true')` retorna 0 |
| `storage.objects` (bucket `knowledge_graph`) | EDITAR (via migration) | Impedir download arbitrário por tokens não autorizados | `pg_policies` no schema `storage` valida perfil ativo |
| `pg_proc` (29 funções sem `search_path`) | EDITAR (via migration) | Prevenir sequestro de execução de código (`function_search_path_mutable`) | `supabase:get_advisors` reduz contagem de mutable search_path para 0 |
| `public.transactions` (view) | EDITAR (via migration) | Corrigir `security_definer_view` ativando `security_invoker = true` | Supabase Advisor zera o erro `0010_security_definer_view` |
| `src/` (frontend) | REUTILIZAR | Frontend já opera autenticado via `AppShell.tsx` com `session` persistente; nenhuma chamada anônima é realizada pelo app | `npm run build` passa com exit code 0; app navega normalmente |

---

## 7. Plano de Rollback

Se qualquer política RLS causar erro de permissão para operadores autenticados em produção:
1. Reverter a migração aplicando script de restauração ou reabrindo permissões específicas para a role afetada via `supabase:execute_sql`.
2. O histórico das políticas anteriores está integralmente catalogado no banco e nesta especificação técnica.
3. Zero perda de dados: alterações são puramente de autorização (DDL de políticas e metadados de funções), sem alteração de colunas ou conteúdo das tabelas.

---

## 8. Risco Principal e Mitigação

- **Risco Principal:** Alguma rotina de backend (como Edge Functions ou bots) falhar ao tentar acessar as tabelas caso utilizasse a anon key em vez de `service_role`.
- **Mitigação:** Edge Functions (`ias-hub`, `bot`) utilizam compulsoriamente a `SUPABASE_SERVICE_ROLE_KEY`, que desvia de todas as restrições de RLS no PostgreSQL por desenho do Supabase. Operadores humanos utilizam sessão JWT autenticada vinculada aos seus respectivos registros na tabela `profiles`.
