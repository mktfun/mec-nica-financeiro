# 📝 Spec Plan: Spec 391 — Correção Canônica do Faturamento Input e Re-ancoragem de Saídas/Entradas OFX

## Tasks

- [x] [BACKEND] Criar migration `supabase/migrations/20260910000045_fix_faturamento_input_and_ofx_target_date.sql` removendo a subtração arbitrária `faturamento - anterior` da RPC `get_daily_reconciliation_summary`
- [x] [BACKEND] Adicionar na migration o backfill corretivo para `ofx_transactions` do lote de 10/09 (`target_date = '2026-09-10'`) e acionar `auto_match_daily_transactions('2026-09-10')`
- [x] [BACKEND] Equalizar `daily_snapshots` de 10/09/2026 com o faturamento correto e saneamento da diferença de R$ 207 mil
- [x] [FRONTEND] Ajustar `src/components/importacoes/CentralImportWizard.tsx` para atribuir `target_date: targetDate` nas transações OFX e respeitar o INPUT direto de faturamento
- [x] [FRONTEND] Ajustar `src/components/conciliacao/ResumoDiaPanel.tsx` para manter a integridade da exibição do faturamento e odômetro anterior
- [x] [TEST] Executar script de auditoria para 10/09/2026 e validar que as lojas exibem movimentações de saída e que a divergência de 207 mil foi eliminada
- [x] [TEST] Testar no frontend `ConciliacaoLojasView` e `ResumoDiaPanel` garantindo renderização conforme
