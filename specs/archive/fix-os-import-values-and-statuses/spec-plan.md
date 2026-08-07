# Spec Plan: CorreçÁo dos Valores e Statuses de OSs na ImportaçÁo e Pátio (fix-os-import-values-and-statuses)

## Tasks

- [x] [FRONTEND] Atualizar `src/hooks/useOsImportProcessor.ts`:
  - [x] Calcular a soma das formas de pagamento (`sumPayments = parsed_credit + parsed_debit + parsed_pix_transfer`)
  - [x] Garantir que `totalValue = Math.max(rawTotalValue, paidValue + openValue, sumPayments)`
  - [x] Ajustar cálculo de `paidValue` e `statusEnum` ('finalizado', 'pago_parcial', 'em_aberto')
- [x] [FRONTEND] Atualizar `src/hooks/useImportProcessor.ts`:
  - [x] Incluir `status: os.status` no payload gravado na tabela `patio_os` no Supabase
- [x] [FRONTEND] Atualizar `src/components/conciliacao/OsDetailModal.tsx`:
  - [x] Corrigir o cálculo da variável `totalValue` no modal para utilizar o valor total real ou a soma dos pagamentos extratados em vez de sobrescrever para zero
- [x] [FRONTEND] Refatorar `src/routes/patio.tsx`:
  - [x] Implementar helper de fallbacks de valores e status reais (`getOsEffectiveValues`)
  - [x] Ajustar as 4 abas de filtro (`Todas`, `Em Aberto`, `Pagas Parcial`, `Finalizadas (Período)`)
  - [x] Ajustar o card da OS no pátio e o modal interno para exibir Total, Pago e Aberto corretos
- [x] [TEST] Testar a importaçÁo de planilha de OS e verificar se valores e statuses sÁo gravados e exibidos perfeitamente
- [x] [TEST] Verificar build limpo com `npm run build`
