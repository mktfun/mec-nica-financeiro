# Spec 041 - Design de OFX Single Source of Truth

## 1. Banco de Dados / Arquitetura do Campo `source`
A base de dados continuará usando a mesma tabela `transactions`, mas faremos uma rigorosa taxonomia do campo `source`.
Antes, o sistema de DRE puxava todas as transações que tivessem `source = 'system'`. Porém, nenhum módulo novo estava gerando essa flag.
Agora, a regra passa a ser:
- **OFX**: `source = 'ofx'`
- **Pátio (OS)**: `source = 'patio'`
- **Despesas / Juros**: `source = 'despesa'`
- **Maquininha**: `source = 'maquininha'`

## 2. RefatoraçÁo dos Ganchos de Consulta (`useTransactions.ts`)
Todas as queries primárias do Dashboard e Histórico passarÁo a focar estritamente em `source = 'ofx'`:
- `useDashboardSummary`: Buscará Entradas e Saídas do Mês onde `source = 'ofx'`.
- `useCashFlow`: Montará o gráfico diário lendo exclusivamente Entradas e Saídas onde `source = 'ofx'`.
- `useExtrato`: Montará a tabela do usuário final puxando `source = 'ofx'`.
- `useAllStoresBalances`: Agrupará o Saldo em Conta apenas lendo `source = 'ofx'`.

## 3. ConciliaçÁo Diária
- A tela de ConciliaçÁo e o hook `useDailySystemBalance` continuarÁo como estÁo, isolando os mundos!
- "Apurado Sistema" da ConciliaçÁo vai somar `source IN ('patio', 'despesa', 'maquininha')`.
- "Extrato Bancário" da ConciliaçÁo vai ler a tabela de `reconciliations` gerada unicamente pelo OFX (`source = 'ofx'`).
