# Spec Plan: Corrigir ViolaçÁo de FK na ReimportaçÁo de OFX (bugfix-ofx-import-fk)

## Tasks

- [x] [BACKEND/HOOK] No arquivo `src/hooks/useTransactions.ts`, modificar a function `useBulkInsertTransactions`.
- [x] [BACKEND/HOOK] Localizar o bloco de dedicaçÁo no `ofxTxsRaw.forEach` (por volta da linha 359).
- [x] [BACKEND/HOOK] Destruturar o objeto `t` extraindo a propriedade `id`: `const { id, ...rest } = t;`.
- [x] [BACKEND/HOOK] Inserir `rest` no `ofxMap` ao invés do objeto `t` completo: `ofxMap.set(key, rest);`.
- [x] [TEST] Re-fazer a importaçÁo de um OFX duas vezes seguidas para garantir que a 2ª importaçÁo passa sem violar a constraint `conciliation_matches_ofx_transaction_id_fkey`.
