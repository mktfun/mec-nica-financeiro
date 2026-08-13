# Spec Plan: fix-global-reconciliation-sum-and-keep-manual-inputs (193)

## Tasks

- [x] [BACKEND/DATABASE] Criar migration `20260813160000_fix_global_reconciliation_sum_and_reset.sql`.
- [x] [BACKEND/DATABASE] Dentro da migration, sobrescrever `get_dashboard_metrics(p_date date)`:
  - Alterar a agregação em `store_totals` para puxar `r.faturamento_loja` (ou `r.bank_total` via `recon`) como o valor real do `faturamento_banco`.
  - Garantir que `COALESCE(SUM(recon_faturamento_banco), 0)` dite o valor de `v_total_saldo` (que mapeia para "Saldo Banco Itaú").
- [x] [BACKEND/DATABASE] Dentro da migration, no bloco anônimo final (`DO $$`), executar as exclusões (ou correções numéricas estritas) dos snapshots contaminados:
  - `DELETE FROM dashboard_daily_logs WHERE date = '2026-08-11';`
  - `DELETE FROM conciliation_daily_logs WHERE date = '2026-08-11';`
  - `DELETE FROM reconciliations WHERE date = '2026-08-11';`
- [x] [TEST] Reimportar ou atualizar visualmente a aplicação. A query recalculará o dia vazio/excluído usando as instâncias corrigidas no parser de banco ao fazer novos uploads.
