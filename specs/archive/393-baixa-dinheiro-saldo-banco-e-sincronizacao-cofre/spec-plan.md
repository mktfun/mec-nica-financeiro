# Spec Plan: Spec 393 — Sincronização de Baixa de Dinheiro no Saldo Bancário e Correção Canônica do Dinheiro no Cofre

## Checklist de Tarefas

### Fase 1: Backend & Database (Supabase)
- [x] 1.1 Criar migration `supabase/migrations/20260910000046_fix_cash_vault_deposit_and_summary_alignment.sql` atualizando a RPC `dar_baixa_dinheiro` para somar o valor baixado em `reconciliations.bank_total` e sincronizar `daily_snapshots`.
- [x] 1.2 Na mesma migration, atualizar a RPC `get_daily_reconciliation_summary` para apurar `vault_agg` e `v_dinheiro_lojas` com base no saldo acumulado em trânsito (`entry_date <= v_target_date` e status ativo `em_transito` / `pending`).
- [x] 1.3 Executar backfill corretivo para 10/09/2026 somando os depósitos baixados ao saldo bancário de Santo André (+R$ 3.000,00) e Jorge Beretta (+R$ 220,00).

### Fase 2: Frontend & UI Harmony
- [x] 2.1 Em `src/components/conciliacao/ResumoDiaPanel.tsx`, equalizar a exibição do Hero Card `SALDO BANCOS + DINHEIRO` com o Líquido Holding Consolidado do Raio-X (`totals.total`).
- [x] 2.2 Em `src/components/conciliacao/ResumoDiaPanel.tsx`, garantir que o sub-chip "Dinheiro no Cofre" exiba fielmente o montante acumulado em trânsito (R$ 880,00).
- [x] 2.3 Em `src/components/conciliacao/SaldoBancosDetailModal.tsx` e `BaixaDinheiroModal.tsx`, assegurar a invalidação mútua das queryKeys do React Query após a baixa.

### Fase 3: Validação & Quality Gate
- [x] 3.1 Executar teste automatizado via script Node para validar que a RPC retorna o saldo de Santo André com R$ 6.324,97, Jorge Beretta com R$ 55.620,75 e Dinheiro no Cofre com R$ 880,00.
- [x] 3.2 Rodar `npm run build` para garantir zero erros de tipagem e integridade da build.
