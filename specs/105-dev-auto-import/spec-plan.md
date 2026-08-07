# Spec Plan: Dev Auto-Import (105-dev-auto-import)

## Tasks

- [x] [FRONTEND] Criar `scripts/generate-mocks.mjs` que varre uma pasta de arquivos de teste (Downloads) e gera um arquivo `src/__mocks__/importFiles.ts` exportando-os em Base64 para bypassar as restrições do navegador localmente.
- [x] [FRONTEND] Modificar `src/hooks/useUnifiedStoreMapping.ts` para salvar `{ alias: slugDaLoja }` no localStorage ao invés de UUIDs da base.
- [x] [FRONTEND] Modificar lógica de carregamento do `useUnifiedStoreMapping.ts` para buscar o UUID da loja em tempo real usando o Slug da loja mapeada contra o banco ativo.
- [x] [FRONTEND] Modificar `src/components/importacoes/CentralImportWizard.tsx` adicionando botão `[Dev] Auto-Load Mocks` no cabeçalho (visível apenas via `import.meta.env.DEV`).
- [x] [FRONTEND] Integrar a função de click do botão Auto-Load Mocks para puxar os arquivos importados de `__mocks__/importFiles.ts` e despachá-los para `processFiles()`.
- [x] [TEST] Verificar cenário 1: Dropar o banco, entrar na tela, clicar em Auto-Load Mocks, e confirmar que os arquivos são carregados e o Mapeamento ocorre automaticamente com 100% de match verde sem intervenção.
