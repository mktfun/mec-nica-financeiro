# Spec Plan: Correção do Faturamento com Despesas Indevidas, Idempotência do Cofre e Desduplicação do Dinheiro Manual (405)

## Tasks

- [x] [FRONTEND] Ajustar hook `useJustifiedTransactions.ts` para adotar modelo estritamente opt-in de impacto no faturamento, garantindo que débitos, despesas e salários tenham impacto zero e apenas créditos com tag expressa de Receita Extra somem ao Faturamento <!-- id: 1 -->
- [x] [FRONTEND] Ajustar `ResumoDiaPanel.tsx` para desduplicar dinheiro físico, impedindo que `store_cash_vault` seja somado cumulativamente no Card 1 quando o operador já informou o `dinheiro_mp` manual no Card 2 <!-- id: 2 -->
- [x] [FRONTEND] Ajustar `BaixaDinheiroModal.tsx` eliminando a atualização manual concorrente em `reconciliations.bank_total`, garantindo que a baixa apenas liquide as pendências do cofre sem inflar artificialmente o saldo bancário <!-- id: 3 -->
- [x] [FRONTEND] Ajustar `useImportProcessor.ts` para garantir idempotência em `store_cash_vault`, impedindo que reimportações revertam registros de status `depositado` para `em_transito` <!-- id: 4 -->
- [x] [FRONTEND] Ajustar `useBackendConciliacao.ts` incluindo `is_closed` na query de `daily_snapshots`, blindando dias fechados e o Marco Zero contra recálculos dinâmicos <!-- id: 5 -->
- [x] [TEST] Executar Cenário 1: validar que em 16/09/2026 o Faturamento do Dia expurga os R$ 24.966,67 de salários e exibe o Odômetro base oficial de R$ 46.931,21 <!-- id: 6 -->
- [x] [TEST] Executar Cenário 2: validar que o dinheiro manual não duplica com o cofre e que dar baixa retira os itens do trânsito com coerência <!-- id: 7 -->
- [x] [TEST] Executar Cenário 3: validar que reimportação de OSs não recria registros já depositados <!-- id: 8 -->
- [x] [TEST] Executar Cenário 4: validar imunidade de regressão no Marco Zero (15/09/2026) <!-- id: 9 -->
