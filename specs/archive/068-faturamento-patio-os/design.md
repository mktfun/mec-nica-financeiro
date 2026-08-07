# Design Document: Spec 068

## 1. Arquitetura de Dados (Faturamento)
A métrica de Faturamento passará a ser derivada da tabela `patio_os`.
- **Regra de Negócio (Faturamento OS):** A OS é contabilizada como Faturamento no dia em que ela foi FECHADA (`closed_at`). OSs em aberto (no pátio) nÁo entram no Faturamento (já que sÁo contabilizadas como "A Receber").
- **Tabela:** `patio_os`
- **CondiçÁo:** `closed_at` deve corresponder (startsWith) à data alvo (`targetDate`).
- **Valor Somado:** `total_value` (Valor bruto total da OS).

## 2. RefatoraçÁo do `useDashboardV2.ts`
### 2.1 Fetch Inicial
Atualmente o hook faz:
```typescript
        supabase
          .from('patio_os')
          .select('store_id, total_value, paid_value, status'),
```
Mudaremos para:
```typescript
        supabase
          .from('patio_os')
          .select('store_id, total_value, paid_value, status, closed_at'),
```

### 2.2 Cálculo Diário (Tabela e Cards Globais)
- Removeremos a lógica que iterava sobre `logsCurr.data` para extrair `total_os`.
- Iteraremos sobre `patioOs.data`:
  ```typescript
  const fatByStore: Record<string, number> = {};
  let faturamentoAtualLog = 0; // Total OSs

  for (const po of patioOs.data || []) {
    if (po.closed_at && po.closed_at.startsWith(dateAtual)) {
      const val = Number(po.total_value || 0);
      faturamentoAtualLog += val;
      fatByStore[po.store_id] = (fatByStore[po.store_id] || 0) + val;
    }
  }
  ```
- O Faturamento Global continuará sendo `faturamentoAtualLog + fatManual`.

### 2.3 Cálculo do Histórico (Macro Chart)
Atualmente o `historicoMacro` usa `import_logs` para extrair o `Faturamento` dos últimos dias.
Isso será reescrito. Como a query de `patio_os` (sem limite de data) já traz TODO o histórico que está no banco, nÁo precisamos de uma nova query macro para as OSs. Podemos apenas iterar sobre o cache do `patio_os` já baixado!
- Agruparemos os `total_value` por loja/data, garantindo que o gráfico reflita com exatidÁo o Faturamento de OSs para qualquer dia passado presente em `monthDates`.
- E os lançamentos manuais do `daily_snapshots` continuam sendo somados normalmente à data correspondente do gráfico.
