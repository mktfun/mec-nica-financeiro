# Design: Correção de `occurred_at` em `pos_transactions` e Blindagem de Contratos na Esteira Manual (363)

## Arquitetura e Fluxo de Dados

```mermaid
sequenceDiagram
    autonumber
    actor Operador
    participant F2 as Fase2RedeVsOsReview (UI)
    participant Parser as redeParser (Parser)
    participant Hash as hashUtils (Deduplicação)
    participant DB as Supabase PostgreSQL
    participant RPC as match_stage2_rede_os (RPC)

    Operador->>F2: Dropa planilha(s) da Rede (XLSX/CSV)
    F2->>Parser: parseCentralImports(acceptedFiles)
    Parser--F2: Retorna RedeResult com transactions[]
    F2->>Hash: generateDeterministicHash(date, amount, entropy, 'pos')
    Note over F2: Monta payload com occurred_at (TIMESTAMPTZ),<br/>fee_amount (interest), transaction_type ('venda'|'devolucao'),<br/>dedup_hash e store_id higienizado
    Note over F2: Deduplica em memória via Map<storeId_dedupHash, payload>
    F2->>DB: supabase.from('pos_transactions').upsert(txs, { onConflict: 'store_id,dedup_hash', ignoreDuplicates: true })
    DB-->>F2: 200 OK (Sem erro 23502 e sem duplicidade)
    F2->>RPC: supabase.rpc('match_stage2_rede_os', { p_target_date: targetDate })
    RPC-->>F2: { success: true, matched_count, collisions, metrics }
    F2-->>Operador: Exibe vendas casadas com OS vs sobras da Rede
```

---

## Interfaces TypeScript

```typescript
// Payload completo de inserção em pos_transactions
export interface PosTransactionInsertPayload {
  id?: string;
  store_id: string | null;
  target_date: string;
  gross_amount: number;
  net_amount: number;
  fee_amount: number;
  payment_method: string;
  machine_name: string;
  settlement_status: 'a_compensar' | 'entrou' | 'cancelada';
  occurred_at: string;
  dedup_hash: string;
  transaction_type: 'venda' | 'devolucao';
}

// Payload completo de inserção em ofx_transactions
export interface OfxTransactionInsertPayload {
  id?: string;
  store_id: string | null;
  target_date: string;
  bank_name: string;
  amount: number;
  type: 'in' | 'out';
  counterpart_name: string | null;
  cnpj_cpf: string | null;
  fitid: string;
  occurred_at: string;
  contabilizar_no_subtotal: boolean;
}

// Payload completo de inserção em daily_manual_bills
export interface DailyManualBillInsertPayload {
  store_id: string | null;
  date: string;
  due_date: string;
  amount: number;
  title: string;
  category: string;
  contabilizar_no_subtotal: boolean;
}
```

---

## Mutações em Arquivos Existentes [MODIFY]

### 1. `src/components/importacoes/manual/Fase2RedeVsOsReview.tsx` [MODIFY]
- **Import:** Adicionar `import { generateDeterministicHash } from '@/lib/parsers/hashUtils';`
- **Mapeamento de Data/Hora:**
  ```typescript
  const baseDate = t.date && /^\d{4}-\d{2}-\d{2}$/.test(t.date) ? t.date : targetDate;
  let occurredAt: string;
  if (t.time && /^\d{1,2}:\d{2}(:\d{2})?$/.test(t.time.trim())) {
    const parts = t.time.trim().split(':');
    const hh = parts[0].padStart(2, '0');
    const mm = parts[1].padStart(2, '0');
    const ss = (parts[2] || '00').padStart(2, '0');
    occurredAt = `${baseDate}T${hh}:${mm}:${ss}Z`;
  } else {
    occurredAt = `${baseDate}T12:00:00Z`;
  }
  ```
- **Taxa MDR:** `fee_amount: Math.abs(t.interest || 0)`
- **Deduplicação & Hash:**
  ```typescript
  const uniqueEntropy = t.nsu
    ? `nsu_${t.nsu}${t.authorization ? `_auth_${t.authorization}` : ''}`
    : (t.authorization
        ? `auth_${t.authorization}${t.tid ? `_tid_${t.tid}` : ''}`
        : (t.tid
            ? `tid_${t.tid}`
            : `${t.method || 'rede'}_${t.time || ''}_${idx}`));

  const dedupHash = generateDeterministicHash(
    baseDate,
    t.netAmount || 0,
    `${resolvedStoreId}_${uniqueEntropy}`,
    'pos'
  );
  ```
- **Upsert Idempotente:**
  Substituir `.insert(txsToInsert)` por `.upsert(txsToInsert, { onConflict: 'store_id, dedup_hash', ignoreDuplicates: true })`.

### 2. `src/components/importacoes/manual/Fase3OfxReconciliation.tsx` [MODIFY]
- **Import:** Adicionar `import { generateDeterministicHash } from '@/lib/parsers/hashUtils';`
- **Mapeamento do Objeto:**
  - `bank_name: bankName` (extraído de `r.alias?.split(' - ')[0]?.trim() || 'Itaú'`)
  - `occurred_at: `${baseDate}T12:00:00Z``
  - `counterpart_name: t.counterpart_name || t.title || 'Lançamento OFX'` (substitui `description`)
  - `type: (t.type === 'in' || t.amount > 0) ? 'in' : 'out'`
  - `fitid: t.fitid || generateDeterministicHash(baseDate, Math.abs(t.amount || 0), t.title || 'ofx', 'ofx')`
- **Upsert Idempotente:**
  Substituir `.insert(txsToInsert)` por `.upsert(txsToInsert, { onConflict: 'store_id, fitid', ignoreDuplicates: true })`.
- **Correção em `loadOfxData`:**
  Substituir colunas inexistentes `t.description` e `t.date` por `counterpart_name` e `occurred_at`.

### 3. `src/components/importacoes/manual/Fase4ContasVsSaidasReview.tsx` [MODIFY]
- **Mapeamento de `title`:**
  `title: b.description || b.title || 'Título a Pagar'` (atende a constraint `title NOT NULL`).
- **Remoção de propriedade inexistente:**
  Remover `status: 'pendente'` (a tabela física usa `match_status` e `contabilizar_no_subtotal`).
- **Ajuste em `loadData`:**
  Substituir colunas inexistentes `t.description` e `t.title` por `t.counterpart_name || t.bank_name || 'Débito Bancário'`.
- **Parâmetro da RPC `auto_match_saidas`:**
  Corrigir de `{ p_target_date: targetDate }` para `{ p_date: targetDate }`.
- **Sanitização de `store_id`:**
  Substituir `'st-default'` por `null`.

---

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Upload e Re-upload de Relatório da Rede na Fase 2
- **SCAN:** O operador solta uma planilha de vendas da Rede contendo 10 lançamentos. Em seguida, solta o mesmo arquivo novamente.
- **INFER:** O código deve calcular `occurred_at` válido em formato ISO UTC, gerar `dedup_hash` com entropia única e gravar via `.upsert()`. No segundo upload, o `onConflict` ignora duplicatas sem disparar erro 23502 nem 23505.
- **VERIFY:** A tabela `pos_transactions` possui exatamente 10 registros para a data (não 20), todos com `occurred_at` não nulo, e a RPC `match_stage2_rede_os` executa o pré-matching perfeitamente.

### Cenário 2: Upload de Extrato OFX na Fase 3
- **SCAN:** O operador avança para a Fase 3 e solta os arquivos OFX do dia.
- **INFER:** O código deve mapear `bank_name` ('Itaú'), `occurred_at` e `counterpart_name`, salvando com `.upsert(..., { onConflict: 'store_id, fitid' })`.
- **VERIFY:** Nenhuma violação de NOT NULL em `bank_name` ou `occurred_at`, e o agrupamento de créditos da Rede vs vendas da Rede calcula com precisão o saldo "A Compensar".
