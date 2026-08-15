# Spec Plan: 212-fix-dashboard-chart-layout-tooltip-clipping-and-negative-balance-display

## Tasks

- [x] [UI] Em `src/components/dashboard/FaturamentoVsContasChart.tsx`, corrigir corte de tooltip (`allowEscapeViewBox`, `zIndex`, remoção de clipping de overflow), expandir altura e largura das barras e formatar nomes completos das lojas com siglas.
- [x] [UI] Em `src/components/dashboard/StoreTableDashboard.tsx`, destacar saldos bancários negativos com badge/alerta visual em vermelho.
- [x] [UI] Em `src/routes/index.tsx`, reestruturar o grid da base do Dashboard para acomodar a Tabela e o Gráfico de Faturamento x Contas de forma ampla, sem espremer em colunas minúsculas.
- [x] [TEST] Executar `cmd.exe /c "npm run build"` para validação técnica com 0 erros.
