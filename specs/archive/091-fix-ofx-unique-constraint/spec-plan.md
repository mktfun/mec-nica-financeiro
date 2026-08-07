# Spec Plan: Corrigir ViolaçÁo de Unique Constraint em OFX (091-fix-ofx-unique-constraint)

## Tasks

- [x] [FRONTEND] Modificar `useBulkInsertTransactions` em `src/hooks/useTransactions.ts`.
  - Onde: Por volta da linha 397 (no bloco `if (ofxTxs.length > 0)`).
  - Como: Alterar `.insert(ofxTxs)` para `.upsert(ofxTxs, { onConflict: 'store_id, fitid', ignoreDuplicates: true })`.
- [x] [TEST] Verificar visualmente o código modificado para garantir sintaxe Typescript correta.
