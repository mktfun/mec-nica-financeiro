# Spec 438 — Fix Falso Positivo PIX x OS via historyMap de Valor Composto

## Problema

A tela de conciliação (`/conciliacao`) exibe o PIX de **R$ 5.000,00** recebido de
`HD CENTRO AUTOMOTIVO AUTO MECANICA LTDA` (CNPJ `50.903.911/0001-05`) como vinculado à
**OS #2439** (cliente real: `EDINEIA TEIXEIRA BRITO`). O banco confirma que
`ofx_transactions.matched_os_number = null` — o vínculo existe **apenas na camada de
enriquecimento do frontend**, não no banco.

### Causa-Raiz Confirmada (3 camadas)

**Camada 1 — `StoreExtratoBancarioView.tsx` — historyMap com chave composta fraca (linha ~140-142)**

```typescript
// PROBLEMA: chave por valor + título — colide em qualquer PIX com mesmo valor
const compositeKey = `${Math.abs(Number(tx.amount || 0))}_${tx.title || ''}`.toLowerCase();
historyMap.set(compositeKey, h);
```

O `historicalReconciled` traz reconciliações de dias passados. Quando existe uma
reconciliação histórica de OS #2439 (R$ 5.000,00 PIX) e chega um novo PIX de R$ 5.000,00
(mesmo valor, título similar), a chave composta `5000_recebimentos...` colide e herda o
`matched_os_number` indevidamente, mesmo que o FITID seja completamente diferente.

**Camada 2 — `effectiveOsNum` na linha ~157 propaga OS herdado de `histByComposite`**

```typescript
const effectiveOsNum = tx.os_number || (tx as any).matched_os_number
  || historicalMatch?.os_number || historicalMatch?.matched_os_number;
// historicalMatch pode ser histByComposite (= match FALSO por valor+título)
```

**Camada 3 — `autoMatchingEngine.ts / isStrictPixOsMatch` sem guarda de CNPJ empresa divergente**

Se o `matchClientTokens` casasse tokens fracos entre `EDINEIA` e `HD CENTRO`, o match
seria persistido. Atualmente o banco mostra `matched_os_number = null`, portanto o motor
de importação NÃO persistiu o match — mas a guarda de CNPJ divergente está ausente como
proteção de segunda camada.

### Dados Forenses (banco ST-08, 24/09/2026)

| Campo | OS #2439 | OFX HD CENTRO |
|---|---|---|
| `client_name` | EDINEIA TEIXEIRA BRITO | — |
| `pix_transfer_value` | R$ 5.000,00 | — |
| `counterpart_name` | — | RECEBIMENTOS HD CENTRO AUTOMOTIVO AUTO MECANICA LTDA |
| `cnpj_cpf` | — | `50.903.911/0001-05` |
| `matched_os_number` (banco) | UNMATCHED | null |

**O vínculo existe APENAS no frontend via `histByComposite`, não está persistido no banco.**

---

## Solução Proposta

### Fix 1 — `StoreExtratoBancarioView.tsx`
Remover propagação de `os_number`/`matched_os_number` via `histByComposite`.
Herança de OS permitida **somente via `histByFitid`** (FITID exato).
Herança de `manual_category` e `manual_justification` continua via qualquer `historicalMatch`.

### Fix 2 — `autoMatchingEngine.ts / isStrictPixOsMatch`
Adicionar guarda de CNPJ/empresa divergente: se o remetente for CNPJ de 14 dígitos,
o CNPJ deve coincidir com o cliente da OS ou passar `matchClientTokens` com margem
muito alta. Se o CNPJ do remetente for explicitamente diferente do da OS → `return false`.

---

## Skills Aplicadas

- `backend-patterns` — validação de identidade, motor de matching
- `database` — inspeção forense de `ofx_transactions` e `patio_os`

---

## Arquivos Afetados

### Existentes Modificados
| Arquivo | Tipo de Mudança |
|---|---|
| `src/components/conciliacao/StoreExtratoBancarioView.tsx` | Fix cirúrgico linhas ~140-160 |
| `src/lib/matchers/autoMatchingEngine.ts` | Fix cirúrgico função `isStrictPixOsMatch` |

### Novos
Nenhum.

### DDL / Migrations
Nenhuma. Zero mutations no banco.

---

## Plano de Rollback

Git revert cirúrgico dos 2 arquivos. Nenhuma mutation de banco envolvida.
Rollback seguro em < 2 min: `git revert HEAD`.

---

## Risco Principal

**Risco:** Remover `histByComposite` como fonte de OS pode quebrar exibição de matches
legítimos que foram reimportados (FITID regenerado).

**Mitigação:**
- Fix 1 só bloqueia herança de `os_number`. `manual_category`/`manual_justification`
  continuam herdadas via `histByComposite` (comportamento preservado).
- Matches legítimos persistidos no banco têm `ofx_transactions.matched_os_number` preenchido
  — esses são capturados diretamente pelo `(tx as any).matched_os_number`, não precisam do fallback histórico.
