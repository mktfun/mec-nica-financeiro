# Design: Faturamento Incremental no Gráfico Macro, Suporte a Saldo Negativo e Nomenclatura "Unidades" (229)

## 1. PostgreSQL RPC `get_dashboard_metrics`
- Iterar cronologicamente sobre os snapshots do mês calculando `faturamento` de cada ponto no `historicoMacro` como delta de incremento entre fechamentos.
- Manter 100% da execução no PostgreSQL.

## 2. Componente `StoreAnalyticsTabs.tsx`
- **Separação de Itens Positivos vs Negativos:**
  - `positiveItems = items.filter(s => s.value > 0)` (para Donut)
  - `negativeItems = items.filter(s => s.value < 0)` (para Alerta)
  - `totalPositivo` vs `totalNegativo` $\rightarrow$ `totalLiquido = totalPositivo - totalNegativo`
- **Substituição de Nomenclatura:**
  - `"por Unidade"` no lugar de `"por Filial"`
  - `"X unidades"` no lugar de `"X filiais"`
  - `"Média por Unidade"` no lugar de `"Média por Loja/Filial"`
  - `"Ranking por Unidade"` no lugar de `"Ranking por Filial"`
