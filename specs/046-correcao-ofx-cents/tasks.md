# Tasks - Correção OFX

## Backend Engineer
- [x] Atualizar o script `scripts/purge-bug-17m.ts` para deletar TODOS os registros de `reconciliations` do banco cuja `date` seja correspondente a `'2026-06-09'` e `'2026-06-08'` ou cujos saldos excedam absolutos gigantes. O mais simples é `.delete().gte('date', '2026-06-08')` já que as lojas acabaram de lançar isso no ambiente de testes.
- [x] Rodar o script usando `npx tsx scripts/purge-bug-17m.ts`.

## Frontend Engineer
- [x] Modificar o arquivo `src/lib/parsers/ofxParser.ts`.
- [x] Na extração do `<BALAMT>`, logo antes do `parseFloat`, aplicar a heurística de checar se `balStr` possui `.` ou `,`.
- [x] Se não possuir NENHUM dos dois (ex: `1751833`), interpretar como centavos multiplicando ou dividindo adequadamente (ex: `parseInt(balStr) / 100`) para transformá-lo na representação padrão float com 2 casas.
- [x] Se a heurística for aplicada, manter a variável normal para ser re-usada no fluxo existente.
