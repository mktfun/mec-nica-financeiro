# Spec Plan: 211-sync-dashboard-with-conciliation-and-custom-orphan-categories

## Tasks

- [x] [SQL/RPC] Criar migration `supabase/migrations/20260815181500_harden_dashboard_rpc_v2.sql` com a RPC `get_dashboard_metrics` calculando 100% dos dados (saldos, faturamentos com delta diário, contas bancárias por loja, pátio e diferença real) no PostgreSQL.
- [x] [UI] Em `src/components/conciliacao/OrphanCategorizationModal.tsx`, adicionar input para digitação manual livre de qualquer categoria.
- [x] [HOOK] Em `src/hooks/useBackendDashboard.ts`, consumir exclusivamente a RPC `get_dashboard_metrics` sem nenhum cálculo desnecessário no frontend.
- [x] [TEST] Executar `cmd.exe /c "npm run build"` para validação técnica com 0 erros.
