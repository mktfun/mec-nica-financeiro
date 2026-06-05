# Tasks: Conciliação Diária e Cascade Delete

## Cascade Delete (Supabase Backend)
- [ ] Criar arquivo de migração SQL `supabase/migrations/[TIMESTAMP]_create_delete_import_rpc.sql`.
- [ ] Implementar a lógica PL/pgSQL na procedure `delete_import_batch` gerenciando os filtros de exclusão por Data, Loja e Tipo (Despesa vs Receita).
- [ ] Aplicar migração para a nuvem.
- [ ] Alterar o arquivo `src/hooks/useImportProcessor.ts` para que `useDeleteImport` faça uma única chamada `await supabase.rpc('delete_import_batch', {...})`.

## Redesign da Tela de Conciliação
- [ ] Editar `src/routes/conciliacao.tsx` para remover o layout antigo e criar a estrutura do **Painel de Conciliação Diária**.
- [ ] Adicionar um **Seletor de Datas (Date Picker)** ou setas de navegação de dias, amarrando ao estado `targetDate`.
- [ ] Garantir que o painel principal exiba o Resumo do Dia selecionado (Valores Físicos vs Sistemas) com cards modernos e micro-interações.
- [ ] Ajustar os hooks de busca de conciliação (`useConciliacaoResumo` etc.) para aceitarem a data selecionada como parâmetro e re-buscarem os dados dinamicamente.
- [ ] Exibir a lista de Lojas e o resultado de "Divergência" visualmente em destaque.
- [ ] Revisar tipagens e fazer testes de build.
