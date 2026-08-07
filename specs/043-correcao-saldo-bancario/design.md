# Design: CorreçÁo de Saldo Bancário

## Supabase MCP (Banco de Dados e Hooks)

A lógica do `globalBalance` ("Saldo da Loja") em `useExtrato` e `useAllStoresBalances` será alterada:
Em vez de calcular `SUM(in) - SUM(out)`, nós faremos uma query na tabela `reconciliations` pegando o registro mais recente (`ORDER BY date DESC LIMIT 1`) e lendo o campo `bank_total`. Este é o Saldo Absoluto do Banco que a loja possui de fato.

Para o `concBanco` na "ConciliaçÁo do Período":
Será alterado no componente React. Atualmente, ele usa o resultado da query do Supabase para somar todas as `type = 'in'`. Ele passará a ser calculado como `Total de Entradas (OFX) - Total de Saídas (OFX)`. Dessa forma, o Extrato Banco da conciliaçÁo representará a "VariaçÁo Líquida" do banco para bater de frente com o "Apurado Sistema Líquido".

## Stitch MCP (Frontend)

**`src/routes/loja.$lojaId.tsx`**
1. Na linha que calcula `concBanco`, adicionaremos a query para `type='out' source='ofx'` ou calcularemos localmente baseado no array `extrato?.transactions`, para que `concBanco` represente `Entradas Bancárias - Saídas Bancárias`.
2. Onde exibe "Saldo da Loja", a label "Acumulado real do sistema" pode ser renomeada para "Último saldo reportado pelo banco" para maior transparência.
3. Isso corrige a percepçÁo visual do usuário de que "está somando todo o extrato ao invés do saldo do banco".

**`src/hooks/useTransactions.ts`**
1. No hook `useExtrato`, a query de `globalBalance` substituirá a soma histórica das transações por uma query em `reconciliations` buscando o último `bank_total`.
