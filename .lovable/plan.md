# Plano — Fundação Visual + Painel Geral

App interno de operações financeiras para a rede Mecânica Popular. Esta primeira entrega monta o design system, layout base (sidebar + topbar) e o Painel Geral completo com dados mockados em localStorage.

## Escopo desta entrega

1. Design system (tokens em `src/styles.css`)
2. Layout base com sidebar fixa (220px) + topbar
3. Página `/` = Painel Geral completo
4. Stubs de rotas para os outros itens do menu (placeholder simples) para que o sidebar navegue sem 404
5. Seed de mock data em localStorage no primeiro load

## Design System

Tokens em `src/styles.css` (oklch convertidos dos hex pedidos):

- `--background` #0f1117, `--surface-1` #161b27, `--surface-2` #1c2235, `--surface-3` #212840
- `--primary` #3b82f6, `--success` #22c55e, `--warning` #f59e0b, `--destructive` #ef4444
- `--foreground` #f1f5f9, `--muted-foreground` #64748b
- `--border` rgba(255,255,255,0.07)
- Radius: card 12px, button 8px, badge 999px
- Fonte Inter (400/500/600/700) via Google Fonts no `__root.tsx`
- Utilitário `tabular-nums` aplicado a toda classe `.num` (moeda/valores)
- Transições padrão 150ms

Forçar tema escuro adicionando `class="dark"` no `<html>` do `RootShell`.

## Estrutura de arquivos

```text
src/
  routes/
    __root.tsx              (adiciona <html class="dark">, fonte Inter, layout shell)
    index.tsx               (Painel Geral)
    lojas.tsx               (placeholder)
    conciliacao.tsx         (placeholder)
    patio.tsx               (placeholder)
    recebiveis.tsx          (placeholder)
    alertas.tsx             (placeholder)
    configuracoes.tsx       (placeholder)
  components/
    layout/
      AppSidebar.tsx
      Topbar.tsx
      AppShell.tsx
    dashboard/
      StatusBanner.tsx
      KpiCard.tsx
      KpiRow.tsx
      StoreStatusGrid.tsx
      StoreCard.tsx
      AlertsList.tsx
      CashInputCard.tsx
      ConciliationDetailsDialog.tsx
      AlertDetailsSheet.tsx
      StoreDetailsDialog.tsx
    ui/                     (shadcn primitives já existentes)
  lib/
    mock/
      seed.ts               (popula localStorage no primeiro load)
      stores.ts             (10 lojas + status + valores)
      alerts.ts             (3 alertas)
      history.ts            (30 dias de conciliação)
    format.ts               (BRL, datas)
    storage.ts              (helpers localStorage tipados)
```

## Painel Geral — composição

- Título "Painel Geral" + subtítulo "Atualizado hoje às 07:32 · Dados de 13/05/2026"
- Banner de status verde (surface tintada, não bloco vivo): "✓ Conciliação do dia aprovada automaticamente — Resultado: R$ 0,42" + link "Ver detalhes" → abre `ConciliationDetailsDialog`
- KPI Row (4 cards, grid responsivo):
  - Entradas do Dia R$ 84.320,00 (TrendingUp verde)
  - Contas a Pagar R$ 79.840,00 (TrendingDown vermelho)
  - Saldo Consolidado R$ 4.480,00 (neutro)
  - Carros no Pátio 23 OS abertas (Clock âmbar)
- Grid 2×5 de lojas (`StoreStatusGrid` → 10 `StoreCard`s) com badge de status pill colorida; clique abre `StoreDetailsDialog`
- `AlertsList` — 3 itens, dot colorido + texto + timestamp; clique abre `AlertDetailsSheet`
- `CashInputCard` (canto inferior) — 3 inputs (Dom Pedro / Jabaquara / Jorge Bereta), link "+ Ver todas as lojas", botão primário "Salvar valores" → grava em localStorage e dispara toast (sonner)

## Sidebar

- Header: ícone `Car` + "Mecânica Popular" (bold) + "Financeiro" (muted)
- Itens (Lucide): LayoutDashboard, Store (badge "10"), FileText, Car, Receipt, AlertTriangle (badge "3"), Settings
- Item ativo via `useRouterState` + `data-status`
- Footer: avatar placeholder + "Ana Financeiro" / "Analista" + badge "Hoje · 14/05/2026"
- Mobile: vira bottom nav (5 itens principais) via media query

## Mock data (seed em localStorage no primeiro mount)

Chave `mp:seed:v1` evita re-seed. Estruturas:

- `mp:stores` — array das 10 lojas com `{ id, name, status, dailyEntry, note }` conforme valores fornecidos no prompt
- `mp:alerts` — 3 alertas com severidade, loja, OS, descrição, timestamp
- `mp:history` — 30 dias, 4 com divergência
- `mp:cash` — valores salvos pelo Daniel (inicialmente vazio)

## Interações

- Hover em cards/botões: 150ms; cards levantam shadow; botão primário escurece 10%
- Clique em store card → `StoreDetailsDialog` (modal simples mostrando entradas, status, observação)
- Clique em alerta → `AlertDetailsSheet` (drawer lateral com detalhes da OS)
- Banner "Ver detalhes" → `ConciliationDetailsDialog` (resumo do dia)
- Inputs de caixa → salva em `localStorage` + `toast.success("Valores salvos")`

## Notas técnicas

- Tema escuro forçado (não alternável nesta entrega)
- Sem backend; tudo localStorage, lido via hooks `useStores()`, `useAlerts()` que hidratam após mount (evita mismatch SSR)
- Stubs das outras rotas mostram apenas título + "Em construção" para manter navegação funcional
- Sem gradientes, sem borda colorida à esquerda, sem emoji como ícone (apenas Lucide); ✓/⚠/● dentro de badges são caracteres tipográficos aceitáveis conforme o brief

## Fora de escopo (próximos prompts)

Páginas internas reais (Lojas, Conciliação, Pátio, Recebíveis, Alertas, Config), autenticação, integração real, exportações.
