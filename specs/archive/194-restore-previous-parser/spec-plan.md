# Spec Plan: restore-previous-parser-and-fix-decimals-and-math (194)

## Tasks

- [x] [BACKEND/PARSER] Em `src/lib/parsers/ofxParser.ts`, substituir as chamadas de `extractNumber()` na extração de `<TRNAMT>`, `<OVERDRAFTLIMIT>` e `<CREDITLIMIT>` pelo algoritmo estrito exigido pelo usuário (baseado em `parseFloat` e `Math.round(* 100) / 100`).
- [x] [BACKEND/PARSER] Verificar se a extração de `<BALAMT>` já utiliza o algoritmo correto. Caso não, garantir a aplicação dele ali também.
- [x] [FRONTEND/MATH] Em `src/lib/modulo1Calculations.ts`, ajustar a fórmula final na função de fechamento/diferença para utilizar `Math.abs(valor_disponivel_contas) - subtotal_valor_contas`.
- [x] [BACKEND/DATABASE] Criar e rodar a migration `20260813170000_purge_corrupted_snapshot.sql` para apagar os dados viciados do dia 11/08 (`dashboard_daily_logs`, `conciliation_daily_logs`, `reconciliations`, `ofx_transactions`).
- [x] [TEST] Aguardar o usuário importar novamente.
