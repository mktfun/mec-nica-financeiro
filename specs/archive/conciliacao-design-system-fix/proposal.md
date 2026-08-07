# Proposal: Uniformização Visual da Tela de Conciliação (conciliacao-design-system-fix)

## Problema

Os componentes criados nas últimas iterações (`RedeVsOfxTable.tsx`, `PixVsOfxTable.tsx`, `OsVsRedeTable.tsx`, `OsDetailModal.tsx`) usam cores e tokens CSS **hardcoded** (`bg-[#050711]`, `border-zinc-800`, `text-zinc-400`, `text-sky-400`, `text-emerald-400`, etc.) que não pertencem ao design system do projeto.

O design system real usa variáveis CSS (`var(--bg-surface-elevated)`, `var(--border-subtle)`, `var(--text-primary)`, `var(--color-accent-teal)`, etc.) definidas em `src/styles.css` — e o `Card` base do projeto usa exatamente esses tokens.

Resultado visual: a tela de conciliação parece "de outro sistema" — fundo diferente, bordas inconsistentes, tipografia destoante — em contraste com o restante do app (dashboard, pátio, recebíveis, etc.) que usa o `Card` e o `Badge` padrão.

## Causa Raiz

Em vez de usar `<Card variant="elevated">` (que já herda `var(--bg-surface-elevated)` e `var(--border-subtle)`), os novos componentes hardcodaram Tailwind classes de cor. No modo escuro do sistema, `var(--bg-surface-elevated)` resolve para `#16181a` com borda `rgba(255,255,255,0.06)` — muito diferente do `bg-[#050711]` black usado hardcoded.

## Solução Proposta

Refatorar os 4 componentes de conciliação para **usar exclusivamente o design system**:

1. **`RedeVsOfxTable.tsx`** — Substituir todos os `bg-[#050711]`/`border-zinc-800` pelos tokens do sistema. Cards de métricas do topo usam `<Card variant="elevated">`. Cards de grupo de depósito usam `<Card variant="elevated">` com header `bg-[var(--bg-surface)]`.
2. **`PixVsOfxTable.tsx`** — Mesma padronização. Cards de par PIX em `<Card variant="elevated">`.
3. **`OsVsRedeTable.tsx`** — Header e tabela com `bg-[var(--bg-surface)]`, bordas `var(--border-subtle)`.
4. **`OsDetailModal.tsx`** — Limpar todos os hardcoded Zinc, usar `var(--bg-surface-elevated)`, `var(--text-primary)`, `var(--border-subtle)`.

**Cores do sistema a usar:**
| Hardcoded (errado) | Correto (design system) |
|---|---|
| `bg-[#050711]` | `bg-[var(--bg-canvas)]` ou `<Card variant="elevated">` |
| `border-zinc-800` | `border-[var(--border-subtle)]` |
| `text-zinc-400` | `text-[var(--text-secondary)]` |
| `text-zinc-500` | `text-[var(--text-tertiary)]` |
| `text-sky-400` | `text-[var(--color-accent-light-blue)]` |
| `text-emerald-400` | `text-[var(--color-accent-teal)]` |
| `text-amber-400` | `text-[var(--color-accent-warning)]` |
| `bg-emerald-500/10` | `bg-[var(--color-accent-teal)]/10` |
| `bg-sky-500/10` | `bg-[var(--color-accent-light-blue)]/10` |
| `bg-amber-500/10` | `bg-[var(--color-accent-warning)]/10` |
| `bg-zinc-900/60` | `bg-[var(--bg-surface)]` |

## Contratos de Dados

Nenhuma mudança no Supabase, hooks ou lógica de dados. Mudanças 100% visuais/CSS.

## Features Existentes Impactadas

- `src/components/conciliacao/RedeVsOfxTable.tsx`
- `src/components/conciliacao/PixVsOfxTable.tsx`
- `src/components/conciliacao/OsVsRedeTable.tsx`
- `src/components/conciliacao/OsDetailModal.tsx`

## Risco Principal

Baixo — mudanças puramente de classe CSS sem lógica de dados. O único risco é deixar algum elemento orphan com cor hardcoded após a substituição.
