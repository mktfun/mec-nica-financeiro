# Spec Plan: ofx-expenses

## Tasks

- [x] [FRONTEND] Em `src/components/importacoes/CentralImportWizard.tsx`, iterar o `ofx.transactions` gerando um ID determinístico (`hash_${tx.date}_${tx.amount}_${tx.title.replace(/\s+/g, '')}`) apenas quando o banco omitir o `<FITID>`.
- [x] [FRONTEND] Ajustar o mapeamento de `matched_store_id` no `CentralImportWizard` para garantir que transações do tipo `out` preservem o `globalStoreId` detectado via conta bancária, para que as despesas pertençam à loja ao invés de ficarem nulas.
- [x] [FRONTEND] Atualizar `src/hooks/useTransactions.ts` para que `ofxTxsRaw` considere a flag `t.source === 'ofx'` ou confie no ID gerado, impedindo que qualquer despesa (com ID original ou o hash determinístico) seja acidentalmente empurrada para `otherTxs` e descartada.
- [x] [TEST] Reimportar um arquivo de exemplo com despesas (simulado ou real) e verificar via interface da conciliação se o campo OFX carrega as despesas devidamente calculadas por loja.
