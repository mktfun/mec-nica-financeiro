# Spec Plan: Fix Maquininha Conciliation & Preview (084)

## Tasks

- [x] [FRONTEND] Em `src/components/importacoes/CentralImportWizard.tsx`: Localizar onde `storeRedeNet` é calculado e adicionar ao valor a soma dos `results.maquininhaItems` cuja `storeName` mapeia para a loja corrente, corrigindo a visualização no Preview (etapa 2).
- [x] [BACKEND] Em `src/components/importacoes/CentralImportWizard.tsx` (função `handleConfirm`): Após as promessas de `receivables`, criar transações baseadas em `maqByStore` e inseri-las no `txsToInsert` (como tipo 'in', source 'maquininha', usando `targetDate`). Fazer o mesmo iterando sobre `redeByStore` (tipo 'in', source 'rede').
- [x] [BACKEND] Em `src/hooks/useConciliacao.ts` (`useSystemTransactions`): Substituir a filtragem baseada em `created_at` (startOfDay/endOfDay) por uma filtragem exata de `.eq('target_date', date)`. Remover a lógica de `startOfDay/endOfDay`.
- [x] [BACKEND] Em `src/hooks/useConciliacao.ts` (`useDailyReconciliationDelta`): Substituir a filtragem baseada em `occurred_at` (startOfDay/endOfDay) por `.eq('target_date', targetDate)`. Remover a lógica de `startOfDay/endOfDay`.
- [x] [TEST] Verificar no código se as transações estão indo para `txsToInsert` antes de `saveTransactions` ser chamado.
