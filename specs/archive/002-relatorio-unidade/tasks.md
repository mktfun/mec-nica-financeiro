# Tasks: ImportaçÁo de Relatório Diário

- [ ] 1. **Análise do Documento Real**: Obter com o usuário o documento real a ser processado (Foto, PDF ou Excel) para decidir entre Frontend Parsing vs OpenAI Vision.
- [ ] 2. **ConfiguraçÁo Supabase**:
  - Criar o Storage Bucket `reports` via interface do Supabase.
  - Ajustar as RLS Policies do Bucket para permitir upload autenticado.
- [ ] 3. **UI do Modal de ImportaçÁo**:
  - Modificar o `ImportReportDialog.tsx` para incluir o Dropdown real de `stores` usando o hook `useStores`.
  - Criar o estado de Loading e Sucesso na UI.
  - Implementar a tela de "Pré-visualizaçÁo da ConciliaçÁo" (Valor Lido vs Valor Sistema).
- [ ] 4. **IntegraçÁo do Parser**:
  - Escrever o código (`extractDataFromReport()`) que lê o valor líquido.
  - Integrar com `useSaveDailyCash` para efetivar a conciliaçÁo no banco de dados.
- [ ] 5. **ValidaçÁo Final**:
  - Subir arquivo de teste e verificar se o valor foi atualizado instantaneamente no Dashboard.
