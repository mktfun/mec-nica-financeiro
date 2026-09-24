# Spec Plan — 438: Fix Falso Positivo PIX x OS

## [FRONTEND] StoreExtratoBancarioView.tsx

- [x] **Completed** — Fix 1: Isolar `osFromFitid` da cadeia `effectiveOsNum`. Substituir linha ~157
  `effectiveOsNum = tx.os_number || matched_os_number || historicalMatch?.os_number || historicalMatch?.matched_os_number`
  por
  `effectiveOsNum = tx.os_number || matched_os_number || histByFitid?.os_number || histByFitid?.matched_os_number`
  (preservar `manual_category`/`manual_justification` via `historicalMatch` inalterado)
  **Verificação:** `npm run build` — zero erros TS

## [BACKEND] autoMatchingEngine.ts

- [x] **Completed** — Fix 2: Adicionar guard de CNPJ empresa divergente em `isStrictPixOsMatch`,
  logo antes do `return matchClientTokens(...)` na linha ~204.
  Se `extractDocDigits(fullOfxText)` retornar string de 14 dígitos (CNPJ) e
  `extractDocDigits(os.client_name)` retornar CNPJ diferente → `return false`.
  **Verificação:** `npm run build` — zero erros TS

## [SECURITY/TEST]

- [x] **Completed** — Build final `npm run build` limpo (zero erros TypeScript) — exit code 0 em 7.66s
- [x] **Completed** — Validação do isolamento de OS: `histByFitid` isolado; `histByComposite` bloqueado para propagação de OS
- [x] **Completed** — Guard de CNPJ/CPF divergente e stopwords corporativas implementadas em `autoMatchingEngine.ts`

## [COMPLEMENTARY HARDENING] useConciliacao.ts & autoMatchingEngine.ts

- [x] **Completed** — Fix 3: Em `src/hooks/useConciliacao.ts` (linhas ~640-646), eliminado o fallback cego "Prioridade C: Unicidade de valor na filial" (`candidates.length === 1`), exigindo sempre confirmação de identidade de cliente (`matchClientTokens`).
  **Verificação:** `npm run build` — zero erros TS

- [x] **Completed** — Fix 4: Em `src/lib/matchers/autoMatchingEngine.ts` (linhas ~196-198), eliminado o fallback por `osTotal` em `valueMatches`, exigindo estritamente que o valor do PIX bata com a parcela de PIX registrada na OS (`targetOsVal`), com tolerância $\le 0.05$.
  **Verificação:** `npm run build` — zero erros TS

- [x] **Completed** — Quality Gate: `npm run build` após todas as alterações — exit code 0 em 7.72s
