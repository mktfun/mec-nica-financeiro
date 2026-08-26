# Design: Refatoração Dashboard Enterprise (288)

## Arquitetura Técnica

```
src/lib/formatters.ts ← [NEW] Helpers canônicos de formatação monetária
       ↑ importado por
       ├── src/lib/utils.ts (re-export backward-compatible)
       ├── src/components/dashboard/StoreTableDashboard.tsx
       ├── src/components/dashboard/KpiCard.tsx
       ├── src/components/dashboard/EvolucaoMacroChart.tsx
       └── src/components/dashboard/StoreAnalyticsTabs.tsx

src/routes/index.tsx ← Rota principal (consome todos os acima)
       ↑ dados de
       └── src/hooks/useDashboardV2.ts (INTOCADO)
```

O fluxo de dados permanece 100% inalterado. Todas as mudanças são exclusivamente de **apresentação (view layer)**.

---

## Interfaces TypeScript

```typescript
// src/lib/formatters.ts — [NEW]

/** Formatação monetária BRL rigorosa: SEMPRE 2 casas decimais */
export function formatCurrencyBRL(value: number): string;

/** Formatação compacta para espaços reduzidos (KPI labels, eixos de gráfico) */
export function formatCompactBRL(value: number): string;

/** Formatação de eixo de gráfico sem símbolo R$ */
export function formatAxisBRL(value: number): string;
```

Os types `StoreMetrics` e `DashboardV2Data` em `useDashboardV2.ts` permanecem inalterados.

---

## Componentes / Hooks / Funções

| Artefato | Localização | Responsabilidade |
|---|---|---|
| `formatters.ts` | `src/lib/formatters.ts` | Fonte única de verdade para formatação monetária pt-BR |
| `StoreTableDashboard` | `src/components/dashboard/StoreTableDashboard.tsx` | Tabela enterprise com alinhamento, badges e divisórias |
| `KpiCard` | `src/components/dashboard/KpiCard.tsx` | Cards de KPI com micro-sparkline de tendência |
| `EvolucaoMacroChart` | `src/components/dashboard/EvolucaoMacroChart.tsx` | Gráfico de evolução mensal refinado |
| `StoreAnalyticsTabs` | `src/components/dashboard/StoreAnalyticsTabs.tsx` | Donut + ranking bars redesenhados |
| `index.tsx` | `src/routes/index.tsx` | Rota principal com layout refinado |

---

## Fluxo de UI

### Tela Principal (Dashboard)

#### Linha 1 — KPI Cards (4 colunas)
- Cada card exibe: ícone semântico, label uppercase, valor monetário `R$ XXX.XXX,XX` com 2 decimais fixas, micro-sparkline de tendência 7d
- Cores semânticas por tipo: Saldo (primary/blue), Caixa (teal), Contas (warning/amber), Diferença (dinâmico: teal se ≈0, danger se divergente)

#### Linha 2 — Faturamento Card (2/4) + A Receber (1/4) + Fluxo de Caixa (1/4)
- Card de faturamento mantém layout atual com variação %
- Valores formatados com 2 decimais fixas

#### Linha 3 — Evolução Macro (Gráfico de Área/Linha)
- 3 séries: Saldo (linha sólida blue com dot pequeno), Faturamento (área gradient teal), Contas (área gradient amber)
- Dots reduzidos de r=4 para r=2.5, activeDot de r=6 para r=4
- CartesianGrid apenas horizontal, stroke mais sutil
- Tooltip com backdrop blur refinado

#### Linha 4 — Store Analytics (Donut + Ranking)
- Donut com paddingAngle=4, innerRadius=75, outerRadius=110
- Ring externo translúcido (`stroke={accentColor}` com opacity 0.15)
- Ranking bars com cantos arredondados e gradiente linear
- Mini cards de métricas com `tabular-nums`
- All values: `formatCurrencyBRL()` com 2 decimais

#### Linha 5 — Tabela de Resultado por Loja
```
┌──────────────┬────────────────┬───────────────┬──────────────┬──────────────┬────────┬──────────┐
│ Loja (left)  │ Saldo (right)  │ Fatur (right) │ Contas(right)│ Result(right)│ Pátio  │ Status   │
├──────────────┼────────────────┼───────────────┼──────────────┼──────────────┼────────┼──────────┤
│ R. Módulo    │ R$ 45.230,15   │ R$ 12.400,00  │ R$ 8.200,50  │ R$ 4.199,50  │ 3 ud.  │ ● OK     │
│ Planalto     │ R$-15.320,00   │ R$ 8.100,00   │ R$ 22.500,00 │-R$ 14.400,00 │ –      │ ● Diverg.│
├──────────────┼────────────────┼───────────────┼──────────────┼──────────────┼────────┼──────────┤
│ TOTAL        │ R$ 170.244,95  │ R$ 98.500,00  │ R$ 67.800,50 │ R$ 30.699,50 │ 12 ud. │          │
└──────────────┴────────────────┴───────────────┴──────────────┴──────────────┴────────┴──────────┘
```

- Row height: `py-3.5` (48px comfort mode)
- Divisórias: `divide-y divide-zinc-800/60`
- Hover: `hover:bg-zinc-800/40 transition-colors duration-150`
- Status badges:
  - ✅ `approved` → `<Badge variant="success">● OK</Badge>`
  - ⚠️ `pending` → `<Badge variant="warning">● Pendente</Badge>`
  - 🔴 `divergence` → `<Badge variant="danger">● Divergência</Badge>`
- Saldo negativo → `<Badge variant="danger">Negativo</Badge>` ao lado do valor
- Colunas monetárias: `font-mono tabular-nums text-right`
- Coluna "Loja": `text-left font-medium`

### Restrições Visuais
- Background: Zinc-950 (`var(--bg-base)`)
- Sem glassmorphism em cards centrais
- Fontes: Inter (UI) + Mono nativo (valores)
- Cores: Apenas CSS variables do design system existente

---

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Formatação Monetária Correta
- **Estado Inicial:** Tabela exibe `R$ 170.245` (0 decimais)
- **Ação:** Refatorar `fmt()` para usar `formatCurrencyBRL()`
- **Resultado Esperado:** Tabela exibe `R$ 170.244,95` (2 decimais fixas)

### Cenário 2: Alinhamento Contábil
- **Estado Inicial:** Todos os headers/values estão `text-left`
- **Ação:** Aplicar `text-right` nas colunas monetárias
- **Resultado Esperado:** Decimais alinhados verticalmente, nomes à esquerda

### Cenário 3: Badges de Status
- **Estado Inicial:** Status da conciliação não aparece na tabela
- **Ação:** Adicionar coluna "Status" com `<Badge>`
- **Resultado Esperado:** Badges visuais para approved/pending/divergence

### Cenário 4: Regressão Zero em Outras Telas
- **Estado Inicial:** ~26 arquivos usam `formatCurrency` de `utils.ts`
- **Ação:** Manter `utils.ts` com 2 decimais (padrão Intl) e substituir apenas locais no dashboard
- **Resultado Esperado:** Build sem erros, telas de conciliação/recebíveis inalteradas

### Cenário 5: Build de Produção
- **Ação:** `npm run build`
- **Resultado Esperado:** Build passa sem erros TypeScript, sem warnings de import
