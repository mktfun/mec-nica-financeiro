# Spec Plan: Spec 406 — Equalização da Diferença de R$ 11.764,11 em 16/09/2026 e Auditoria da Adquirente Rede "A Compensar"

## Tasks de Implementação

- [x] **Task 1: Blindagem de Ingestão e Status Default em `useTransactions.ts`**
  - Adicionar `settlement_status: t.settlement_status || 'a_compensar'` no mapeamento de inserção de `pos_transactions`.
  - Garantir que nenhuma transação seja gravada com status `NULL`.

- [x] **Task 2: Desacoplamento de OS e Liquidação em `Fase2RedeVsOsReview.tsx`**
  - Remover a atualização indevida de `settlement_status: 'entrou'` no `handleResolveCollision` (linha 267).
  - Preservar a atribuição exclusiva da liquidação bancária ao reconciliador de extrato OFX.

- [x] **Task 3: Prevenção de Falso Positivo "Liquidado" em `StoreCartaoMaquininhaView.tsx`**
  - Ajustar a lógica de exibição de badges na tabela para que, quando `totalCreditadoBanco === 0`, nenhuma transação seja rotulada como `LIQUIDADO NO BANCO`.
  - Exibir `A COMPENSAR` com badge âmbar para todas as transações pendentes de crédito bancário.

- [x] **Task 4: Fallback de Resiliência no `SaldoBancosDetailModal.tsx` e `useBackendConciliacao.ts`**
  - Se a loja possuir vendas na Rede (`s.rede_liquido > 0`) e nenhum crédito bancário no OFX (`s.ofx_maquininhas === 0`), forçar `maquininhaNaoEntrou = s.rede_liquido` e badge `A Compensar`.

- [/] **Task 5: Validação do Build Gate & Verificação em Terminal**
  - Rodar `npm run build` garantindo zero erros de TypeScript.
  - Verificar no navegador `http://localhost:8080/conciliacao` para 16/09/2026.
