# Spec Plan: Eliminação Definitiva de Sobrecargas de RPC (PGRST203) e Restauração do Painel (293)

## Tasks

### Fase 1 — Criação e Aplicação da Migration de Desambiguação
- [x] [BACKEND] Criar migration `20260826000003_drop_all_conflicting_rpc_overloads.sql` com DROPs explícitos e recriação das 5 funções canônicas
- [x] [BACKEND] Executar migration no Supabase via API Management

### Fase 2 — Alinhamento de Chamadas no Frontend
- [x] [FRONTEND] Validar parâmetros em `src/hooks/useBackendConciliacao.ts` (`p_date` e `p_target_date`)
- [x] [FRONTEND] Validar parâmetros em `src/components/conciliacao/SaldoBancosDetailModal.tsx`

### Fase 3 — Validação e Quality Gate
- [x] [TEST] Executar auditoria de catálogo no Postgres (`pg_proc`) para confirmar 0 sobrecargas duplicadas (0 duplicadas)
- [x] [TEST] Executar chamadas reais via PostgREST para `get_daily_reconciliation_summary`, `get_store_pos_triple_reconciliation`, `get_receivables_summary` e `get_store_financial_stats` confirmando status 200 e dados populados (12/12 testes aprovados)
- [x] [TEST] Executar `npm run build` para garantir integridade do build (Build 100% verde)
