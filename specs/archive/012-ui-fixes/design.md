# Design: Correções de UI e Gráficos (012)

## Componentes Afetados

1. **`src/routes/loja.$lojaId.tsx`**
   - **ExtraçÁo de Pagamentos**: Vamos alterar a forma como `pieData` é calculado. Hoje fazemos `acc[tx.payment_method] = value`. Passaremos a usar um parser via regex ou split string:
     - Iterar sobre o conteúdo de `tx.payment_method` separando por `;`.
     - Para cada pedaço, separar por `:` (ex: "Credito" e "10000.00").
     - Se falhar, jogar o valor inteiro em "Outros" ou "Sem Categoria".
   - **Layout Último Fechamento**: Adicionar subtítulos menores abaixo de R$ 8.550 e R$ 0,00 explicando a origem dos valores.

2. **`src/components/dashboard/StoreRankingChart.tsx`**
   - **RemoçÁo de Mock**: Excluir a constante `mockOs` e os botões de toggle do estado `metric`. O gráfico assumirá `faturamento` puro como métrica.
   - **CorreçÁo de Cores**: Configurar o `Tooltip` do Recharts com:
     `contentStyle={{ backgroundColor: '#1A1A1A', borderColor: '#333', color: '#FFF' }}`
     `itemStyle={{ color: '#FFF' }}`
     Isto garantirá visibilidade independente de ser dark ou light mode.

## Banco de Dados
- Nenhuma alteraçÁo no Supabase. Os dados brutos continuam salvos como vêm da planilha, apenas a camada de apresentaçÁo do Gráfico será mais inteligente.
