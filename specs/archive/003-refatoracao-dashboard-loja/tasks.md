# Tarefas de Implementação: Refatoração Dashboard Loja

O agente deve seguir rigorosamente as tarefas listadas abaixo na fase de execução (vibe-apply).

## 1. Limpeza de Interface e Roteamento
- [ ] No arquivo `src/routes/lojas.tsx`: 
  - Remover a importação e o uso do componente `<StoreDetailsSheet />`.
  - Substituir `onClick={() => setSelectedStore(...)}` no card principal da loja por uma navegação usando o hook `useNavigate()` do TanStack Router para a rota estrita `/loja/$lojaId` (passando o ID da loja correspondente).
  - Remover os `useState` de `selectedStore` que não serão mais utilizados.
- [ ] Deletar o arquivo `src/components/dashboard/StoreDetailsSheet.tsx` permanentemente (pois não é mais necessário).

## 2. Lógica do Gráfico Modular (`src/routes/loja.$lojaId.tsx`)
- [ ] Refatorar a renderização do `<PieChart>` para considerar o estado `tab`.
- [ ] Criar a lógica `parseExpenseCategories(transactions)` para agrupar as despesas pela propriedade `subtitle` (quando `tab === 'out'`).
- [ ] Criar lógica fallback genérica (Receitas vs Despesas) para `tab === 'all'`.
- [ ] Exibir o gráfico correspondente (e as cores corretas dependendo do viés: saídas devem usar paleta quente, entradas paleta fria/verde).

## 3. Lógica do Saldo Inicial 
- [ ] Criar modal ou interface `<InitialBalanceDialog>` em `loja.$lojaId.tsx`.
- [ ] Conectar esse formulário ao hook de gravação (`useBulkInsertTransactions` ou a um mutation simples) para injetar a transação baseada em `type: 'in' | 'out'`, com título "Ajuste de Saldo Inicial" e sem vincular à OS.
- [ ] Inserir o botão gatilho "Ajustar Saldo" perto da renderização do Card "Saldo da Loja".

## 4. Importação Inteligente de Receitas em Massa (`src/routes/importacoes.tsx` e `src/components/dashboard/OSImportModal.tsx`)
- [ ] Refatorar a mecânica de upload atual de Receitas/OS para suportar arrastar-e-soltar múltiplos arquivos (semelhante ao `importacoes-despesas.tsx`).
- [ ] Incorporar o fluxo de "Mapeamento Inteligente" (`useStoreMapping`) permitindo que múltiplas lojas sejam atreladas antes do `bulkInsert`.
- [ ] Garantir que o parser (`useImportProcessor.ts`) consiga aglomerar resultados de múltiplos arquivos no mesmo lote de importação.

## 5. Polimento Geral de Componentes
- [ ] Garantir que na tela `conciliacao.tsx`, não restem resquícios do `StoreDetailsSheet` caso tivessem sido inseridos lá.
- [ ] Verificar build de TypeScript (`npm run build`) para assegurar que a remoção do Sheet não quebrou tipagens.
