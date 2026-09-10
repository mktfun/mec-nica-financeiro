# Spec Plan: Spec 392 - Correção da Coluna 'title' em OFX, Sincronização de Justificativas e Reatividade do Contas a Pagar

## Checklist de Tarefas

### Fase 1: Correção do Hook `useHistoricalReconciledTransactions`
- [x] 1.1 Em `src/hooks/useTransactions.ts`, substituir a seleção de `title` por `counterpart_name, bank_name` na query da tabela `ofx_transactions`.
- [x] 1.2 Mapear os itens retornados criando `title: t.counterpart_name || t.bank_name || ''` para compatibilidade com o histórico em memória.

### Fase 2: Sincronização e Invalidação de Cache em `useCategorizeOrphan`
- [x] 2.1 Em `src/hooks/useCategorizeOrphan.ts`, sincronizar a tabela `transactions` com `manual_category` e `manual_justification` após a execução bem-sucedida de `resolve_orphan_saida_ofx`.
- [x] 2.2 Unificar as queryKeys de invalidação do React Query adicionando `['daily_manual_bills']` e `['daily_reconciliation_summary']` simultaneamente às variantes com hífen.

### Fase 3: Detecção Bidirecional e Exibição de Badges em `StoreExtratoBancarioView`
- [x] 3.1 Em `src/components/conciliacao/StoreExtratoBancarioView.tsx`, enriquecer a busca de `linkedBill` para checar tanto `tx.matched_bill_id` quanto `b.matched_ofx_id === tx.id`.
- [x] 3.2 Blindar a regra de `isPending` para que transações com conta vinculada ou categoria manual atribuída nunca sejam consideradas pendentes.
- [x] 3.3 Adicionar badge visual explícito para transações justificadas/vinculadas na linha 1 do extrato bancário.
- [x] 3.4 Em `handleCategorizationSuccess`, adicionar invalidação de `['daily_manual_bills']` e `['transactions']`.

### Fase 4: Verificação e Validação Local
- [x] 4.1 Rodar build local (`npm run build`) para garantir tipagem TypeScript 100% íntegra.
- [x] 4.2 Validar ausência de erro 400 no endpoint de `ofx_transactions`.
- [x] 4.3 Confirmar na interface que a transação de R$ 100.000,00 da Jorge Beretta não está mais pendente e exibe a conta vinculada.
