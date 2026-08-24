# Proposal: Previsto = Total Entradas OFX, Diferença = Pendentes Não Justificados + Correção do Auto-Match de PIX (Spec 275)

## Problema

### Bug 1 — Previsto e Diferença por Loja na Conciliação são calculados errado
Na tela principal de conciliação, a coluna `Previsto` e a `Diferença` por filial não refletiam a realidade operacional:
- O `previsto_ofx` da RPC era a **soma bruta de todas as entradas OFX**, sem separar o que já estava justificado.
- A `diferenca` era calculada como `previsto_ofx - (pix + maquininha)`, sendo que o `pix` capturado era qualquer entrada PIX — **incluindo rendimentos de aplicação automática e transações avulsas não identificadas**.

**O usuário precisa:**
- `Previsto` da filial = **Total de todas as entradas bancárias OFX da loja no dia**.
- `Diferença` da filial = **Saldo das entradas que NÃO estão justificadas** (nem vinculadas à OS, nem liquidadas por cartão/Rede, nem justificadas manualmente) — ou seja, o que precisa de ação humana.

---

### Bug 2 — Auto-Match de PIX vincula qualquer centavo a uma OS (CRÍTICO)

O algoritmo de auto-match em `CentralImportWizard.tsx` (linhas 721–747) tenta casar entradas OFX com OSs pelo valor. O critério atual é:

```js
const pixVal = os.pix_transfer_value || delta;
return Math.abs(pixVal - tx.amount) < 1.0;
```

**O problema em cascata:**
1. Quando `pix_transfer_value = 0` e `delta_paid = 0` (OS recém-aberta sem pagamento), então `pixVal = 0`.
2. Qualquer entrada OFX com valor `< R$ 1,00` (como rendimentos de CDB, aplicação automática — `REND PAGO APLIC AUT`, juros, etc.) tem `|0 - 0,02| = 0,02 < 1,0` → **match automático indevido**.
3. Resultado: Um rendimento de R$ 0,02 do Itaú fica vinculado à OS #4385 como "PIX de cliente", completamente errado.

**Regras que o match de PIX DEVE seguir para ser legítimo:**
1. `tx.amount > 10.0` — Nenhum cliente paga uma OS em maquininha/automotivo por menos de R$ 10,00.
2. A transação OFX deve ter `title` ou `counterpart_name` com indicadores de PIX real: `PIX`, `TED`, `DOC`, `TRANSF` — e NÃO pode ter `REND`, `APLIC`, `RESG`, `CDB`, `JUROS`, `IOF`.
3. `pixVal > 0` — Só tenta casar OSs que TÊM valor de PIX registrado (`pix_transfer_value > 0 OR delta_paid > 0`).
4. Tolerância de match reduzida para `< 0.10` (dez centavos) em vez de `< 1,00` (um real).

---

## Solução Proposta

### Parte 1 — Backend: Recalcular `previsto_ofx` e `diferenca` por loja na RPC

Criar migração SQL `20260824000007_fix_store_previsto_and_unjustified_diff.sql` que atualiza o CTE `prev_store` e o cálculo de `diferenca` na RPC `get_daily_reconciliation_summary`:

```
previsto_ofx (por loja) = SUM(amount) WHERE type = 'in'  [total bruto do dia]

rede_in (por loja)    = SUM(amount) WHERE tipo é adquirente/Rede/cartão
pix_os_in (por loja)  = SUM(amount) WHERE matched_os_number IS NOT NULL e NÃO é adquirente
justificado (por loja)= SUM(amount) WHERE manual_category IS NOT NULL e NÃO vinculado a OS e NÃO é adquirente

diferenca = previsto_ofx - (rede_in + pix_os_in + justificado)
status    = 'conciliado' se |diferenca| <= 0.05 else 'divergente'
```

Critérios de classificação como adquirente/Rede (idêntico ao frontend):
- `counterpart_name ILIKE '%REDE%'` OU `ILIKE '%CIELO%'` OU `ILIKE '%GETNET%'` OU `ILIKE '%STONE%'` OU `ILIKE '%REDECARD%'` OU `ILIKE '%MASTERCARD%'` OU `ILIKE '%VISA%'` OU `ILIKE '%ELO%'` OU `ILIKE '%PAGSEGURO%'`

### Parte 2 — Frontend: Corrigir Auto-Match de PIX em CentralImportWizard.tsx

Adicionar guards no bloco de auto-match (linhas ~721-748) **antes** de tentar casar qualquer entrada OFX com uma OS:

```
GUARD 1: tx.amount < 10.0 → SKIP (não é pagamento de OS)
GUARD 2: título/contraparte indica rendimento → SKIP
  - Detectar: REND, APLIC, RESG, RESGATE, CDB, LCA, LCI, TESOURO, JUROS, IOF, AUT APR
GUARD 3: pixVal <= 0 → SKIP (OS não tem valor de PIX registrado, não tentar casar)
GUARD 4: tolerância de |pixVal - tx.amount| < 0.10 (não 1.00)
```

### Parte 3 — Frontend: Garantir Harmonização StoreExtratoBancarioView ↔ Conciliação
A visão detalhada da filial já mostra os 4 cards corretos — garantir que a `isRedeTx()` do componente seja a mesma lógica do backend para não haver divergência de classificação.

---

## Contratos de Dados

- **`ofx_transactions`**: Campos usados: `store_id`, `amount`, `type`, `target_date`, `matched_os_number`, `manual_category`, `counterpart_name`
- **RPC `get_daily_reconciliation_summary`**: Campo `stores[]` retorna por filial: `previsto_ofx`, `maquininha`, `pix_os`, `justificado`, `diferenca`, `status`
- **`CentralImportWizard.tsx`**: Atualização local nos guards do bloco `autoMatchMap`

## API / Interface
- **`get_daily_reconciliation_summary`** (Supabase RPC): campo `stores[].diferenca` passa a refletir o pendente real por loja
- **`ConciliacaoPage` (`conciliacao.index.tsx`)**: Renderiza `log.previsto_ofx` e `log.diferenca` sem transformação adicional

## Features Existentes Impactadas
- `ResumoDiaPanel.tsx`: Totaliza `previsto_ofx` somando todas as lojas — continua funcional
- `StoreExtratoBancarioView.tsx`: Usa lógica client-side para os 4 cards — garantir harmonia com a lógica do backend
- `useJustifiedTransactions.ts`: Fonte dos dados de `justificado` por loja — pode ser consultado como fonte de verdade para cross-check

## Risco Principal
**Regressão de dados históricos**: Se uma conciliação anterior tinha PIX com match indevido (`REND PAGO APLIC AUT`), a diferença dessa data vai aumentar retroativamente. Mitigação: a migração só altera a **função de cálculo** (RPC) — os dados brutos em `ofx_transactions` não são alterados. Transações antigas já justificadas manualmente permanecerão justificadas.

**Anti-padrão eliminado:** Nunca mais usar `pix_transfer_value || delta` como valor de PIX esperado quando ambos podem ser zero — isso garante match com qualquer centavo avulso.
