# Proposal: Stop Maquininha and Rede Duplication in Extrato (081)

## Problema
O usuário relatou que "ta duplicando td do ofx", exibindo valores repetidos para entradas de cartão de crédito/débito e PIX. 

Após análise dos arquivos importados (`04-08.zip`) e do código de importação (`CentralImportWizard.tsx`), foi constatado que a aplicação está inserindo as vendas da Maquininha (Rede) **duas vezes** no banco de dados, mas em tabelas e lógicas conflitantes:
1. As vendas da Rede são salvas corretamente na tabela `receivables` (como recebíveis pendentes).
2. Porém, o código também injeta essas mesmas vendas da Rede na tabela `transactions` (junto com o Extrato OFX), marcando-as como `type = 'in'`.

Como o Dashboard (`useDashboardV2.ts`) soma todas as `transactions` onde `type = 'in'` para calcular o Faturamento Atual, ele acaba somando o valor que já veio no OFX (quando o banco pagou) **junto** com o valor da Maquininha. Isso não só dobra o Faturamento como "polui" a visualização do Extrato Bancário misturando transações reais com comprovantes de maquininha.

## Solução Proposta
A tabela `transactions` deve ser estritamente o livro-razão (Ledger) do **Extrato Bancário**. 
Vendas de maquininha são recebíveis futuros e pertencem à tabela `receivables`.

Vamos remover a injeção forçada de `results.maquininhaItems` e `results.redeResults` no array `txsToInsert` dentro do `CentralImportWizard.tsx`. 
Dessa forma, o `useBulkInsertTransactions` gravará APENAS o extrato OFX na tabela `transactions`, impedindo a duplicidade visual no Extrato e a duplicação matemática no Faturamento do Dashboard.

## Contratos de Dados
Nenhuma tabela nova.
Apenas pararemos de inserir na tabela `transactions` os itens cujo `source = 'maquininha'` ou `source = 'rede'`.

## API / Interface
- Modificar `src/components/importacoes/CentralImportWizard.tsx` (linhas ~350-400) para remover o `txsToInsert.push(...)` do bloco da Maquininha e da Rede.

## Features Existentes Impactadas
- **Dashboard Global:** O "Faturamento Atual" cairá pela metade (voltando ao valor correto), pois a dupla contagem sumirá.
- **Extrato Bancário UI:** Deixará de exibir recebimentos misturados, mostrando apenas o que de fato passou pela conta do Itaú.

## Risco Principal
Garantir que a tabela `receivables` continue recebendo a Rede normalmente (o que já acontece via `savePatioOsAndReceivables`), para que a aba "Recebíveis" não perca dados.
