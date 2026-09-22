# Spec Plan: Auto-Matching Engine Resiliency

- [x] **1.** Editar `src/lib/matchers/autoMatchingEngine.ts`.
  - [x] **1.1.** Modificar `matchClientTokens` para incluir um fallback para `clientTokens.length === 0` (onde strings como `"HD"` são salvas se `normCounter.includes(normClient)`).
  - [x] **1.2.** Adicionar `Tier 1.5: Partial Payment Match` no ciclo de OFX, permitindo que pagamentos parciais (`txAmount <= osTotal`) casem com a OS se houver match forte de nome.
  - [x] **1.3.** Relaxar o bloqueio de `'Boleto'` no Tier 2 para permitir que transferências Intercompany e SISPAG com valor exato entrem via match de recebível.
- [x] **2.** Executar Typecheck / Build local (`npm run typecheck`).
- [x] **3.** Hard Stop para aguardar o `/sdd-apply`.
