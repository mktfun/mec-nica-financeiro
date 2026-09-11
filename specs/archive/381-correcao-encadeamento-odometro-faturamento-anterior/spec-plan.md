# SDD Plan: 381-correcao-encadeamento-odometro-faturamento-anterior

- [x] [DB] Criar migration `supabase/migrations/20260911000040_fix_odometro_faturamento_anterior_chain.sql` atualizando `get_daily_reconciliation_summary` com extração canônica de `odometro_hoje` anterior, atualizando `close_daily_snapshot` para persistir o odômetro acumulado em `faturamento`, e saneando os registros de setembro/2026 em `daily_snapshots`.
- [x] [DB] Aplicar o saneamento no banco Supabase headless via script de execução direta com Service Role Key.
- [x] [FRONTEND] Corrigir a extração do faturamento anterior em `src/components/importacoes/CentralImportWizard.tsx` (linhas 1730 e 1897) eliminando o curto-circuito do operador `||` e priorizando `previousOdometro` e `metadata.odometro_hoje`.
- [x] [FRONTEND] Ajustar a persistência do snapshot no `CentralImportWizard.tsx` (linhas 1755, 1774-1778, 2013-2017) para sempre gravar o odômetro acumulado no campo `faturamento` e garantir consistência do `odometro_hoje` no metadata.
- [x] [FRONTEND] Refinar o mapeamento e a exibição do odômetro no `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx`, assegurando transparência no card de faturamento (Hoje vs Anterior vs Líquido).
- [x] [FRONTEND] Alinhar a precedência de extração de `faturamentoAnteriorGlobal` no `src/components/conciliacao/ResumoDiaPanel.tsx`.
- [x] [QA] Rodar script de auditoria para verificar se o cálculo do delta de faturamento do dia 10/09 e 11/09 bate exatamente com a prova real matemática ($281.317,68 - 235.023,20 = 46.294,48$).
- [x] [BUILD] Executar o Build Gate (`npm run build`) para assegurar conformidade total de TypeScript e ausência de regressões.
