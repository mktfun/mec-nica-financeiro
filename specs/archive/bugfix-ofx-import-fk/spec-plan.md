# Spec Plan: Corrigir Violação de FK na Reimportação de OFX (bugfix-ofx-import-fk)

## Tasks

- [x] [BACKEND/HOOK] No arquivo `src/hooks/useTransactions.ts`, modificar a function `useBulkInsertTransactions`.
- [x] [BACKEND/HOOK] Localizar o bloco de dedicação no `ofxTxsRaw.forEach` (por volta da linha 359).
- [x] [BACKEND/HOOK] Destruturar o objeto `t` extraindo a propriedade `id`: `const { id, ...rest } = t;`.
- [x] [BACKEND/HOOK] Inserir `rest` no `ofxMap` ao invés do objeto `t` completo: `ofxMap.set(key, rest);`.
- [x] [TEST] Re-fazer a importação de um OFX duas vezes seguidas para garantir que a 2ª importação passa sem violar a constraint `conciliation_matches_ofx_transaction_id_fkey`.
