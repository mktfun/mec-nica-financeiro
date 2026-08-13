# Spec Plan: fix-ofx-precision-jabaquara-kennedy-and-ui-labels (192)

## Tasks

- [x] [BACKEND/PARSER] Em `src/lib/parsers/ofxParser.ts`, substituir a lógica de parseamento do saldo na tag `<LEDGERBAL>` pelas instruções exatas de conversão nativa (usando `replace`, `parseFloat` e divisão matemática segura de `cents`).
- [x] [FRONTEND] Em `src/routes/conciliacao.index.tsx` (ou componente equivalente listado no grep), alterar o texto "Faturam. Banco" para "Saldo Banco Itaú" na listagem/fechamento por lojas.
- [x] [TEST] Verificar visualmente e sintaticamente se `parseFloat` atua de forma robusta e não infla a dízima em uma simulação NodeJS.
