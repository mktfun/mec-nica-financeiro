# Design Técnico: Saldo Anterior OFX (089)

## 1. Supabase (Database Schema)

Precisamos adicionar o novo campo na tabela `reconciliations` e nas definições do TypeScript.

**SQL Migration:**
```sql
ALTER TABLE reconciliations 
ADD COLUMN IF NOT EXISTS previous_balance NUMERIC;
```
*(Nota: o `src/lib/supabase.ts` já possui `previous_balance?: number | null;` no `TransactionRow`, mas precisamos garantir que ele exista no `ReconciliationRow` e criar a coluna no banco)*.

## 2. Lógica do Parser (Frontend)

O arquivo `src/lib/parsers/ofxParser.ts` já detecta `<SALDO ANTERIOR>` e define `previousBalance`. Como esse campo também pode vir com a anomalia de ausência de decimais (padrão Itaú em centavos sem vírgula, ex: `1931431`), precisamos aplicar a **mesma regra do 088** para o saldo anterior:

```typescript
if (rawMemo.toUpperCase().includes('SALDO ANTERIOR')) {
    // Mesma lógica anti-centavos
    let parsedBal = Math.abs(amount);
    const amountStr = amtMatch ? amtMatch[1].trim() : '0';
    const hasDecimalSeparator = amountStr.includes('.') || amountStr.includes(',');
    if (!hasDecimalSeparator && parsedBal > 100) {
      parsedBal = parsedBal / 100;
    }
    previousBalance = parsedBal;
    continue;
}
```

## 3. Hook de Importação (`useTransactions.ts`)

Em `CentralImportWizard.tsx`, precisamos extrair o `ofx.previousBalance` junto do `ofx.bankBalance`:
```typescript
const storePreviousBalances: Record<string, number> = {};
if (ofx.previousBalance !== undefined && store_id) {
    storePreviousBalances[store_id] = ofx.previousBalance;
}
```

Então o Wizard passa esse dicionário para a `useBulkInsertTransactions(payload)`:
No momento do `upsert` em `reconciliations` (linha ~448 de `useTransactions.ts`), incluímos a nova coluna:
```typescript
await supabase.from('reconciliations').upsert({
    store_id: storeId,
    date: targetDate,
    bank_total: bankBalance,
    previous_balance: storePreviousBalances[storeId], // NOVO CAMPO
    status: 'pending'
}, { onConflict: 'store_id, date' });
```

## 4. Reflexo no UI (Conciliação & Dashboard)

O arquivo `ResumoDiaPanel.tsx` atualmente calcula a `caixa_anterior` somando da Snapshot prévia. Se nós usarmos a soma dos `previous_balance` do próprio dia (extraído do banco em tempo real via a tabela de `reconciliations`), eliminamos o "cascade failure".

Para fazer isso sem ferir a arquitetura existente de cache local, podemos exportar `previous_balance` na query `reconciliations` do hook e substituir o valor fallback global:
```typescript
const { data: recs } = useQuery(['recs_today', selectedDate] ...)
const saldoAnteriorOfxGlobal = recs.reduce((acc, r) => acc + (r.previous_balance || 0), 0);
```
Substituindo assim o uso de `previousSnapshot?.caixa_atual`.
