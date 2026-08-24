# Spec Plan: Refinamento Estrito do Modal de Vínculo Manual de PIX com OS (Spec 276)

## Tasks

- [x] [FRONTEND] Atualizar `src/hooks/useManualMatch.ts` na função `useAvailableStoreOs`:
  - Garantir isolamento estrito por `storeId`
  - Consultar `ofx_transactions` para obter OSs já vinculadas na loja e excluí-las da lista
  - Filtrar para incluir apenas OSs que tenham `pix_transfer_value > 0`, forma de pagamento com PIX/Transferência ou saldo em aberto pendente de quitação
  - Excluir OSs totalmente quitadas em Cartão/Dinheiro
- [x] [FRONTEND] Atualizar `src/components/conciliacao/ManualMatchOsModal.tsx`:
  - Corrigir ordenação e match score para usar estritamente o valor de PIX (`pix_transfer_value` ou saldo em aberto)
  - Remover fallback incorreto que usava valores de cartão de crédito
  - Exibir visualmente o valor de PIX registrado na OS e status
- [x] [FRONTEND] Atualizar `src/components/conciliacao/StoreExtratoBancarioView.tsx` para passar `targetDate={date}` ao `<ManualMatchOsModal>`
- [x] [TEST] Executar `npm run build` e validar compilação com zero erros
