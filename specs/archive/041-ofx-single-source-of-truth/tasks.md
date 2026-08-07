# Tasks - Spec 041 (OFX Single Source of Truth)

## Backend Engineer
- [x] 1. Em `src/hooks/useTransactions.ts`, atualize `useDashboardSummary` para substituir todas as condições `eq('source', 'system')` por `eq('source', 'ofx')`.
- [x] 2. Em `src/hooks/useTransactions.ts`, atualize `useCashFlow` para substituir `eq('source', 'system')` por `eq('source', 'ofx')`. Também remova o merge de `reconciliations` como fonte de Entradas no gráfico; `useCashFlow` deve usar `.eq('type', 'in')` na tabela `transactions` de OFX para as Entradas do gráfico, e `.eq('type', 'out')` para as Saídas do gráfico.
- [x] 3. Em `src/hooks/useTransactions.ts`, atualize `useExtrato` para substituir `.eq('source', 'system')` por `.eq('source', 'ofx')` na query global. E adicione `.eq('source', 'ofx')` na query de listagem principal das linhas.
- [x] 4. Em `src/hooks/useTransactions.ts`, atualize `useAllStoresBalances` e `useWeeklyRevenueTrend` substituindo `.eq('source', 'system')` por `.eq('source', 'ofx')`.
- [x] 5. Em `src/hooks/useTransactions.ts`, atualize `useDailySystemBalance` para excluir os novos sources corretos caso precisem, ou manter o `.neq('source', 'ofx')` explícito.

## Frontend Engineer
- [x] 1. Em `src/components/importacoes/WizardImportacao.tsx`, garanta a taxonomia de `source`. Na linha `icon_type: isOfx ? 'bank' : 'card'`, modifique também o campo `source` para: `source: category === 'OFX' ? 'ofx' : 'maquininha'`.
- [x] 2. Em `src/routes/importacoes-despesas.tsx`, adicione o campo explícito `source: 'despesa'` no payload de inserção que vai pro banco de dados (dentro do `payload.map`).
- [x] 3. Garantir que tudo compile, marcando as tarefas aqui neste `tasks.md`.
