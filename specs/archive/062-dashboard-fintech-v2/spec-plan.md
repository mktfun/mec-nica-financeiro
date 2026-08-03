# Spec Plan: Dashboard Fintech V2 (062)

## Checklist Atômico

### Fase 1 — Hook e Dados
- [/] Criar `src/hooks/useDashboardV2.ts`
  - [/] Query paralela: reconciliations (saldo atual + faturamento por mês)
  - [/] Query paralela: reconciliations mês anterior (faturamento comparativo)
  - [/] Query paralela: patio_os (a_receber + count veículos)
  - [/] Query paralela: oficina_contas (contas a pagar)
  - [/] Query paralela: stores (nome/slug por ID)
  - [/] Calcular métricas derivadas (diferença, variação %, resultado por loja)
  - [/] Retornar `porLoja: StoreMetrics[]` para tabela e gráfico

### Fase 2 — Componentes de UI
- [/] Criar `src/components/dashboard/KpiCard.tsx`
- [/] Criar `src/components/dashboard/StoreTableDashboard.tsx`
- [/] Criar `src/components/dashboard/FaturamentoVsContasChart.tsx`

### Fase 3 — Composição do Dashboard
- [/] Atualizar `src/routes/index.tsx`

## Status
IN_PROGRESS
