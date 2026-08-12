# Spec Plan: Resilient Mixed Cell OS Parser (171)

## Tasks

- [x] [FRONTEND] Importar `extractNumber` de `src/lib/parsers/numberUtils.ts` dentro de `src/hooks/useOsImportProcessor.ts`.
- [x] [FRONTEND] Substituir o método interno `parseValue` de `useOsImportProcessor.ts` para repassar o valor recebido para a função global `extractNumber`.
- [x] [FRONTEND] Localizar a extração da variável `payment_method_str` (linha 153 do parser).
- [x] [FRONTEND] Alterar a variável para concatenar o conteúdo textual bruto de `row[colMap.paidValue]` e `row[colMap.paymentMethod]` para maximizar o hit rate do regex de métodos de pagamento.
- [x] [TEST] Rodar o build frontend (`npm run build`) para garantir que as importações e tipos estão corretos (evitando ReferenceErrors).
- [x] [TEST] Verificar fluxo visual simulando planilhas sujas com células mistas e comprovar que o Faturamento de Banco volta a ser contabilizado.
