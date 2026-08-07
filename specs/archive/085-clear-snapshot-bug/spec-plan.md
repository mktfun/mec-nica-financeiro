# Spec Plan: Fix Clear Data Missing Snapshots (085)

## Tasks

- [x] [BACKEND] Em `src/hooks/useImportProcessor.ts` (`useClearAllData`): Adicionar `'daily_snapshots'` ao array `tables` para garantir que o clear limpe as inserções manuais e globais como Juros da Rede.
- [x] [TEST] Re-renderizar ou invalidar explicitamente `daily_snapshots` no `qc.invalidateQueries` dentro do hook `useClearAllData` se nÁo estiver limpando o cache, para que a tela nÁo exiba dados em memória que acabaram de ser apagados.
