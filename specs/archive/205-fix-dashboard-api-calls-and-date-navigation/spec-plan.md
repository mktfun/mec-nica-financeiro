# Plano de Execução: Spec 205

## Tasks

- [x] [BACKEND/MIGRATION] Criar migration `supabase/migrations/20260814150000_fix_calculate_daily_conciliation.sql` com a coluna `title` corrigida e aplicação no Supabase.
- [x] [FRONTEND/HOOKS] Atualizar `src/hooks/useDailySnapshot.ts` (`useAvailableConciliacaoDates`) e `src/hooks/useBackendDashboard.ts` removendo consultas à `import_logs` e usando `daily_snapshots`, `import_batches` e `reconciliations`.
- [x] [FRONTEND/DASHBOARD] Atualizar `src/routes/index.tsx` com o navegador de datas inteligente (setas esquerda/direita transitando pelas datas reais do banco).
- [x] [QUALITY/GATE] Executar `cmd.exe /c "npm run build"` garantindo compilação TypeScript limpa e bundling 100% verde.
- [x] [TEST] Validar execução do dashboard sem erros HTTP 406 / 400.
