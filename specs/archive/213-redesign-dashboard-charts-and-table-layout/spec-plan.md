# Spec Plan: 213-redesign-dashboard-charts-and-table-layout

## Tasks

- [x] [SQL/RPC] Ajustar RPC `get_dashboard_metrics` no PostgreSQL para calcular o faturamento diário real (delta de odômetro) no array histórico dos 7 dias e aplicar no banco Supabase.
- [x] [UI] Corrigir `EvolucaoMacroChart.tsx` definindo altura fixa de container (`h-[280px]`) e renderização sem cortes.
- [x] [UI] Criar componente `src/components/dashboard/StoreDonutCharts.tsx` contendo os 2 Cards Donut empilhados (Distribuição de Faturamento por Loja no topo e Distribuição de Contas por Loja embaixo) com tooltips ricos e totais centrais.
- [x] [UI] Ajustar `StoreTableDashboard.tsx` para exibição confortável e espaçosa na coluna esquerda (`lg:col-span-8`), garantindo visualização completa de todas as 6 colunas sem corte de Pátio ou Resultado.
- [x] [UI] Em `src/routes/index.tsx`, estruturar o layout final com a Tabela expandida à esquerda (`lg:col-span-8`) e os 2 Donut Cards empilhados à direita (`lg:col-span-4`).
- [x] [TEST] Executar `cmd.exe /c "npm run build"` para validação técnica com 0 erros.
