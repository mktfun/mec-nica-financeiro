# Design Document: Spec 066 (Macro Chart)

## Arquitetura Visual
1. **Container Principal (Grid xl:col-span-3)**
   - Um novo `Card` horizontal será inserido no topo (imediatamente antes da tabela).
   - O interior do Card terá altura mínima de ~250px.
   - Todo o espaço será preenchido pelo novo componente `<EvolucaoMacroChart />`.
   
2. **Gráfico Macro Unificado (`EvolucaoMacroChart.tsx`)**
   - Substitui o antigo `EvolucaoSaldoChart`.
   - Utilizará o `ComposedChart` ou `AreaChart` do Recharts com múltiplas `<Area />` ou `<Line />`.
   - Eixo X será as datas do mês filtrado.
   - Legenda no topo/base para habilitar/desabilitar as 3 séries de dados: Saldo, Faturamento e Contas.
   
3. **Barra Lateral (Grid xl:col-span-1)**
   - O `<FaturamentoVsContasChart />` ficará sozinho.
   - A `div` pai deverá ter `h-full flex flex-col`.
   - O gráfico deverá assumir altura 100% (usando `<ResponsiveContainer width="100%" height="100%">`), eliminando scroll interno.

## Impactos no Sistema
- O hook `useDashboardV2.ts` será refatorado na coleta do `historicoSaldos` (que passará a ser `historicoMacro`). Em vez de 15 dias limitados, vai buscar as datas agrupadas pelo mês/ano da `dateAtual`.
- Nenhuma quebra da API existente.

