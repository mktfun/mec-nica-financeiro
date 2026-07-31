# Tasks - 018 Bugfixes & Loading

- [x] 1. Modificar o arquivo `src/hooks/useImportProcessor.ts`.
  - [x] a) Na seção "2. Process Receivables", adicionar um array `toUpdateRecs: {id: string; status: string}[]`.
  - [x] b) Ao encontrar um `isDuplicate`, localizar o objeto existente (`existingMatch`). Se `existingMatch.status === 'pendente'` e o novo `rec.status === 'recebido'`, adicionar a `toUpdateRecs`.
  - [x] c) Executar os updates no Supabase logo após a inserção (ou realizar um batch update).
- [x] 2. Modificar o arquivo `src/components/ui/LoadingSpinner.tsx`.
  - [x] a) Remover o SVG estático do anel e suas bolinhas.
  - [x] b) Implementar um novo loader visual com Framer Motion (ex: 3 círculos translúcidos minimalistas ou um "Infinity Loop" em Liquid Glass, usando cores da marca com suavidade).
- [x] 3. Solicitar verificação visual pelo usuário ou descrever a experiência de carregamento.
- [x] 4. Testar a regressão do processo de importação compilando ou verificando o código no TS Checker.
