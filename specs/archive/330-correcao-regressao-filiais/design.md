# Design: Correção de Regressão no Fechamento por Filial e Tela de Detalhes (330)

## Arquitetura e Fluxo de Dados
`get_daily_reconciliation_summary` (RPC) → `useBackendConciliacao` (Hook) → `ConciliacaoLojasView` (Cards) & `conciliacao.$lojaId.tsx` (Detalhes)

## Interfaces TypeScript
```typescript
export interface StoreReconciliationSummary {
  store_id: string;
  name: string;
  saldo_banco: number | null; // Null se houver falha de integração
  maquininha: number | null;
  pix: number | null;
  na_loja_os: number | null;
  previsto_ofx: number | null;
  diferenca: number | null; // Diferença real da filial
  transacoes_nao_identificadas: number;
  status: 'pending' | 'approved' | 'error';
}
```

## Mutações em Arquivos Existentes [MODIFY]
- `supabase/migrations/20260901000004_fix_store_breakdown_regression.sql`: Ajuste dos JOINs e remoção de COALESCE mascaradores na RPC.
- `src/routes/conciliacao.$lojaId.tsx`: Renderização do extrato completo sem filtros omitindo linhas.
- `src/components/conciliacao/StoreCardModulo1.tsx`: Tratamento visual para valores `null` (exibindo N/D e erro em vez de R$ 0,00).

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (Alinhamento de Diferenças):** Somar divergências das filiais nos cards → Deve igualar à Diferença Final do consolidado geral.
- **Cenário 2 (Transparência de Extrato):** Abrir filial com TED e Despesas → Todos os lançamentos devem aparecer na tela de detalhe, justificando o saldo da conta.
