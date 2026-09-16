# Spec Plan: Correção da Incongruência no Modo Edição do Fechamento e Salto Indevido do Caixa (404)

## Tasks

- [x] [BACKEND] Criar e aplicar migration `20260915000050_fix_rpc_summary_card_settlement_and_vault_status.sql` ajustando `get_daily_reconciliation_summary` <!-- id: 1 -->
- [x] [FRONTEND] Ajustar hook `useBackendConciliacao.ts` para mapear com precisão `nao_entrou_valor` e metadados por filial <!-- id: 2 -->
- [x] [FRONTEND] Ajustar `derivedBankTotals` em `ResumoDiaPanel.tsx` para eliminar dupla contagem de cartões da adquirente e dinheiro já depositado <!-- id: 3 -->
- [x] [FRONTEND] Unificar fórmulas de `caixaAtualCalculado`, `faturamentoTotalComAjustes`, `fluxoCaixaCalculado` e `diferencaFinalCalculada` em `ResumoDiaPanel.tsx`, eliminando divergências entre Modo Normal e Modo Edição <!-- id: 4 -->
- [x] [TEST] Executar Cenário 1: alternar entre Modo Normal e Modo Edição em 14/09/2026 e verificar paridade absoluta dos valores <!-- id: 5 -->
- [x] [TEST] Executar Cenário 2: simular digitação nos inputs de edição e validar reatividade contábil sem saltos <!-- id: 6 -->
