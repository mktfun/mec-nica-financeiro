# Spec Plan: Correção de Exclusão de Lote e Botão "Limpar Todos os Dados" (delete-and-clean-all)

## Tasks

- [x] [FRONTEND] Atualizar `src/hooks/useImportProcessor.ts`:
  - [x] Refatorar `useDeleteImport` para adicionar fallback direto em JS caso a RPC falhe ou deixe restos.
  - [x] Criar o hook `useClearAllData` para apagar todas as 9 tabelas do Supabase e chamar `qc.clear()`.
- [x] [FRONTEND] Atualizar `src/routes/importacoes.tsx`:
  - [x] Adicionar botão "Limpar Todos os Dados" (vermelho/perigo) no cabeçalho.
  - [x] Criar modal de confirmação para a limpeza global.
  - [x] Conectar o botão de exclusão de cada lote com feedback visual de carregamento.
- [x] [TEST] Testar o build da aplicação (`npm run build`).
