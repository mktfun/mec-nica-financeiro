# Spec Plan: PadronizaçÁo Tipográfica Global (font-standardization-modern)

## Tasks

- [ ] [FRONTEND] Importar Google Fonts (**Inter** e **DM Sans**) e redefinir variáveis tipográficas em `src/styles.css`:
  - [ ] Importar Google Fonts `@import url(...)`.
  - [ ] Mapear `--font-body`, `--font-sans`, `--font-mono` para `"Inter", sans-serif` com `tabular-nums`.
  - [ ] Mapear `--font-display` para `"DM Sans", "Inter", sans-serif`.
- [ ] [FRONTEND] Padronizar classes tipográficas nos componentes de conciliaçÁo:
  - [ ] `src/components/conciliacao/ResumoDiaPanel.tsx`
  - [ ] `src/routes/conciliacao.index.tsx`
  - [ ] `src/components/conciliacao/Modulo1SaldoPanel.tsx`
  - [ ] `src/components/conciliacao/ConciliacaoAlertsSection.tsx`
- [ ] [TEST] Verificar compilaçÁo limpa com `npm run build`.
