# Design Técnico: Correção do Somatório de Restante na OS (Spec 236)

## 1. Arquitetura de Sincronização do Pátio (OSs)

### 1.1 Processamento Fiel da Coluna 'Restante na OS'

No parser `useOsImportProcessor.ts`:
```ts
const totalVal = Number(row[colMap.totalValue] || 0);
const paidVal = Number(row[colMap.paidValue] || 0);
const openVal = colMap.openValue !== undefined ? Number(row[colMap.openValue] || 0) : 0;

// O Restante na OS oficial do relatório tem precedência absoluta
const restanteNaOs = openVal > 0 ? openVal : Math.max(0, totalVal - paidVal);
```

### 1.2 Atualização em `savePatioOsAndReceivables` (`useImportProcessor.ts`)

Quando importamos o lote de OSs de uma loja (`storeId`):
1. Fazemos o upsert das OSs que vieram no arquivo.
2. Identificamos as OSs existentes no banco para aquela `storeId` que **não estão no arquivo importado** e atualizamos seu status para `'finalizado'` (ou `paid_value = total_value`), garantindo que o saldo restante no pátio ativo daquela loja reflita 100% o novo arquivo.

```ts
const importedOsNumbers = new Set(osArray.map(o => String(o.os_number).trim()));

// OSs que estavam no pátio mas não vieram mais no relatório foram baixadas/faturadas
const obsoleteOsIds = (existingOs || [])
  .filter(o => !importedOsNumbers.has(String(o.os_number).trim()) && o.status !== 'finalizado')
  .map(o => o.id);

if (obsoleteOsIds.length > 0) {
  await supabase
    .from('patio_os')
    .update({ status: 'finalizado', updated_at: new Date().toISOString() })
    .in('id', obsoleteOsIds);
}
```

---

## 2. Ajustes na RPC `get_daily_reconciliation_summary`

No CTE `patio_store`:
```sql
patio_store AS (
    SELECT store_id, COALESCE(SUM(COALESCE(total_value, 0) - COALESCE(paid_value, 0)), 0) as patio_os_sum
    FROM patio_os
    WHERE opened_at::date <= p_date
      AND LOWER(status) NOT IN ('finalizada', 'finalizado', 'paga', 'pago', 'cancelada', 'cancelado')
      AND (COALESCE(total_value, 0) - COALESCE(paid_value, 0)) > 0
    GROUP BY store_id
)
```

---

## 3. Limpeza dos Registros Órfãos no Banco

Query de sanitização em `patio_os`:
```sql
DELETE FROM patio_os
WHERE plate = 'N/I' 
  AND raw_status IS NULL 
  AND created_at < '2026-08-15';
```
