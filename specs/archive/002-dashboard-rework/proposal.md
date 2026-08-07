# Vibe Proposal: CorreçÁo de Fluxo de ConciliaçÁo & Redesign do Dashboard de Lojas

## 1. Problema e Contexto

Após a importaçÁo de dados via planilha (XLS), o usuário notou dois grandes problemas na página de "ConciliaçÁo":
1. **O fluxo nÁo fecha**: Ao clicar em "Confirmar e Salvar" no Modal de ImportaçÁo, os valores de Faturamento (OS) da loja continuam "Pendente" ou zerados no Dashboard. O estado do banco nÁo atualiza da forma esperada.
2. **UI Caótica**: O grid que mostra o status das "12 Lojas" está muito condensado (`lg:grid-cols-5`), deixando a tela bagunçada, com textos cortados e sensaçÁo de desorganizaçÁo visual.

### O que está acontecendo tecnicamente:
O Modal de ImportaçÁo faz o parse correto da planilha, mas a *mutation* conectada ao botÁo "Confirmar e Salvar" (`useSaveDailyCash`) está apenas escrevendo na coluna `daily_cash` (dinheiro físico), ignorando completamente o valor recém extraído do "Faturamento OS" (`financial_total`). Dessa forma, a tabela `reconciliations` continua incompleta e o sistema nÁo consegue deduzir a `divergence` ou atualizar o `status` para "OK" / "Divergência".

## 2. Requisitos e User Stories

- **US1**: Como usuário, ao importar a planilha, quero que os valores faturados da unidade sejam salvos no banco na coluna correta (`financial_total` e `os_total`) e o sistema já calcule se o "Dinheiro em Caixa" já lançado bate com esse novo valor.
- **US2**: Como usuário, quero que, ao inserir manualmente o dinheiro em caixa da loja na coluna lateral da direita, o sistema reavalie a divergência imediatamente contra o faturamento importado.
- **US3**: Como usuário, quero visualizar as lojas de forma limpa, organizada e hierarquizada na tela, sem textos cortados, para entender rapidamente o status de cada unidade.

## 3. Componentes e Tabelas Existentes
- **`src/hooks/useConciliacao.ts`**: Contém as funções de Query/Mutation do banco (`useSaveDailyCash`, etc).
- **`src/components/dashboard/ImportReportDialog.tsx`**: Faz a leitura do XLS.
- **`src/routes/conciliacao.tsx`**: A tela principal afetada, contendo o Grid de Lojas e o Input de "Dinheiro em Caixa".
- **Tabela `reconciliations` (Supabase)**: Tem as colunas perfeitas que precisam apenas ser alimentadas (`os_total`, `financial_total`, `divergence`, `daily_cash`, `status`).

## 4. O que precisa ser CRIADO / ALTERADO
- **Mutation Nova (`useSaveImportedReport`)**: Uma mutaçÁo no `useConciliacao.ts` feita **especificamente** para salvar os valores da planilha (`os_total` e `financial_total`), em vez de reciclar o `useSaveDailyCash`.
- **Lógica de Cálculo Automática**: Sempre que salvarmos o Relatório ou o Dinheiro Físico, calcular `divergence = financial_total - daily_cash` e decidir o `status` (`'pending' | 'approved' | 'divergence'`).
- **RefatoraçÁo UI do Grid de Lojas (`src/routes/conciliacao.tsx`)**: 
  - Mudar `lg:grid-cols-5` para um layout mais amigável (`lg:grid-cols-3` ou `4`).
  - Ajustar o espaçamento, iconografia e clareza dos Card de lojas.

## 5. Critérios de Aceite
- [ ] A importaçÁo do XLS de uma loja salva o "Total Faturado" no card correspondente.
- [ ] Se o "Total Faturado" for igual ao "Dinheiro em Caixa", o card fica Verde (OK). Caso diferente, fica Vermelho (Divergência).
- [ ] O grid de Lojas na tela de ConciliaçÁo está visualmente espaçado e legível.
