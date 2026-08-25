# Spec Plan: 282 — Blindagem Definitiva de Idempotência, Consistência Temporal do Cofre e Conciliação Canônica Multi-Loja

## Tasks

- [ ] [DATABASE] Criar migration `supabase/migrations/20260825000001_fix_reconciliation_idempotency_and_vault_temporal.sql` com limpeza de duplicatas legadas em `store_cash_vault`, `patio_os` e `pos_transactions`.
- [ ] [DATABASE] Adicionar coluna `os_number_ref TEXT` em `store_cash_vault` com script de preenchimento retroativo, backfill de `deposited_at` para registros legados e índice único `uq_store_cash_vault_store_os`.
- [ ] [DATABASE] Criar índice único `uq_patio_os_store_os_number` em `patio_os` garantindo idempotência física por filial.
- [ ] [DATABASE] Adicionar coluna `dedup_hash TEXT` em `pos_transactions` e índice único `uq_pos_transactions_store_hash`.
- [ ] [BACKEND] Atualizar a RPC `get_daily_reconciliation_summary` para implementar a agregação temporal correta do cofre (`WHERE entry_date <= v_target_date AND (status IN ('em_transito', 'pending') OR (status = 'depositado' AND (deposited_at IS NOT NULL AND deposited_at::date > v_target_date)))`).
- [ ] [FRONTEND] Atualizar `src/lib/parsers/redeParser.ts` para extrair `nsu`, `authorization`, `tid` e `time` nas transações da Rede.
- [ ] [FRONTEND] Atualizar `src/hooks/useImportProcessor.ts` para utilizar a coluna `os_number_ref` com verificação atômica e upsert defensivo de `patio_os` (merge com `GREATEST(paid_value)`) sem sobrescrever quitações.
- [ ] [FRONTEND] Atualizar `src/components/importacoes/CentralImportWizard.tsx` para gerar `dedup_hash` determinístico baseado no `nsu`/`auto` real da Rede.
- [ ] [FRONTEND] Validar `src/components/conciliacao/SaldoBancosDetailModal.tsx` para assegurar envio de `deposited_at` no update e invalidação precisa de queries do React Query.
- [ ] [TEST] Executar migration no banco de dados e verificar aplicação sem erros de constraint.
- [ ] [TEST] Executar script forense de validação multi-data confirmando estabilidade dos 5 pilares em datas históricas e atuais.
- [ ] [TEST] Executar build do frontend (`bun run build`) para assegurar integridade de tipos e compilação limpa.
