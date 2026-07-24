# Design: Correção Definitiva de Chave Estrangeira em Conciliação e Importação (conciliacao-fk-definitive-fix)

## Fluxo Técnico de Recuperação de IDs de Transação

```
  ┌─────────────────────────────────────────────────────────────┐
  │ 1. centralImportWizard (saveTransactions)                  │
  │    - Txs do OFX são upsertadas na tabela transactions      │
  │    - Se fitid já existe no DB, Postgres mantem o ID antigo  │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ 2. CONSULTA DOS ID REAIS DO BANCO DE DADOS                  │
  │    - const { data: dbTxs } = await supabase                 │
  │        .from('transactions')                                │
  │        .select('id, store_id, fitid')                       │
  │        .in('fitid', allFitids);                             │
  │    - fitidToDbIdMap.set(`${store_id}_${fitid}`, dbTx.id)   │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ 3. REMAPEAMENTO E SANITIZAÇÃO DE CONCILIATION_MATCHES        │
  │    - Substitui ofx_transaction_id pelo ID real do DB       │
  │    - Valida contra dbTxIdSet.                               │
  │    - Se ID não existir fisicamente no DB → seta como null │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ 4. GRAVAÇÃO RESILIENTE (insertConciliationMatches)          │
  │    - Tenta gravar no Postgres                               │
  │    - Se houver exceção isolada → loga aviso e prossegue     │
  └─────────────────────────────────────────────────────────────┘
```

## Algoritmo de Remapeamento (`CentralImportWizard.tsx`)

```typescript
// 1. Coletar todos os fitids das transações OFX sendo processadas
const allFitids = Array.from(new Set(
  txsToInsert.map(t => t.fitid).filter(Boolean)
));

const fitidToDbIdMap = new Map<string, string>();

if (allFitids.length > 0) {
  const { data: dbTxs } = await supabase
    .from('transactions')
    .select('id, store_id, fitid')
    .in('fitid', allFitids);

  dbTxs?.forEach(t => {
    if (t.fitid) {
      fitidToDbIdMap.set(`${t.store_id || 'null'}_${t.fitid}`, t.id);
    }
  });
}

// 2. Remapear os IDs sintéticos em matchesToInsert com os IDs reais do banco de dados
const mappedMatches = matchesToInsert.map(m => {
  let realOfxId = m.ofx_transaction_id;
  
  if (m._fitid_key && fitidToDbIdMap.has(m._fitid_key)) {
    realOfxId = fitidToDbIdMap.get(m._fitid_key)!;
  }
  
  return {
    ...m,
    ofx_transaction_id: realOfxId
  };
});

// 3. Trava de Verificação Física no DB
const checkIds = Array.from(new Set(
  mappedMatches.flatMap(m => [m.ofx_transaction_id, m.rede_transaction_id]).filter(Boolean)
));

let validDbIdSet = new Set<string>();

if (checkIds.length > 0) {
  const { data: existingTxs } = await supabase
    .from('transactions')
    .select('id')
    .in('id', checkIds);

  validDbIdSet = new Set(existingTxs?.map(t => t.id) || []);
}

const sanitizedMatches = mappedMatches.map(m => ({
  store_id: m.store_id,
  target_date: m.target_date,
  system_os_number: m.system_os_number,
  ofx_transaction_id: validDbIdSet.has(m.ofx_transaction_id) ? m.ofx_transaction_id : null,
  rede_transaction_id: validDbIdSet.has(m.rede_transaction_id) ? m.rede_transaction_id : null,
  status: m.status || 'perfect_match',
  divergence_amount: m.divergence_amount || 0
}));
```

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Importação Inicial de OFX + OS + Rede):**
  - *Ação:* Importar lote limpo pela primeira vez.
  - *Resultado Esperado:* As transações são inseridas e os matches gravados sem erro de FK.

- **Cenário 2 (Re-importação de OFX já existente no Banco de Dados - Causa do Bug):**
  - *Ação:* Importar o mesmo arquivo OFX duas vezes seguidas ou reimportar lote existente.
  - *Resultado Esperado:* O `upsert` reaproveita os IDs de `transactions` existentes; o remapeador encontra os IDs reais do banco; os matches são gravados com os IDs corretos e **zero erro de Foreign Key constraint**.
