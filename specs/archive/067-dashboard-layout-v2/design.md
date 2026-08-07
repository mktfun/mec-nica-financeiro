# Design Document: Spec 067

## Arquitetura Visual
1. **Container Principal (Topo, Full Width)**
   - Um novo wrapper `xl:col-span-4` (ocupando todo o Grid da página).
   - O `<EvolucaoMacroChart />` receberá estilizaçÁo de altura menor (max. 220px/250px) para esticar-se como um painel de aviador (Widescreen).
   
2. **Container Secundário (Bottom, Split)**
   - O `<StoreTableDashboard />` voltará para `xl:col-span-3`.
   - O `<FaturamentoVsContasChart />` ficará em `xl:col-span-1` do seu lado, com a mesma altura da tabela.

3. **Gráfico Macro Unificado (`EvolucaoMacroChart.tsx`)**
   - **Header Header**:
     - Título e subtítulo à esquerda.
     - Legenda Customizada (CSS/HTML puro com bolinhas de cores) alinhada à direita, no mesmo nível do título.
   - **YAxis**:
     - `hide={false}`.
     - Eixo com cor bem suave `var(--text-tertiary)`, fonte tamanho `10px`.
     - `tickFormatter` convertendo grandes números (ex: 15.000 -> 15 mil ou 15k).
     - Grid lines horizontais muito suaves (`CartesianGrid`).

## Impactos no Sistema
- Nenhuma alteraçÁo nos Hooks ou Lógica de Backend, tudo 100% focado em refatoraçÁo estética.
