# Design — Spec 458: Fix Rede × OS Bruto vs Líquido

## Arquitetura de Fluxo

```
Arquivo Rede (XLSX/CSV) → redeParser/redeSalesParser → { grossAmount, netAmount, interest }
→ CentralImportWizard → INSERT pos_transactions(amount=net, gross_amount=gross, fee_amount=fee)
→ match_stage2_rede_os RPC → compara v_pos.gross_amount vs os_import_observations.delta_credit/debit ✅
→ autoMatchingEngine (fallback memória) → BUG: amount = net > 0 ? net : gross
→ Fase2RedeVsOsReview → BUG: monta collisions com c.net_amount, ordena por net_amount
→ CentralImportWizard (unmatched display) → BUG: amount = t.net_amount || t.gross_amount
```

## Interfaces TypeScript Reais

### PendingUnmatchedTransaction (autoMatchingEngine.ts L4-17) — Sem alteração de interface
```typescript
export interface PendingUnmatchedTransaction {
  id: string;
  source: 'rede' | 'ofx_pix' | 'ofx_other';
  storeId: string;
  storeName: string;
  date: string;
  description: string;
  paymentMethod: string;
  amount: number;  // DEVE ser gross, não net
  status: 'pendente' | 'vinculada';
  matchedOsNumber?: string;
  rejectionReason?: string;
  candidateCount?: number;
}
```

### AutoMatchingResult.resolvedMatches[].amount — Sem alteração de interface
```typescript
resolvedMatches: Array<{
  storeId: string;
  osNumber: string;
  sourceId: string;
  type: string;
  amount: number;  // DEVE ser gross, não net
  paymentMethod: string;
  ofxId?: string;
  feeDeducted?: number;
}>;
```

## Diffs Cirúrgicos

### 1. autoMatchingEngine.ts L272
```diff
-        const amount = net > 0 ? net : gross;
+        const amount = gross > 0 ? gross : net;
```

### 2. Fase2RedeVsOsReview.tsx L106
```diff
-             amount: Number(c.net_amount || 0),
+             amount: Number(c.gross_amount || c.net_amount || 0),
```

### 3. Fase2RedeVsOsReview.tsx L131
```diff
-       .order('net_amount', { ascending: false });
+       .order('gross_amount', { ascending: false });
```

### 4. CentralImportWizard.tsx L1145
```diff
-         amount: Math.abs(Number(t.net_amount || t.gross_amount || 0)),
+         amount: Math.abs(Number(t.gross_amount || t.net_amount || 0)),
```

## Cenários

### Happy Path
1. Importação de relatório Rede com venda de R$ 2.327,00 bruto / R$ 2.207,39 líquido.
2. OS tem `delta_credit = 2327.00`.
3. Match automático encontra candidato único e vincula.
4. `amount` no `resolvedMatches` = R$ 2.327,00 (bruto), não R$ 2.207,39.

### Edge Case: Transação sem gross_amount (fallback para net)
1. `grossAmount = 0` (dados corrompidos ou legacy).
2. `netAmount = 500`.
3. `amount = gross > 0 ? gross : net` → `amount = 500` (fallback seguro).

## Critérios de Aceitação Verificáveis
1. `npm run build` passa sem erros TypeScript.
2. `resolvedMatches[].amount` para vendas Rede reflete `grossAmount` (não `netAmount`).
3. Lista de transações não-casadas em Fase2 ordena por `gross_amount`.
4. Transações pendentes em CentralImportWizard exibem valor bruto.
