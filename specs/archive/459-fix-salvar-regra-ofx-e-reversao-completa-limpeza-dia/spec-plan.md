# Spec Plan — 459: Persistência de Regras OFX e Reversão Completa no Reset Diário

## [DB] Camada de Banco de Dados & RPCs

- [x] **Task 1:** Criar migração `supabase/migrations/20260930000005_fix_ofx_balance_rule_and_daily_purge_reversion.sql` com:
  1. Criação da tabela `patio_os_daily_backups` com constraint única `(target_date, store_id)` e RLS para `authenticated, anon`.
  2. Criação da RPC `save_ofx_balance_rule` (SECURITY DEFINER) para salvar ou revogar regras de saldo OFX atomicamente.
  3. Políticas de RLS em `ofx_balance_rules` e `ofx_balance_selections` permitindo operações para `anon`.
  4. Evolução da RPC `purge_daily_financial_data(p_date)` para restaurar OSs a partir de `patio_os_daily_backups` (com fallback em `os_import_observations`), remover observações/recebíveis/seleções da data e recalcular o pátio via `recompute_patio_for_date_and_store`.
  - Skill: `database`
  - Verificação: `execute_sql` via MCP e concessão de privilégios

## [BACKEND] Hooks & Persistência de Regras

- [x] **Task 2:** Atualizar `useOfxBalanceMappings.ts`:
  1. Substituir a mutação client-side direta em `ofx_balance_rules` pela chamada da RPC `save_ofx_balance_rule`.
  2. Ajustar `BalanceSelectionPayload` e `SaveRulePayload` se necessário.
  - Skill: `backend-patterns`
  - Verificação: `npm run build`

- [x] **Task 3:** Atualizar `useImportProcessor.ts`:
  1. Em `savePatioOsAndReceivables`, antes de atualizar `patio_os`, verificar e persistir o snapshot inicial da filial na data em `patio_os_daily_backups` caso ainda não exista.
  - Skill: `backend-patterns`
  - Verificação: `npm run build`

## [FRONTEND] Invalidação e Feedback no Reset Diário

- [x] **Task 4:** Atualizar `usePurgeDailyData.ts`:
  1. Ampliar a invalidação de queries pós-purge para incluir `['patio_os']`, `['patio-os']`, `['available_store_os']`, `['store-ordens-servico']`, `['os_import_observations']`.
  2. Exibir contagem de OSs restauradas na notificação de sucesso.
  - Skill: `frontend-design-pro`
  - Verificação: `npm run build`

## [TEST] Verificação & Quality Gate

- [x] **Task 5:** Criar teste pericial boundary `tests/e2e/tier2_boundary/spec459_ofx_rule_and_purge_reversion.test.mjs` testando:
  1. Salvamento de regra OFX via RPC e verificação de retorno.
  2. Ingestão de OS com backup e reversão fiel via `purge_daily_financial_data`.
  - Skill: `security`
  - Verificação: `node tests/e2e/tier2_boundary/spec459_ofx_rule_and_purge_reversion.test.mjs`

- [x] **Task 6:** Executar compilação completa `npm run build` garantindo zero erros de TypeScript.
  - Verificação: Exit code 0
