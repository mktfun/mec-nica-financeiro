# Proposal: Correção de Parâmetro da RPC de Maquininhas e Diagnóstico Contábil de Contas a Pagar (265)

## Problema

1. **Erro de Execução na RPC de Maquininhas (PGRST202):**
   Ao carregar a conciliação diária, o hook `usePosTripleReconciliation` em `useBackendConciliacao.ts` dispara a RPC `get_store_pos_triple_reconciliation` passando o parâmetro `{ p_date: date }`. A assinatura da função no banco de dados é `get_store_pos_triple_reconciliation(p_target_date date)`. Isso resulta em erro `400 / PGRST202: Could not find the function public.get_store_pos_triple_reconciliation(p_date) in the schema cache`.

2. **Dúvida Contábil na Diferença Final do Dia 24/08 (-R$ 11.305,18 para -R$ 21.305,18):**
   - Na importação do dia 24/08, a planilha `BuscaContasAPagar (1).xls` continha 36 contas totalizando **R$ 48.294,62**.
   - O `Valor Disponível para Contas` do dia é de **R$ 43.137,94** (Faturamento R$ 70.721,56 - Fluxo de Caixa R$ 27.583,62).
   - O `Subtotal de Contas` antes da inserção manual era **R$ 54.443,12** (Contas R$ 48.294,62 + Juros Rede R$ 6.148,50), gerando uma diferença inicial de **-R$ 11.305,18**.
   - Ao lançar manualmente a conta avulsa `prolabore daniel` de **R$ 10.000,00**, o total de contas a pagar subiu para **R$ 58.294,62**, elevando o Subtotal a Cobrir para **R$ 64.443,12**. Como são despesas adicionais a pagar, a diferença (déficit) aumentou exatamente R$ 10.000,00, passando para **-R$ 21.305,18**.
   - O usuário precisa de clareza visual e opção de controle: se o pró-labore de R$ 10.000,00 for uma **Retirada / Justificativa de Faturamento** (e não uma despesa a ser coberta pelo faturamento operacional do dia), ele deve ser lançado na aba de *Ajustes de Faturamento* (`daily_revenue_adjustments`), ou, se for despesa avulsa, deve ser mantido em `daily_manual_bills`.

## Solução Proposta

1. **Correção do Hook Frontend:**
   - Em `src/hooks/useBackendConciliacao.ts`, alterar o payload da chamada `supabase.rpc('get_store_pos_triple_reconciliation', { p_target_date: date })`.
   - Adicionar sobrecarga / migration no PostgreSQL para garantir que `get_store_pos_triple_reconciliation` aceite tanto `p_date` quanto `p_target_date` (prevenindo quebras futuras).

2. **Transparência e Detalhamento da Matemática do Card de Contas no `ResumoDiaPanel.tsx`:**
   - Exibir com clareza o desdobramento:
     - `Contas da Planilha (Base): R$ 48.294,62`
     - `Despesas Manuais Avulsas: + R$ 10.000,00 (1 item)`
     - `Juros da Rede: + R$ 6.148,50`
     - `Total a Cobrir: R$ 64.443,12`
   - Permitir ao operador alternar facilmente um lançamento entre `Despesa Avulsa (Contas a Pagar)` e `Ajuste/Justificativa de Faturamento` com 1 clique direto no modal de contas.

## Contratos de Dados

### Tabelas Supabase:
- `daily_manual_bills`: `id, date, store_id, title, description, category, amount, created_at`
- `daily_revenue_adjustments`: `id, date, title, description, type, amount, created_at`
- `daily_snapshots`: `date, caixa_atual, faturamento, contas_a_pagar, juros_rede, metadata`

### RPCs Afetadas:
- `get_store_pos_triple_reconciliation(p_target_date date)`: suportar `p_date` e `p_target_date`.
- `get_daily_reconciliation_summary(p_date date)`: retorna `contas_base`, `contas_extras`, `contas_manual`, `juros_rede`, `subtotal_contas`.

## API / Interface

### Hook `usePosTripleReconciliation` em `src/hooks/useBackendConciliacao.ts`:
```typescript
export function usePosTripleReconciliation(date: string) {
  return useQuery({
    queryKey: ['pos-triple-reconciliation', date],
    queryFn: async (): Promise<PosTripleReconciliationResult | null> => {
      if (!date) return null;
      const { data, error } = await supabase.rpc('get_store_pos_triple_reconciliation', {
        p_target_date: date
      });
      if (error) throw error;
      return data as unknown as PosTripleReconciliationResult;
    },
    enabled: !!date,
    staleTime: 1000 * 30,
  });
}
```

## Features Existentes Impactadas

- `useBackendConciliacao.ts` — chamada da RPC corrigida.
- `ResumoDiaPanel.tsx` — detalhamento do card de contas e tolerância.
- `ContasManualModal.tsx` — suporte transparente à exclusão ou conversão de contas.

## Risco Principal

Confusão conceitual entre despesa a pagar (aumenta o subtotal a cobrir) versus ajuste de faturamento (aumenta o valor disponível). Mitigado com rotulagem clara e breakdown visual no painel.
