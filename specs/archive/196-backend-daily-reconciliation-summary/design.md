# Design: Backend Daily Reconciliation Summary & Math Delegation (196)

## Arquitetura Técnica

```
[ Frontend: /conciliacao/ & ResumoDiaPanel ]
                    │
                    ▼ (Single RPC Call: < 50ms)
[ Supabase RPC: get_daily_reconciliation_summary(p_date) ]
     ├── 1. CTE recon_totals (reconciliations: bank_total)
     ├── 2. CTE ofx_in_out (ofx_transactions: type in/out)
     ├── 3. CTE pos_fees (pos_transactions: fee_amount REDE)
     ├── 4. CTE patio_active (patio_os: OS ativas)
     ├── 5. CTE snapshot_ant (daily_snapshots: anterior caixa & faturamento)
     ├── 6. CTE current_snapshot (daily_snapshots: inputs manuais do dia)
     └── 7. Aggregation & Math Consolidation (JSONB estruturado)
                    │
                    ▼
[ Retorno Consolidado para o React ]
```

## Interfaces TypeScript

```typescript
export interface DailyReconciliationSummary {
  data_atual: string;
  total_saldo_banco: number;
  dinheiro_mp: number;
  a_receber: number;
  na_loja_os: number;
  contas_manual: number;
  juros_rede: number;
  ofx_out: number;
  caixa_atual: number;
  caixa_anterior: number;
  fluxo_caixa: number;
  faturamento_ofx: number;
  faturamento_anterior: number;
  faturamento_periodo: number;
  valor_disp_contas: number;
  subtotal_contas: number;
  diferenca_final: number;
  status_geral: 'approved' | 'divergence';
  stores: Array<{
    store_id: string;
    store_name: string;
    saldo_banco: number;
    maquininha: number;
    pix: number;
    na_loja_os: number;
    previsto_ofx: number;
    diferenca: number;
    status: 'approved' | 'divergence';
  }>;
}
```

## Componentes / Hooks / Funções

1. **Migration SQL (`supabase/migrations/20260814010000_get_daily_reconciliation_summary.sql`):**
   - Criação da RPC `get_daily_reconciliation_summary(p_date date) RETURNS jsonb`.
2. **Hook (`src/hooks/useBackendConciliacao.ts`):**
   - Função `useDailyReconciliationSummary(date: string)` com cache inteligente via React Query.
3. **Página Principal (`src/routes/conciliacao.index.tsx`):**
   - Consome `useDailyReconciliationSummary` eliminando chamadas redundantes a `feesByStore` e `useGlobalOfxOut`.
4. **Painel de Fechamento (`src/components/conciliacao/ResumoDiaPanel.tsx`):**
   - Renderiza instantaneamente os 5 pilares, Consolidação do Dia e Card de Diferença Final com base no payload da RPC.

## Fluxo de UI (Frontend)
1. O usuário seleciona uma data na barra de navegação superior.
2. A tela dispara `useDailyReconciliationSummary(selectedDate)`.
3. Em < 50ms os cards carregam:
   - **SALDO BANCO ITAÚ**: Soma consolidada de todas as contas/lojas.
   - **DINHEIRO MP**: Valor preenchido no dia.
   - **A RECEBER**: Boletos/descontos manuais do dia.
   - **NA LOJA OS**: OSs ativas do pátio (desacopladas do Marco Zero).
   - **CONTAS (MANUAL)**: Valor das despesas com Juros REDE e OFX Out informados.
   - **Consolidação do Dia**: Caixa Atual, Fluxo de Caixa, Faturamento Líquido e Valor Disp. Contas calculados de forma exata.
   - **Diferença Final**: `ABS(Valor Disp. Contas) - Subtotal Contas`.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (Data com movimentação normal):**
  - *Estado Inicial:* Dia 11/08 ou 12/08 selecionado com transações OFX e REDE importadas.
  - *Ação:* Carregar a página `/conciliacao/`.
  - *Resultado Esperado:* Faturamento Líquido exibe as entradas puras do OFX (> 0), Fluxo de Caixa bate com `Caixa Atual - Caixa Anterior`, e Diferença Final é calculada instantaneamente sem lag na UI.
- **Cenário 2 (Data de Marco Zero ou Primeiro Dia):**
  - *Estado Inicial:* Primeira data do histórico selecionada.
  - *Ação:* Carregar a página `/conciliacao/`.
  - *Resultado Esperado:* Caixa Anterior usa o valor dos metadados iniciais sem gerar `null` ou NaN, mantendo a consistência do painel.
