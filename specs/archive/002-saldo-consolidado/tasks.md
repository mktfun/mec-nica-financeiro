# Tasks: Saldo Líquido Consolidado Independente (002-saldo-consolidado)

## 1. Refatoração do Lógico de Banco de Dados
- [ ] Editar `src/hooks/useTransactions.ts`, especificamente o `useDashboardSummary`.
- [ ] Adicionar uma query Supabase secundária que busca o `amount, type` de `transactions` de *todos os tempos* (sem filtros de data).
- [ ] Calcular o `balance` global através dessa segunda lista (Entradas Totais - Saídas Totais).
- [ ] Manter o cálculo de `totalIn` e `totalOut` e `totalDivergences` sendo amarrados ao filtro de `monthStr`.
- [ ] Retornar o novo objeto com `balance` sendo global.

## 2. Refinamento Visual de Clareza
- [ ] Editar `src/components/dashboard/HeroBalance.tsx`.
- [ ] Adicionar um texto pequeno abaixo ou ao lado do "Saldo Líquido Consolidado" indicando `(Total de todas as contas acumulado)` para garantir que o usuário entenda o porquê esse valor não pisca/muda drasticamente ao trocar de mês.
- [ ] Adicionar/reforçar o visual de "Entradas do Mês" e "Saídas do Mês" nos blocos menores, talvez inserindo a variável de mês na UI (opcional).
