# Tarefas: Melhorias no Dashboard e Extrato (011)

- `[x]` Ajustar os hooks de Conciliação Mensal
  - `[x]` Modificar `useConciliacaoResumo` (`useConciliacao.ts`) para agrupar as conciliações por `store_id` e contar as lojas unicamente.
  - `[x]` Modificar `useConciliacaoDetalhes` para retornar os dados mensais agregados (somando `os_total` e `financial_total` por `store_id`).
- `[x]` Melhorar a página da Loja (`loja.$lojaId.tsx`)
  - `[x]` Adicionar abas (Tudo, Entradas, Saídas) para filtragem do Extrato.
  - `[x]` Adicionar controle de paginação (Próxima, Anterior, limit 10/15).
  - `[x]` Inserir um `PieChart` com as formas de pagamento extraídas do extrato na coluna da esquerda.
- `[x]` Criar componente `StoreRankingChart`
  - `[x]` Criar arquivo em `src/components/dashboard/StoreRankingChart.tsx`
  - `[x]` Renderizar um `BarChart` com controles para alternar entre "Maior Faturamento" e "Mais OSs".
- `[x]` Atualizar Dashboard Principal
  - `[x]` Incluir `StoreRankingChart` na tela `conciliacao.tsx` ou `index.tsx` (Dashboard principal).
  - `[x]` Refatorar a visualização do `RecentActivity.tsx` para deixá-la mais atrativa e espaçosa.
- `[x]` Build
  - `[x]` Rodar `npm run build` para garantir tipos corretos e ausência de erros.
