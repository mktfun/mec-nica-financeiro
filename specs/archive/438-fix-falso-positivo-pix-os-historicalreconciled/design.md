# Design — Spec 438

## Arquitetura do Fix

```
OFX Importado → ofx_transactions (banco) → StoreExtratoBancarioView
                    matched_os_number = null             ↓
                                              historicalReconciled (query)
                                                    ↓
                                         historyMap (em memória)
                                           ├─ histByFitid   ← ✅ ÚNICO CAMINHO SEGURO para OS
                                           └─ histByComposite ← ⚠️ BLOQUEADO para OS (Fix 1)
                                                    ↓
                                         effectiveOsNum (linha ~157)
                                           tx.matched_os_number  ← banco = null
                                           || osFromFitid          ← FITID exato (seguro)
                                           [REMOVIDO: histByComposite→os_number]
```

## Interfaces TypeScript (Existentes — sem alteração)

```typescript
// StoreExtratoBancarioView.tsx — sem novas interfaces
// autoMatchingEngine.ts — isStrictPixOsMatch já exportada, apenas add guard interno
export function isStrictPixOsMatch(
  txAmount: number,
  fullOfxText: string,
  os: any,
  tolerance: number = 0.05
): boolean
```

## Fix 1 — `StoreExtratoBancarioView.tsx` (diff cirúrgico)

**Antes (linhas ~155-157):**
```typescript
const historicalMatch = histByFitid || histByComposite;
// ...
const effectiveOsNum = tx.os_number || (tx as any).matched_os_number
  || historicalMatch?.os_number || historicalMatch?.matched_os_number;
```

**Depois:**
```typescript
const historicalMatch = histByFitid || histByComposite;
// OS herdada SOMENTE via FITID exato. histByComposite nunca propaga vínculo de OS.
const osFromFitid = histByFitid?.os_number || histByFitid?.matched_os_number;
const effectiveOsNum = tx.os_number || (tx as any).matched_os_number || osFromFitid;
```

**Herança preservada via `historicalMatch` (sem mudança):**
```typescript
const effectiveCategory = tx.manual_category || historicalMatch?.manual_category;
const effectiveJustification = tx.manual_justification || historicalMatch?.manual_justification;
```

## Fix 2 — `autoMatchingEngine.ts` (diff cirúrgico em `isStrictPixOsMatch`)

Inserir guard **ANTES** da chamada `matchClientTokens` (linha ~204), como 4.1:

```typescript
// 4. Identidade do Cliente DEVE ter correspondência
// 4.1 Guard: se remetente for CNPJ e diverge do CNPJ da OS → rejeitar
const txCnpj = extractDocDigits(fullOfxText);
const osCnpj = extractDocDigits(os.client_name);
if (txCnpj && txCnpj.length === 14) {
  // Remetente é empresa (CNPJ 14 dígitos)
  if (osCnpj && txCnpj.length === 14 && osCnpj !== txCnpj) {
    return false; // CNPJ empresa remetente ≠ CNPJ empresa cliente da OS
  }
}
return matchClientTokens(os.client_name, fullOfxText);
```

---

## Happy Path

1. PIX de `JÁSLIO CÉZAR PEREIRA` (CPF `xxx`) para OS #2447 com `pix_transfer_value = 2119.13`
2. `isStrictPixOsMatch`: passa filtro negativo, OS tem PIX, valor bate (delta ≤ 0,05), `matchClientTokens("JÁSLIO CÉZAR", "PIX QRS JASLIO CEZAR...")` → `true`
3. Fix 2: `txCnpj = null` (CPF, não CNPJ 14 dígitos) → guard não ativa → `matchClientTokens` decide
4. Banco: `matched_os_number = '2447'` persistido ✅
5. UI: `histByFitid` encontra reconciliação histórica com FITID exato, `osFromFitid = '2447'` exibido ✅

## Edge Case

1. PIX de `HD CENTRO AUTOMOTIVO` (CNPJ 14 dígitos) vs OS #2439 (cliente: `EDINEIA TEIXEIRA BRITO`)
2. `isStrictPixOsMatch`: Fix 2 extrai CNPJ do texto → `50903911000105` (14 dígitos)
   - `osCnpj = null` (EDINEIA é PF, sem CNPJ no client_name)
   - CNPJ 14 dígitos no remetente + `osCnpj = null` → cai em `matchClientTokens("EDINEIA TEIXEIRA BRITO", "RECEBIMENTOS HD CENTRO AUTOMOTIVO AUTO MECANICA LTDA")` → `false` (zero tokens comuns)
   - `return false` → match não persistido ✅
3. UI: `(tx as any).matched_os_number = null` (banco), `osFromFitid = undefined` (FITID diferente de qualquer histórico OS) → `effectiveOsNum = undefined` → sem badge de OS ✅

---

## Critérios de Aceitação

- [ ] Build TypeScript passa sem erros (`npm run build`)
- [ ] OFX de `HD CENTRO AUTOMOTIVO` com R$ 5.000,00 não exibe badge de OS na conciliação
- [ ] OFX de `JÁSLIO CÉZAR` com R$ 2.119,13 continua exibindo OS #2447 corretamente
- [ ] `manual_category` e `manual_justification` ainda são herdadas via `histByComposite`
- [ ] `isStrictPixOsMatch` retorna `false` para CNPJ de empresa divergente do cliente da OS
