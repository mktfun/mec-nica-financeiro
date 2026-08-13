# Spec Plan: Sanitização Global de Ponto Flutuante (188-sanitizacao-ponto-flutuante)

## Tasks

- [x] [FRONTEND] Modificar `src/lib/parsers/numberUtils.ts` para incluir a função `roundCurrency`.
- [x] [FRONTEND] Atualizar `extractNumber` (em `numberUtils.ts`) para retornar `roundCurrency(parsed)`.
- [x] [FRONTEND] Varredura em `src/lib/parsers/redeParser.ts` para garantir que `interest` e qualquer cálculo derivado passe por `roundCurrency`.
- [x] [FRONTEND] Varredura em `src/lib/parsers/ofxParser.ts` substituindo os `parseFloat` crus por chamadas seguras (idealmente `extractNumber` ou `roundCurrency(parseFloat(...))`).
- [x] [FRONTEND] Varredura em `src/lib/parsers/marcoZeroParser.ts` substituindo `parseFloat` cru pelo `extractNumber` sanitizado.
- [x] [TEST] Executar `test_rpc.cjs` ou pequeno script local para verificar conversão IEEE 754 (ex: confirmar se `12.34 - 10.01` bate em `2.33`).
