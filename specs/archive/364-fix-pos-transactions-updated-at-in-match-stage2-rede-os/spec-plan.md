# Spec Plan: Correção de `updated_at` em `pos_transactions` e na RPC `match_stage2_rede_os` (364)

## Tasks

- [x] [BACKEND] Criar migration `supabase/migrations/20260903000028_add_updated_at_to_pos_transactions.sql`:
  - [x] Adicionar coluna `updated_at TIMESTAMPTZ DEFAULT now()` em `public.pos_transactions`.
  - [x] Executar backfill para registros existentes com `updated_at` nulo.
  - [x] Criar trigger `trg_pos_transactions_updated_at` com `update_updated_at_column()`.
  - [x] Recompilar a RPC `match_stage2_rede_os`.
  - [x] Atribuir permissões `GRANT EXECUTE` para `authenticated`, `service_role` e `anon`.

- [x] [BACKEND] Aplicar a migration no banco remoto Supabase via CLI headless:
  - [x] Executar `npx supabase db push --linked`.

- [x] [FRONTEND] Atualizar tipagem em `src/integrations/supabase/types.ts`:
  - [x] Adicionar `updated_at` em `Row`, `Insert` e `Update` de `pos_transactions`.

- [x] [TEST] Validação e Quality Gate:
  - [x] Executar typecheck e build (`bun run build`).
