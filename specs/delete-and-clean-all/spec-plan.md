# Spec Plan: CorreçÁo de ExclusÁo de Lote e BotÁo "Limpar Todos os Dados" (delete-and-clean-all)

## Tasks

- [x] [FRONTEND] Atualizar `src/hooks/useImportProcessor.ts`:
  - [x] Refatorar `useDeleteImport` para adicionar fallback direto em JS caso a RPC falhe ou deixe restos.
  - [x] Criar o hook `useClearAllData` para apagar todas as 9 tabelas do Supabase e chamar `qc.clear()`.
- [x] [FRONTEND] Atualizar `src/routes/importacoes.tsx`:
  - [x] Adicionar botÁo "Limpar Todos os Dados" (vermelho/perigo) no cabeçalho.
  - [x] Criar modal de confirmaçÁo para a limpeza global.
  - [x] Conectar o botÁo de exclusÁo de cada lote com feedback visual de carregamento.
- [x] [TEST] Testar o build da aplicaçÁo (`npm run build`).
