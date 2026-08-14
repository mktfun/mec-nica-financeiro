# Spec Plan: Backend Daily Reconciliation Summary & Math Delegation (196)

## Tasks

- [x] [BACKEND/DATABASE] Criar migration `20260814010000_get_daily_reconciliation_summary.sql` contendo a função PostgreSQL `public.get_daily_reconciliation_summary(p_date date) RETURNS jsonb`.
- [x] [BACKEND/DATABASE] Aplicar a migration no Supabase via `npx supabase db query --linked --file ...`.
- [x] [FRONTEND] Criar hook `useDailyReconciliationSummary` em `src/hooks/useBackendConciliacao.ts` tipado com `DailyReconciliationSummary`.
- [x] [FRONTEND] Atualizar `src/routes/conciliacao.index.tsx` para integrar o novo hook consolidado, eliminando os múltiplos `.reduce()` e queries pesadas no client.
- [x] [FRONTEND] Ajustar `src/components/conciliacao/ResumoDiaPanel.tsx` para exibir os valores consolidados diretamente do backend sem distorções de cálculo.
- [x] [QUALITY/GATE] Executar `npm run build` para garantir TypeScript limpo e bundling 100% aprovado.
- [x] [TEST] Verificar na UI que o Faturamento Líquido, Saldo das Contas, Caixa Atual e Diferença Final carregam em < 50ms com cálculo exato.
