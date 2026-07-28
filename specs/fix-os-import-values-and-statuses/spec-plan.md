# Spec Plan: Correção dos Valores e Statuses de OSs na Importação e Pátio (fix-os-import-values-and-statuses)

## Tasks

- [ ] [FRONTEND] Atualizar `src/hooks/useOsImportProcessor.ts`:
  - [ ] Calcular a soma das formas de pagamento (`sumPayments = parsed_credit + parsed_debit + parsed_pix_transfer`)
  - [ ] Garantir que `totalValue = Math.max(rawTotalValue, paidValue + openValue, sumPayments)`
  - [ ] Ajustar cálculo de `paidValue` e `statusEnum` ('finalizado', 'pago_parcial', 'em_aberto')
- [ ] [FRONTEND] Atualizar `src/hooks/useImportProcessor.ts`:
  - [ ] Incluir `status: os.status` no payload gravado na tabela `patio_os` no Supabase
- [ ] [FRONTEND] Atualizar `src/components/conciliacao/OsDetailModal.tsx`:
  - [ ] Corrigir o cálculo da variável `totalValue` no modal para utilizar o valor total real ou a soma dos pagamentos extratados em vez de sobrescrever para zero
- [ ] [FRONTEND] Refatorar `src/routes/patio.tsx`:
  - [ ] Implementar helper de fallbacks de valores e status reais (`getOsEffectiveValues`)
  - [ ] Ajustar as 4 abas de filtro (`Todas`, `Em Aberto`, `Pagas Parcial`, `Finalizadas (Período)`)
  - [ ] Ajustar o card da OS no pátio e o modal interno para exibir Total, Pago e Aberto corretos
- [ ] [TEST] Testar a importação de planilha de OS e verificar se valores e statuses são gravados e exibidos perfeitamente
- [ ] [TEST] Verificar build limpo com `npm run build`
