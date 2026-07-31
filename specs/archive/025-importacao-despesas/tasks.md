# Tasks: Implementação do Importador de Despesas (Contas a Pagar & Juros)

## 1. Setup & Componentes Base
- [ ] Instalar o parser de excel no projeto, se já não houver, usando `npm i xlsx`.
- [ ] Criar a rota de interface `/importacoes-despesas` em `src/routes/importacoes-despesas.tsx` (ou reaproveitar a `/importacoes` adaptando para abas: "Receitas", "Contas a Pagar").
- [ ] Construir o componente visual de Dropzone (`DropzoneUpload.tsx`) estilizado com classes do Liquid Glass / Shadcn.

## 2. Core Logic (Parsers Client-side)
- [ ] Criar `src/lib/parsers/contasAPagarParser.ts` contendo a heurística de achar a linha dos headers (identificando palavras-chave como `Emp`, `Vl. a Pagar`).
- [ ] Criar `src/lib/parsers/jurosRedeParser.ts` contendo o algoritmo para mapear blocos horizontais (`Valor Bruto`, `taxa juros`, `valor cobrado`) atrelados aos nomes das lojas acima deles na linha 4/5.
- [ ] Criar um wrapper central `src/hooks/useImportProcessor.ts` que lê o `ArrayBuffer`, tenta rodar os parsers e retorna uma estrutura padronizada de `ParsedExpense[]`.

## 3. UI de Mapeamento de Lojas (De/Para)
- [ ] Criar o Hook `useStoreMappingStore` (Zustand ou context/localStorage) para guardar `{ "MPrudge": "uuid-real-da-loja", "MPMaster": "uuid-da-matriz" }`.
- [ ] Construir o componente `StoreMapperStep.tsx` que itera as lojas não mapeadas do arquivo atual e exige que o usuário preencha combos (com as lojas vindas do banco de dados via Supabase `stores`).

## 4. UI de Revisão e Inserção
- [ ] Construir `ReviewStep.tsx`, mostrando um consolidado: "R$ 4.300 em despesas para a Matriz; R$ 80 de Juros Rede para Piraporinha".
- [ ] Criar no `src/hooks/useTransactions.ts` uma mutação `useBulkInsertTransactions` que recebe o array montado, bate em `supabase.from('transactions').insert(...)`.

## 5. Visualização (Dashboard Global)
- [ ] Assegurar que os cálculos de `useTransactions` já contemplem os lançamentos do tipo `out` e deduzam o Saldo Líquido no Dashboard (especialmente importante para observar que a Loja Master ficará com saldo negativo devido aos custos centrais, conforme solicitado).
- [ ] Adicionar navegação clara entre o Dashboard (Visão Macro) e a nova tela de Importação (por exemplo, no header do AppShell ou Menu Lateral).
