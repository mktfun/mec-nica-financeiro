# Design: Dashboard Fintech V2 (062)

## Sistema de Design a Respeitar

Baseado na varredura do código atual:

```css
/* CSS Vars já usadas — manter sem exceção */
--color-primary          /* roxo/azul principal */
--color-accent-teal      /* verde teal — positivo */
--color-accent-danger    /* vermelho — negativo/alerta */
--color-accent-warning   /* âmbar — atenção */
--bg-canvas              /* fundo base */
--bg-surface             /* superfície de card */
--bg-surface-elevated    /* card elevado/hover */
--border-subtle          /* borda fraca */
--text-primary           /* texto principal */
--text-secondary         /* texto auxiliar */
--text-tertiary          /* texto mínimo */
--radius-md / --radius-lg
```

**Tipografia:** `font-display` (DM Sans) para títulos, `font-mono` para valores financeiros. Tamanhos padrão: título de card `text-xs uppercase tracking-widest`, valor `text-2xl md:text-3xl font-bold font-mono`.

**Animações:** `framer-motion` para entrada. `AnimatedNumber` para contadores. Componente `Card variant="glass"` existente para todos os blocos.

---

## Layout Grid

```
┌─────────────────────────────────────────────────────────┐
│  Visão Geral          [Seletor de Mês]                  │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│ Saldo    │ Caixa    │ Contas a │ Diferença│             │  ← Faixa Topo
│ Total    │ Atual    │ Pagar    │ Final    │             │    4 cards iguais
├──────────┴──────────┴──────────┴──────────┴─────────────┤
│ Faturamento Atual ╱ Anterior │ A Receber │ Pátio        │  ← Faixa Meio
│ (card duplo 2/4)             │ (1/4)     │ (1/4)        │    3 blocos
├─────────────────────────────┬───────────────────────────┤
│ Tabela Por Loja (2/3)       │ Gráfico Faturamento×      │  ← Faixa Base
│                             │ Contas (1/3)              │
└─────────────────────────────┴───────────────────────────┘
```

---

## Spec de Cada Componente

### `KpiCard.tsx`
```tsx
interface KpiCardProps {
  label: string;           // "Saldo Total"
  value: number;           // valor numérico
  format: 'currency' | 'count';
  trend?: number;          // % de variação vs mês anterior (opcional)
  trendLabel?: string;     // "vs mês anterior"
  icon: LucideIcon;
  color: 'primary' | 'teal' | 'danger' | 'warning';
  tooltip?: string;        // explicação do cálculo
  isLoading?: boolean;
}
```
Visual: card glass com ícone colorido no canto superior direito, label em uppercase tracking, valor animado grande em font-mono, badge de tendência embaixo (↑ verde / ↓ vermelho), tooltip opcional com `?` hover.

### `useDashboardV2.ts`
Hook central que executa 4 queries paralelas com `Promise.all`:
1. `reconciliations` — para saldo atual e faturamento (os_total) do mês e mês anterior
2. `patio_os` — para a_receber e contagem de veículos
3. `oficina_contas` — para contas a pagar
4. `stores` — para metadados das lojas (nome, slug)

Retorno:
```ts
{
  saldoTotal: number;
  caixaAtual: number;
  contasAPagar: number;
  diferenca: number;
  faturamentoAtual: number;
  faturamentoAnterior: number;
  variacaoFaturamento: number;  // %
  fluxoCaixa: number;
  aReceber: number;
  veiculosPatio: number;
  veiculosPatioValor: number;
  porLoja: StoreMetrics[];
  isLoading: boolean;
}

interface StoreMetrics {
  storeId: string;
  storeName: string;
  saldoAtual: number;
  faturamento: number;
  contas: number;
  resultado: number;  // faturamento - contas
  statusConciliacao: 'approved' | 'divergence' | 'pending';
}
```

### `FaturamentoVsContasChart.tsx`
`BarChart` horizontal (Recharts) com `layout="vertical"`.
- DataKey `faturamento` → barra teal (`var(--color-accent-teal)`)
- DataKey `contas` → barra âmbar (`var(--color-accent-warning)`)
- Tooltip com valores em R$
- Legenda simples: duas bolinhas coloridas
- Sem XAxis labels (os valores ficam no tooltip)

### `StoreTableDashboard.tsx`
Tabela responsiva com sticky header. Colunas:
| Loja | Saldo Atual | Faturamento | Contas | Resultado | Status |
Resultado positivo → texto teal. Resultado negativo → texto danger.
Status → Badge existente (`variant="success"/"warning"/"danger"`).

---

## Arquivos Modificados

### [MODIFY] `src/routes/index.tsx`
- Remove `HeroBalance`, `QuickActions`, `MotorStatus`, `RecentActivity`, `StoreRankingChart`
- Importa e compõe: `KpiCard`, `StoreTableDashboard`, `FaturamentoVsContasChart`
- Grid layout com `gap-4` e responsive breakpoints

### [NEW] `src/components/dashboard/KpiCard.tsx`
### [NEW] `src/hooks/useDashboardV2.ts`
### [NEW] `src/components/dashboard/StoreTableDashboard.tsx`
### [NEW] `src/components/dashboard/FaturamentoVsContasChart.tsx`

### [KEEP - não deletar, apenas não usar no index]
- `HeroBalance.tsx`, `QuickActions.tsx`, `MotorStatus.tsx`, `RecentActivity.tsx`, `StoreRankingChart.tsx`
