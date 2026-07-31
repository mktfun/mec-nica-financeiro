# Tasks - Spec 036

## Frontend
- [x] 1. Em `src/routes/importacoes.tsx`, alterar o `onClick` dos botões de importação:
  - "Importar Despesas" e "Juros Rede" devem redirecionar para `/importacoes-despesas`.
  - "Pátio / OS" deve redirecionar para `/importar-os`.
  - "Extrato Bancário" e "Maquininha" continuam chamando `setIsImporting(...)`.
- [x] 2. Em `src/components/importacoes/WizardImportacao.tsx`:
  - Adicionar um estado `targetDate` preenchido com a data atual (D-0, formato YYYY-MM-DD).
  - No Step 3, adicionar um input `<input type="date" />` para que o usuário confirme e altere essa Data de Competência.
  - No `handleConfirm`, garantir que o lote `import_logs` use o `targetDate` fornecido pelo usuário em vez de `new Date()`. Se a importação for de Maquininha, use essa mesma data para as transações.
- [x] 3. Em `src/routes/importacoes-despesas.tsx`:
  - Adicionar o estado `targetDate` com a data atual e o input no Step 3.
  - Atualizar o `handleConfirmImport` para usar essa data na gravação dos logs e possivelmente propagá-la para a API se ela suportar.
- [x] 4. Opcional (se houver passo correspondente): Em `src/routes/importar-os.tsx`, checar se possui etapa final de submissão em lote e, se tiver, adicionar campo para Data de Competência também para consistência.

## QA
- [x] 5. Rodar o projeto e confirmar que o clique nos botões de importação roteiam corretamente para as telas certas, sem acionar `amount: 100` errados no wizard genérico.
- [x] 6. Rodar o build de produção para checar tipagens.
