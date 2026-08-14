# Plano de Execução: Spec 204

## Tasks

- [x] [BACKEND/MIGRATION] Criar migration `supabase/migrations/20260814143000_audit_and_harden_dashboard_rpc.sql` contendo a versão revisada de `get_dashboard_metrics` (com CTEs isoladas, delta de odômetro, soma limpa de `bank_total` e `patio_os`) e os índices de alta performance.
- [x] [BACKEND/APPLY] Aplicar a migration no banco de dados via Supabase CLI / script headless.
- [x] [FRONTEND/AUDIT] Auditar `src/hooks/useBackendDashboard.ts` e `src/hooks/useConciliacao.ts` para garantir consumo direto sem redundâncias.
- [x] [QUALITY/GATE] Executar `cmd.exe /c "npm run build"` garantindo compilação TypeScript limpa e bundling 100% verde.
- [x] [TEST] Validar o retorno da RPC `get_dashboard_metrics` para data específica e verificar o carregamento do Dashboard.
