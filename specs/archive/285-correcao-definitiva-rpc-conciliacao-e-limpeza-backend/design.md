# Design: Correção Definitiva da RPC de Conciliação, Higienização do Backend e Blindagem de Performance (285)

## Arquitetura Técnica

```
[UI: Dashboard / Conciliação] ---> [Hook: useDailyReconciliationSummary]
                                               |
                                               v
                                [Supabase RPC: get_daily_reconciliation_summary(date)]
                                               |
                     +-------------------------+-------------------------+
                     | (is_closed = true)                                | (is_closed = false / draft)
                     v                                                   v
           [Ramal 1: Snapshot Imutável]                        [Ramal 2: Agregação Dinâmica]
           - Metadados congelados                             - CTEs isoladas e indexadas
           - Lojas via reconciliations (colunas canônicas)    - Saldo Bancos = Reconciliations / OFX Balances
           - Resposta ultra-rápida (< 10ms)                   - Cofre em trânsito + Cartões a Compensar
                                                              - 10 Filiais mapeadas deterministicamente
```

## Interfaces TypeScript

```typescript
export interface DailyReconciliationSummary {
  date: string;
  is_closed: boolean;
  closed_at: string | null;
  status_geral: 'approved' | 'divergence';
  
  // 5 Pilares de Caixa
  saldo_bancos_ofx: number;
  dinheiro_em_lojas: number;
  cartoes_a_compensar: number;
  devolucoes_rede: number;
  total_saldo_banco: number;
  saldo_negativo_itau: number;
  dinheiro_mp: number;
  a_receber: number;
  na_loja_os: number;
  
  // Balanço Contábil
  caixa_atual: number;
  caixa_anterior: number;
  fluxo_caixa: number;
  faturamento_oi_base: number;
  faturamento_ajustes: number;
  faturamento_periodo: number;
  valor_disp_contas: number;
  contas_base: number;
  contas_extras: number;
  contas_manual: number;
  juros_rede: number;
  subtotal_contas: number;
  diferenca_final: number;
  
  // Extrato & Filiais
  total_entradas_ofx: number;
  total_saidas_ofx: number;
  faturamento_itens: Array<{ id: string; title: string; amount: number; type: string; description?: string }>;
  contas_itens: Array<{ id: string; title: string; amount: number; category?: string; description?: string; store_id?: string }>;
  stores: StoreReconciliationSummary[];
}

export interface StoreReconciliationSummary {
  store_id: string;
  store_name: string;
  saldo_banco: number;
  saldo_banco_ofx: number;
  bank_balance: number;
  dinheiro_loja: number;
  cash_vault: number;
  vault_entries: any[];
  maquininha: number;
  rede_bruto: number;
  rede_liquido: number;
  rede_taxas: number;
  rede_devolucoes: number;
  rede_ofx: number;
  cartoes_a_compensar: number;
  nao_entrou_valor: number;
  status_compensacao: string;
  pix: number;
  pix_os_ofx: number;
  justified_other_ofx: number;
  na_loja_os: number;
  patio_os: number;
  previsto_ofx: number;
  diferenca: number;
  status: 'approved' | 'divergence';
}
```

## Componentes / Hooks Afetados

1. **`supabase/migrations/20260825000004_fix_canonical_reconciliation_and_performance.sql`**:
   - Dropar sobrecargas antigas de `get_daily_reconciliation_summary`.
   - Recriar a RPC única, determinística e otimizada com tipos estritos e índices de suporte.
   - Reforçar o status `is_closed = true` nos 5 snapshots homologados (17, 18, 19, 21, 24/08).
2. **`src/hooks/useBackendConciliacao.ts`**:
   - Ajustar tipagens e garantir consumo limpo da RPC.
3. **`src/components/financeiro/ResumoDiaPanel.tsx`**:
   - Blindar leitura dos dados exclusivamente do payload da RPC.

## Cenários de Verificação (SCAN -> INFER -> VERIFY -> FIX)

- **Cenário 1: Navegação em Dias Fechados (17, 18, 19, 21, 24/08)**
  - *Estado Inicial:* Dia 24/08 selecionado.
  - *Ação:* Chamar `get_daily_reconciliation_summary('2026-08-24')`.
  - *Resultado Esperado:* Resposta HTTP 200 em < 20ms, `is_closed: true`, `diferenca_final: 6.20`, todas as 10 lojas preenchidas sem erro `42703`.
- **Cenário 2: Apuração em Dia Aberto (25/08)**
  - *Estado Inicial:* Dia 25/08 com ajustes de Empréstimo e Prolabore.
  - *Ação:* Chamar `get_daily_reconciliation_summary('2026-08-25')`.
  - *Resultado Esperado:* Saldo Bancário consolidado patrimonial correto (+R$ 39.190,77 ou saldo por filial), Caixa Atual calculado sem distorção, resposta em < 50ms.
- **Cenário 3: Módulo de Recebíveis**
  - *Ação:* Acessar tela de recebíveis.
  - *Resultado Esperado:* Totais agregados via backend sem loops no React.
