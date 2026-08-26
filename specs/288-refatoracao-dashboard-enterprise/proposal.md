# Proposal: Refatoração Dashboard Enterprise (288)

## Problema

O dashboard principal (`src/routes/index.tsx`) e seus componentes filhos apresentam múltiplos desvios do padrão enterprise exigido pela gerência:

### Formatação Monetária Inconsistente
- `StoreTableDashboard.tsx` usa `minimumFractionDigits: 0`, gerando valores truncados como `R$ 0`, `R$ 2`, `R$ 170.245` em vez do correto `R$ 170.244,95`.
- `src/lib/utils.ts` → `formatCurrency()` não fixa casas decimais explicitamente (herda variável do Intl).
- Existem **7+ definições locais diferentes** de `formatCurrency` / `fmt` espalhadas nos componentes dashboard (cada uma com comportamento distinto).

### Alinhamento de Tabela Incorreto
- `StoreTableDashboard.tsx` usa `text-left` nos headers de colunas monetárias — valores financeiros devem ser `text-right` para alinhar decimais verticalmente (padrão contábil universal).
- Nenhuma coluna monetária segue a regra: texto (nome) à esquerda, valores à direita.

### Espaçamento e Densidade Inadequados
- Padding das linhas é inconsistente (`py-3 px-3` mas headers com `pb-2.5 px-3`).
- Sem `divide-y` para divisórias sutis entre linhas.
- Hover não usa a sutil opacidade `zinc-800/40` do padrão dark enterprise.

### Status como Texto Solto
- O campo "Negativo" no `StoreTableDashboard` usa um `<span>` inline bruto com estilos ad-hoc em vez de um Badge componentizado e padronizado.
- Ausência de indicadores visuais de status da conciliação (`statusConciliacao` existe no type `StoreMetrics` mas nunca é renderizado na tabela).

### Gráficos Fora do Padrão
- `EvolucaoMacroChart`: Dots grandes, stroke pesado, sem gradientes refinados na linha de saldo.
- `StoreAnalyticsTabs`: Donut chart com paleta genérica, sem refinamentos enterprise.
- Ausência de sparklines nos KPI cards para contexto de tendência.
- Layout desalinhado com o padrão de superfícies do sistema.

---

## Solução Proposta

Refatoração cirúrgica do dashboard em 5 frentes, **sem alterar hook de dados** (`useDashboardV2`) nem backend:

### 1. Centralização da Formatação Monetária
- Criar `src/lib/formatters.ts` com helpers canônicos `formatCurrencyBRL()` e `formatCompactBRL()` usando `Intl.NumberFormat` com `minimumFractionDigits: 2, maximumFractionDigits: 2` fixos.
- Remover todas as definições locais de `formatCurrency` / `fmt` dos componentes dashboard e substituir pelo import centralizado.
- Ajustar `formatCurrency` em `src/lib/utils.ts` para fixar 2 casas decimais (backward-compatible).

### 2. Refatoração da Tabela `StoreTableDashboard`
- Headers monetários alinhados à direita (`text-right`), nome da loja à esquerda (`text-left`).
- Padding `py-3.5 px-4` em todas as cells para conforto visual.
- `divide-y divide-zinc-800/60` no tbody.
- `hover:bg-zinc-800/40 transition-colors duration-150` nas linhas.
- Coluna nova "Status" usando `<Badge>` com variantes `success`, `danger`, `warning` para o campo `statusConciliacao`.
- Badge "Negativo" para saldo negativo usando o componente `Badge` existente.
- Footer com visual uniforme e alinhamento idêntico.
- `tabular-nums` em todas as cells monetárias.

### 3. Refinamento de KPI Cards
- Ajustar `KpiCard` para garantir formatação 2 decimais fixas.
- Micro-sparkline de tendência (7 últimos pontos do `historicoMacro`) integrado nos KPI cards do topo.

### 4. Redesign dos Gráficos
- `EvolucaoMacroChart`: Gradientes mais suaves, dots menores com hover accent, grid vertical removido, tooltips refinados.
- `StoreAnalyticsTabs`: Donut com ring separado externo translúcido, active segment com escala, barras de ranking com rounded corners e gradiente sutil. Mini cards internos com `tabular-nums`.

### 5. Consistência Visual Geral da Rota `index.tsx`
- Faixa de KPIs com gap e bordas uniformes.
- Card de Faturamento com hierarquia visual limpa.
- Banner de Pátio refinado.
- Consistent use of CSS variables.

---

## Contratos de Dados

Nenhuma alteração de backend. Todos os dados já vêm de `useDashboardV2` / `useBackendDashboard`. Os types `StoreMetrics` e `DashboardV2Data` permanecem inalterados.

## API / Interface

| Artefato | Ação |
|---|---|
| `src/lib/formatters.ts` | **[NEW]** — Helpers canônicos de formatação monetária pt-BR |
| `src/lib/utils.ts` | **[MODIFY]** — `formatCurrency()` fixa 2 casas decimais |
| `src/components/dashboard/StoreTableDashboard.tsx` | **[MODIFY]** — Refatoração completa da tabela |
| `src/components/dashboard/KpiCard.tsx` | **[MODIFY]** — Ajuste de formatação + sparkline |
| `src/components/dashboard/EvolucaoMacroChart.tsx` | **[MODIFY]** — Redesign visual dos gráficos |
| `src/components/dashboard/StoreAnalyticsTabs.tsx` | **[MODIFY]** — Redesign do donut e ranking bars |
| `src/routes/index.tsx` | **[MODIFY]** — Layout ajustes finos, imports atualizados |

## Features Existentes Impactadas

- **Dashboard Executivo (Fintech V5)** — listado em `spec/global/features.md`.
- **AnimatedNumber** — Permanece intacto (já usa 2 casas decimais para format currency).
- **Badge** — Componente existente será reutilizado (sem duplicação).

## Risco Principal

**Regressão visual em telas dependentes:** O `formatCurrency` de `src/lib/utils.ts` é usado em ~26 arquivos. A mudança para forçar 2 decimais pode causar alteração visual em telas de conciliação e recebíveis. **Mitigação:** O `utils.ts` atual já usa `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` que por default gera 2 decimais — o problema real está nas definições locais dentro dos componentes dashboard que usam `minimumFractionDigits: 0`. Portanto, a correção é cirúrgica nos componentes e não na lib central.
