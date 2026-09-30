# Spec Plan — 458: Fix Rede × OS Bruto vs Líquido

## [FRONTEND] Correções de Valor no Motor de Match e UI

- [x] **Task 1:** `autoMatchingEngine.ts` L272 — Inverter prioridade de `amount` de `net > 0 ? net : gross` para `gross > 0 ? gross : net`.
  - Skill: `backend-patterns`
  - Verificação: `npm run build`

- [x] **Task 2:** `Fase2RedeVsOsReview.tsx` L106 — Trocar `c.net_amount` para `c.gross_amount || c.net_amount` no mapeamento de colisões.
  - Skill: `frontend-design-pro`
  - Verificação: `npm run build`

- [x] **Task 3:** `Fase2RedeVsOsReview.tsx` L131 — Trocar `.order('net_amount', ...)` para `.order('gross_amount', ...)`.
  - Skill: `frontend-design-pro`
  - Verificação: `npm run build`

- [x] **Task 4:** `CentralImportWizard.tsx` L1145 — Trocar fallback de `t.net_amount || t.gross_amount` para `t.gross_amount || t.net_amount`.
  - Skill: `frontend-design-pro`
  - Verificação: `npm run build`

## [TEST] Verificação Final

- [x] **Task 5:** Executar `npm run build` — zero erros TypeScript.
  - Verificação: Exit code 0
