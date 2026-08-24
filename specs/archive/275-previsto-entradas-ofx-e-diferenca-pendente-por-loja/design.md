# Design: Previsto = Total Entradas OFX, Diferença = Pendentes Não Justificados + Correção do Auto-Match de PIX (Spec 275)

## Diagrama de Fluxo Ponta a Ponta

```
┌─────────────────────────────────────────────────────────────────────────┐
│ IMPORTAÇÃO OFX (CentralImportWizard.tsx)                                │
│                                                                         │
│  Para cada tx OFX tipo 'in':                                            │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │ Guard 1: tx.amount < 10.00 → NÃO TENTA MATCH                   │   │
│   │ Guard 2: título indica rendimento/aplicação → NÃO TENTA MATCH   │   │
│   │          (REND, APLIC, RESG, CDB, LCA, LCI, JUROS, IOF)        │   │
│   │ Guard 3: pixVal <= 0 → NÃO TENTA MATCH (OS sem PIX registrado) │   │
│   │ Guard 4: |pixVal - tx.amount| < 0.10 → MATCH APROVADO          │   │
│   └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Grava em ofx_transactions
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ RPC get_daily_reconciliation_summary (BACKEND)                          │
│                                                                         │
│  Para cada filial:                                                      │
│   previsto_ofx = SUM(amount) WHERE type='in' (todas as entradas)        │
│                                                                         │
│   rede_in = SUM(amount) WHERE type='in'                                 │
│               AND (counterpart ILIKE '%REDE%' OR '%CIELO%' OR...)       │
│                                                                         │
│   pix_os_in = SUM(amount) WHERE type='in'                               │
│               AND matched_os_number IS NOT NULL                         │
│               AND (NOT rede)                                            │
│                                                                         │
│   justificado = SUM(amount) WHERE type='in'                             │
│               AND manual_category IS NOT NULL                           │
│               AND matched_os_number IS NULL                             │
│               AND (NOT rede)                                            │
│                                                                         │
│   diferenca = previsto_ofx - (rede_in + pix_os_in + justificado)        │
│   status = 'conciliado' se |diferenca| <= 0.05                          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ stores[] → frontend
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ conciliacao.index.tsx — Card por Filial                                 │
│                                                                         │
│   [Previsto] = log.previsto_ofx (Total Entradas)                        │
│   [Diferença] = log.diferenca (Pendente sem justificativa)              │
│   [Status] = verde ✅ se conciliado, vermelho ⚠️ se divergente           │
└─────────────────────────────────────────────────────────────────────────┘
```

## Raiz do Bug de Auto-Match (Diagnóstico Cirúrgico)

**Arquivo:** [`CentralImportWizard.tsx`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/importacoes/CentralImportWizard.tsx) linhas 720–748

**Código problemático atual:**
```js
const matchedOs = autoMatchMap[matched_store_id].find(os => {
  const delta = (os as any).delta_paid !== undefined ? (os as any).delta_paid : os.paid_value;
  const pixVal = os.pix_transfer_value || delta;     // ← BUG: pixVal = 0 quando ambos são 0
  return Math.abs(pixVal - tx.amount) < 1.0;         // ← BUG: 1.00 de tolerância é amplo demais
});
```

**Cenário de falha (REND PAGO APLIC AUT — R$ 0,02):**
1. `os.pix_transfer_value = 0`, `os.delta_paid = 0` → `pixVal = 0`
2. `tx.amount = 0.02` (rendimento de aplicação automática)
3. `Math.abs(0 - 0.02) = 0.02 < 1.0` → ✅ **MATCH INDEVIDO!**

**Código corrigido:**
```js
// GUARD 1: valor mínimo realista de pagamento de cliente
if (tx.amount < 10.0) return; // skip

// GUARD 2: filtro de rendimentos/aplicações financeiras
const isRendimento = /REND|APLIC|RESG|CDB|LCA|LCI|TESOURO|JUROS|IOF|AUT APR/i
  .test(`${tx.title || ''} ${tx.counterpart_name || ''}`);
if (isRendimento) return; // skip

const matchedOs = autoMatchMap[matched_store_id].find(os => {
  const delta = (os as any).delta_paid !== undefined ? (os as any).delta_paid : os.paid_value;
  const pixVal = os.pix_transfer_value > 0 ? os.pix_transfer_value : delta;
  if (pixVal <= 0) return false;                     // GUARD 3: sem PIX esperado na OS
  return Math.abs(pixVal - tx.amount) < 0.10;        // GUARD 4: tolerância 10 centavos
});
```

## Componentes / Hooks / Funções Modificados

| Artefato | Localização | Modificação |
|---|---|---|
| `get_daily_reconciliation_summary` | `supabase/migrations/20260824000007_*.sql` | Nova fórmula de `previsto_ofx` e `diferenca` por filial |
| `CentralImportWizard.tsx` | `src/components/importacoes/` | Guards no bloco de auto-match de PIX (linhas 720–748) |
| `StoreExtratoBancarioView.tsx` | `src/components/conciliacao/` | Harmonizar `isRedeTx()` com critérios do backend |

## Cenários de Verificação

- **Cenário 1 (Rendimento de R$ 0,02):**
  - Estado: importação OFX contendo `REND PAGO APLIC AUT` + R$ 0,02 do Itaú
  - Ação: rodar importação
  - Resultado esperado: `matched_os_number = null`, badge "NÃO IDENTIFICADO", NÃO aparece como "OS Vinculada"

- **Cenário 2 (PIX real de R$ 850,70 de cliente):**
  - Estado: OS #1234 tem `pix_transfer_value = 850.70`, entrada OFX de R$ 850,70
  - Ação: rodar importação
  - Resultado esperado: `matched_os_number = '1234'`, badge "OS #1234 Vinculada"

- **Cenário 3 (Diferença por Loja — Rei do Módulo):**
  - Estado: Entrada de R$ 200 (PIX avulso não vinculado), Rede = R$ 21.037,43
  - Resultado esperado: `previsto_ofx = 21.237,43`, `diferenca = 200.00`, `status = 'divergente'`

- **Cenário 4 (Loja 100% conciliada — Jabaquara):**
  - Estado: Rede = R$ 3.116,00, sem PIX avulso
  - Resultado esperado: `previsto_ofx = 3.116,00`, `diferenca = 0.00`, `status = 'conciliado'`
