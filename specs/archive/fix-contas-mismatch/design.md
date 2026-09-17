# Design: SSOT Contas Manuais via Client-Side Overlap

## 1. Abordagem de Arquitetura
A abordagem ideal seria atualizar a view/RPC `get_daily_reconciliation_summary` no banco. No entanto, em um ambiente de produção/deploy sem acesso root automatizado ao PostgreSQL, devemos empregar o padrão **Client-Side Data Overlap (SSOT)**.
O React Query gerenciará o estado, e `useBackendConciliacao` buscará as fontes de verdade de forma paralela via HTTP Supabase REST API e mesclará no `raw` response da RPC.

## 2. Modificações em `useBackendConciliacao.ts`
O hook usará um `Promise.all` estendido:
```typescript
const { data: billsData } = await supabase
  .from('daily_manual_bills')
  .select('amount, status')
  .eq('date', date)
  .neq('status', 'ignored');
```
Iremos iterar, reduzir a soma de `amount`, e popular na variável de controle `totalManualBills`.

Em seguida, reescrevemos as referências:
```typescript
const finalSubtotalContas = Number(totalManualBills + Number(raw.juros_rede || 0));

return {
   ...raw,
   contas_manual: totalManualBills, // sobrescreve a RPC
   // ...
}
```

Isso garante o encapsulamento. Qualquer componente UI consumirá a matemática correta já embutida.
