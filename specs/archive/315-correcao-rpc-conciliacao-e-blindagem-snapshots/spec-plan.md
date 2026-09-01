# Spec Plan: Correção Crítica da RPC de Conciliação, Cálculo de Faturamento e Blindagem de Snapshots (315)

## Tasks

- [x] [BACKEND] Criar e aplicar migration `20260901000002_fix_daily_reconciliation_stores_and_snapshot_guard.sql` atualizando RPCs `get_daily_reconciliation_summary` e `close_daily_snapshot`
- [x] [BACKEND] Aplicar hotfix de restauração do snapshot de 01/09/2026 e 31/08/2026 no banco
- [x] [FRONTEND] Implementar guarda `isStoreBreakdownCorrupted` e proteção de `reconciliations` em `src/components/conciliacao/ResumoDiaPanel.tsx`
- [x] [FRONTEND] Atualizar mapeamento de lojas e fallbacks em `src/routes/conciliacao.index.tsx`
- [x] [TEST] Executar suíte de teste automatizada validando retorno de 10 lojas em 01/09/2026 e 31/08/2026
- [x] [TEST] Executar build de produção (`npm run build`) e checagem de tipos TypeScript
