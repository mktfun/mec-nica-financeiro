# Spec Plan: Saneamento da Tela de Conciliação e Unificação SSOT (402)

## Tasks

- [x] [CLEANUP] Remover arquivos e rotas zumbis (`conciliacao-detalhes.tsx`, `BankReconciliationDashboard.tsx`, `BankReconciliationDashboard.tsx.new`, `Modulo1SaldoPanel.tsx`, `RedeVsOfxTable.tsx`, `RedeVsExtratoTable.tsx`, `OsVsRedeTable.tsx`, `PixVsOfxTable.tsx`, `OfxSemMatchTable.tsx`, `BreakdownModal.tsx`, `FaturamentoAtualBreakdownModal.tsx`)
- [x] [BACKEND/HOOK] Purificar `useDailyReconciliationSummary` em `src/hooks/useBackendConciliacao.ts` para retornar diretamente a RPC `get_daily_reconciliation_summary` sem cálculos redundantes no client-side
- [x] [FRONTEND] Adaptar `src/routes/conciliacao.index.tsx` para eliminar `storesState` legado e conectar diretamente `summary.stores`
- [x] [FRONTEND] Refatorar `src/components/conciliacao/ResumoDiaPanel.tsx` para usar os valores canônicos da RPC quando fora do modo de edição e sanear a guarda de integridade
- [x] [FRONTEND] Limpar `src/components/conciliacao/ConciliacaoLojasView.tsx` e `StoreCardModulo1.tsx` removendo cascatas de fallbacks desnecessárias
- [x] [FRONTEND] Refatorar `src/components/conciliacao/StoreCartaoMaquininhaView.tsx` conectando diretamente a `pos_transactions` com status de compensação real
- [x] [FRONTEND] Refatorar `src/components/conciliacao/StoreExtratoBancarioView.tsx` conectando diretamente a `ofx_transactions` para leitura e mutação unificada
- [x] [TEST] Executar build de produção (`bun run build` ou `npx vite build`) para garantir zero erros de TypeScript e zero imports quebrados
- [x] [TEST] Validar Cenário 1 (Fechamento diário macro em `/conciliacao`) e Cenário 2 (Drilldown por filial em `/conciliacao/$lojaId`)
