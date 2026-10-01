# Spec Plan 463 — Remediação de Segurança AppSec & RLS Hardening (Lovable Security Findings)

## Tasks

### [DB / DDL]
- [x] Task 1: Criar a migração `supabase/migrations/20261001000001_remediar_brechas_seguranca_lovable.sql` com: <!-- id: 1 -->
  - `ALTER VIEW public.transactions SET (security_invoker = true);`
  - `ALTER FUNCTION` com `SET search_path = public` para as 29 funções identificadas
  - `REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;`
  - `GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;`
  - *Skill canônica:* `database`
  - *Critério de verificação:* Arquivo SQL criado e sintaticamente válido.

### [SECURITY / RLS]
- [x] Task 2: Implementar no script de migração a remoção de todas as políticas permissivas para `anon` / `public` nas 38 tabelas afetadas e substituição por políticas restritas `TO authenticated` com validação de `public.profiles`: <!-- id: 2 -->
  - `USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()))`
  - `WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND (profiles.can_edit_data = true OR profiles.role = 'admin')))`
  - Hardening da policy do storage bucket `knowledge_graph` em `storage.objects`
  - *Skill canônica:* `security`
  - *Critério de verificação:* Nenhuma policy aberta para `anon` no script.

### [DB / APPLY]
- [x] Task 3: Aplicar a migração no Supabase conectado via `apply_migration` (MCP Supabase): <!-- id: 3 -->
  - Executar a migração no banco de dados remoto (`cnwzsvowkfymtdiryhqc`).
  - *Skill canônica:* `database`
  - *Critério de verificação:* Migração aplicada com sucesso sem erros de SQL.

### [SECURITY / AUDIT & VERIFICATION]
- [x] Task 4: Validar os advisors de segurança do Supabase e o catálogo de políticas: <!-- id: 4 -->
  - Executar `supabase:get_advisors { type: 'security' }` e confirmar resolução de `security_definer_view`, `function_search_path_mutable` e `anon_security_definer_function_executable`.
  - Executar `SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND 'anon' = ANY(roles) AND qual = 'true';` e comprovar resultado 0.
  - *Skill canônica:* `security`
  - *Critério de verificação:* Security advisors zerados/mitigados.

### [FRONTEND / BUILD GATE]
- [x] Task 5: Executar o Terminal Gate e validar deploy na Lovable: <!-- id: 5 -->
  - Rodar `npm run build` localmente no terminal para assegurar integridade do TypeScript/bundle.
  - Acionar `deploy_project` no MCP Lovable para verificar a publicação.
  - *Skill canônica:* `deploy-production`
  - *Critério de verificação:* `npm run build` com exit code 0 e deploy Lovable pronto.
