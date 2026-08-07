# Tasks: 002 Premium Redesign

## Fase 1 — Foundation (CSS + Performance Fix)
- [ ] Reescrever `styles.css` com novo background, glass utilities, page-enter animation, custom scrollbar
- [ ] Remover `AnimatePresence` + `motion.main` do AppShell (causa lentidÁo)
- [ ] Adicionar CSS class `page-enter` para transiçÁo instantânea

## Fase 2 — Layout Completo
- [ ] Reescrever `AppSidebar.tsx` — glass sidebar, active glow indicator, avatar footer
- [ ] Reescrever `AppShell.tsx` — mobile nav com 4 items + Mais drawer, topbar integrada
- [ ] Reescrever `Topbar.tsx` — glass topbar com search bar CMD+K

## Fase 3 — Dashboard Components
- [ ] Reescrever `KpiCard.tsx` — gradient bg, tipografia extrabold, sparkline maior
- [ ] Atualizar `KpiRow.tsx` — passar dados corretos pros cards
- [ ] Reescrever `StatusBanner.tsx` — simplificar, glass panel com accent
- [ ] Reescrever `StoreCard.tsx` — status bar no topo, tipografia bold
- [ ] Atualizar `StoreStatusGrid.tsx` — grid responsivo
- [ ] Reescrever `AlertsList.tsx` — urgência com left border, sem ping animation
- [ ] Reescrever `CashInputCard.tsx` — inputs formatados R$, glass panel, save feedback

## Fase 4 — Páginas Internas
- [ ] Atualizar `conciliacao.tsx` — glass panels para todas as sections/tables
- [ ] Atualizar `alertas.tsx` — glass panels
- [ ] Atualizar `recebiveis.tsx` — glass panels
- [ ] Atualizar `patio.tsx` — glass panels
- [ ] Atualizar `lojas.$storeId.tsx` — glass panels
- [ ] Atualizar `StubPage.tsx` — placeholder premium

## Fase 5 — QA
- [ ] `npm run build` sem erros
- [ ] Testar navegaçÁo entre todas as páginas (instantânea)
- [ ] Commit e push
