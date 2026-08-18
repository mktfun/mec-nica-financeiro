# Design: Correção do Dashboard, Gráfico de Evolução Macro e Métricas por Loja (227)

## 1. Atualização do Hook `useBackendDashboard.ts`
- **Mapeamento de Filiais (`porLoja`):**
  ```typescript
  const porLoja = (res.porLoja || []).map((s: any) => ({
    storeId: s.storeId || s.store_id || '',
    storeName: s.storeName || s.store_name || '',
    saldoAtual: Number(s.saldoAtual ?? s.saldo_banco ?? 0),
    faturamento: Number(s.faturamento || 0),
    contas: Number(s.contas ?? s.valor_contas ?? 0),
    resultado: Number(s.resultado ?? (Number(s.faturamento || 0) - Number(s.contas || 0))),
    veiculosPatio: Number(s.veiculosPatio ?? s.veiculos_patio ?? 0),
    veiculosPatioValor: Number(s.veiculosPatioValor ?? s.na_loja_os ?? 0),
    statusConciliacao: s.statusConciliacao || s.status || 'approved'
  }));
  ```

- **Alimentação do `historicoMacro`:**
  ```typescript
  const { data: allSnaps } = await supabase
    .from('daily_snapshots')
    .select('*')
    .order('date', { ascending: true });

  const historicoMacro = (allSnaps || []).map(snap => ({
    date: snap.date,
    saldo: Number(snap.saldo_bancario || 0),
    faturamento: Number(snap.faturamento || 0),
    contas: Number(snap.contas_a_pagar || 0),
  }));
  ```

- **Consistência de Faturamento Odômetro & Variação:**
  - `faturamentoAtual`: Snapshot atual (`592.969,88` ou soma diária).
  - `faturamentoAnterior`: Snapshot anterior (`496.797,82` Marco Zero).
  - `variacaoFaturamento`: Percentual real calculado entre odômetros.

## 2. Card de Faturamento no `src/routes/index.tsx`
- Layout refinado com indicação clara de Odômetro Acumulado e acréscimo diário/período.
