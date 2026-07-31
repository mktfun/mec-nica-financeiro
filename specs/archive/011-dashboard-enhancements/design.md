# Design: Dashboards Mensais e Gráficos (011)

## Divisão de Componentes UI

1. **`StoreRankingChart.tsx` (Novo)**
   - Um card para o Dashboard usando Recharts (`BarChart`).
   - Botões de toggle (ex: "Faturamento", "Saldo", "OSs") para alternar o dataKey do gráfico.
   - Puxa dados processando as transações/conciliações do mês para descobrir o top 5 ou top 10 lojas.

2. **`RecentActivity.tsx` (Modificação)**
   - Repaginada de layout. Pode ter abas entre "Importações Recentes" e "Últimas Transações" para ficar mais completo, com layout mais espaçoso.

3. **`loja.$lojaId.tsx` (Modificação)**
   - Gráfico de Forma de Pagamento (`PieChart` com um donut bem elegante).
   - Sessão de filtros no extrato bancário: "Todas", "Entradas", "Saídas (Despesas)".
   - Paginação simples no estado local (useState para page e pageSize = 10).

## Ajustes no Backend (Hooks / Supabase)

1. **`useConciliacaoResumo`**
   - Agrupar os `rows` do mês por `store_id`.
   - Se todas as linhas da loja $X tiverem status `approved`, a loja conta como +1 "Conciliada".
   - Se houver `divergence`, a loja entra como "Divergência".
   - As lojas que não tiveram fechamento no mês caem como "Pendentes". Dessa forma, a soma total sempre será igual ao número de lojas cadastradas (ex: 10 lojas).

2. **`useConciliacaoDetalhes`**
   - Mudar de `.eq('date', targetDate)` para puxar o mês (`.gte`, `.lte`).
   - Processar os dados para retornar um array com *uma* linha por loja, contendo a soma de `os_total` e `financial_total` daquela loja para o período do mês.
   - Isso fará com que o grid de lojas mostre o faturamento correto consolidado mensal para cada card.

## Dependências
- Nenhuma dependência externa nova. Usaremos `recharts` que já existe.
