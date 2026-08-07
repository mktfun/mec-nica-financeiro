# Spec Plan: Stop Maquininha Duplication (081)

## Tasks

- [x] [FRONTEND] Editar `src/components/importacoes/CentralImportWizard.tsx` (linhas ~350-400).
- [x] [FRONTEND] Localizar `// Maquininha (fallback)` e remover o bloco inteiro do `.forEach` que dá `.push` no `txsToInsert`.
- [x] [FRONTEND] Localizar `// Rede (novo)` e remover o `.forEach` (após a montagem do `uniqueRedeTxs`) que dá `.push` no `txsToInsert`.
- [x] [TEST] Código sem órfÁos. FunçÁo `generateSyntheticFitId` removida do CentralImportWizard (nÁo era mais usada). Commit `d5cdd68` pushed com sucesso.
