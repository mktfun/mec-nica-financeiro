# Spec Plan: Uniformização Visual da Tela de Conciliação (conciliacao-design-system-fix)

## Tasks

- [x] [FRONTEND] Refatorar `src/components/conciliacao/RedeVsOfxTable.tsx`:
  - [x] Substituir `bg-[#050711]` / `border-zinc-*` / `text-zinc-*` / `text-sky-*` / `text-emerald-*` pelos tokens CSS do design system
  - [x] Cards superiores usando `<Card variant="elevated">` nativo
  - [x] Cards de depósito agrupado usando `<Card variant="elevated">` com header `bg-[var(--bg-surface)]`
  - [x] Badges usando `<Badge variant="success/warning/danger">` sem className de cor custom
- [x] [FRONTEND] Refatorar `src/components/conciliacao/PixVsOfxTable.tsx`:
  - [x] Substituir todas as cores hardcoded pelos tokens CSS do design system
  - [x] Cards de PIX usando `<Card variant="elevated">`
- [x] [FRONTEND] Refatorar `src/components/conciliacao/OsVsRedeTable.tsx`:
  - [x] Header da tabela e thead usando `bg-[var(--bg-surface)]` e `bg-[var(--bg-canvas)]`
  - [x] Todas as cores de texto usando `var(--text-*)`
  - [x] Badges usando `<Badge variant="*">` sem cores custom
- [x] [FRONTEND] Refatorar `src/components/conciliacao/OsDetailModal.tsx`:
  - [x] Limpar todos os `zinc-*` hardcoded
  - [x] Usar tokens do design system para todos os elementos
- [x] [TEST] Verificar compilação com `npm run build` — ✅ 0 erros (45.24s Client + 4.27s SSR)
