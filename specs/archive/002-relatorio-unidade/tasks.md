# Tasks: Importação de Relatório Diário

- [ ] 1. **Análise do Documento Real**: Obter com o usuário o documento real a ser processado (Foto, PDF ou Excel) para decidir entre Frontend Parsing vs OpenAI Vision.
- [ ] 2. **Configuração Supabase**:
  - Criar o Storage Bucket `reports` via interface do Supabase.
  - Ajustar as RLS Policies do Bucket para permitir upload autenticado.
- [ ] 3. **UI do Modal de Importação**:
  - Modificar o `ImportReportDialog.tsx` para incluir o Dropdown real de `stores` usando o hook `useStores`.
  - Criar o estado de Loading e Sucesso na UI.
  - Implementar a tela de "Pré-visualização da Conciliação" (Valor Lido vs Valor Sistema).
- [ ] 4. **Integração do Parser**:
  - Escrever o código (`extractDataFromReport()`) que lê o valor líquido.
  - Integrar com `useSaveDailyCash` para efetivar a conciliação no banco de dados.
- [ ] 5. **Validação Final**:
  - Subir arquivo de teste e verificar se o valor foi atualizado instantaneamente no Dashboard.
