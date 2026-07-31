# Tasks: Central de Fechamento Massivo (031)

## Frontend Engineer (React / Tailwind)
- [ ] Ler e compreender o `design.md` e a ideia da Dropzone Universal e do `Smart File Router`.
- [ ] Atualizar `src/routes/conciliacao.tsx` removendo o botão isolado de "Importar Maquininha" e a antiga `BankReconciliationDashboard`.
- [ ] Criar o componente inteligente `<UniversalDropzone />` (pode ser dentro do próprio arquivo ou em um novo em `src/components/dashboard/`). Este componente deve:
  - Aceitar `multiple` arquivos (`.ofx, .xlsx, .xls, .csv`).
  - Ter o estado local para armazenar `File[]` processados.
- [ ] Implementar a função `classifyFile(file)` (heurística de extensão e leitura rápida via `SheetJS` para XLSX) que separa os arquivos do array principal em três pilhas em estado: `ofxFiles`, `machineFiles`, `feesFiles`.
- [ ] Reutilizar a lógica de mapeamento inteligente existente (`localStorage` mappings) iterando sobre todos os arquivos destas três pilhas e mapeando para as Lojas do sistema.
- [ ] Caso haja arquivos sem loja atrelada, exibir uma modal única de Triagem (`TriageModal`) pedindo ao usuário para associar o arquivo X à loja Y.
- [ ] Após mapeamento 100%, executar em paralelo o processamento e "Match" (`matchTransactions`) contra as transações das lojas correspondentes.
- [ ] Exibir o painel de resultados consolidado por Loja (mostrando o total de Maquininha, OFX lido e Custos daquela loja).
- [ ] Refatorar o botão de "Salvar Fechamento Consolidado" para iterar sobre todas as lojas que tiveram importações e despachar, para cada loja, as mutações `saveDailyCash` e `saveBankReconciliation`.
- [ ] Atualizar o componente de UI para ter a estética Liquid Glass e Maximalista 2026.
- [ ] Validar a compilação com `npm run build` após a refatoração.
