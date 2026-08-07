# Spec Plan: O Raio-X da ImportaçÁo (094)

## Tasks

- [x] [BACKEND] Editar `src/hooks/useTransactions.ts`
  - Localizar a funçÁo `useBulkInsertTransactions`
  - Remover todo o bloco de `delete()` do OFX (linhas ~374 a ~394) que varre e deleta os extratos prévios, confiando inteiramente no `upsert(ofxTxs, { onConflict: 'store_id, fitid', ignoreDuplicates: true })`.
  - No bloco das "Outras transações" (`otherTxs`), substituir a cláusula `.is('fitid', null)` pela blindagem segura: `.in('source', ['rede', 'maquininha'])`. Isso garante que lançamentos de despesas ou manuais nÁo sejam afetados pela importaçÁo.
- [x] [BACKEND] Editar `src/components/importacoes/CentralImportWizard.tsx`
  - Certificar-se de que ao gerar o `txId` das transações do OFX, se houver conflito, o Supabase nÁo quebre a constraint de FK, o que já está coberto pela mudança no hook acima (pois ele vai ignorar as duplicatas via `ignoreDuplicates`).
