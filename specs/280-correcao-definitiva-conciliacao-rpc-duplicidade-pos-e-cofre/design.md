# Design: Motor Dinâmico de Fechamento por Filiais, Deduplicação Automática e Resolução de RPC (280)

## Arquitetura do Fluxo de Dados 100% Dinâmico

```
[Importações & Lançamentos do Usuário]
  ├── OFX das 10 Contas ──► ofx_transactions (Entradas, Saídas, Rede, PIX)
  ├── Relatórios de OS ────► patio_os (OSs em Aberto) + store_cash_vault (Dinheiro)
  ├── Relatórios da Rede ──► pos_transactions (Bruto, Líquido, Taxas com Deduplicação)
  ├── Contas a Pagar ──────► daily_manual_bills (34 contas do arquivo + Pró-labores/Extras)
  └── Ajustes de Receita ──► daily_revenue_adjustments (Sucata, Aportes, etc.)
                                 │
                                 ▼
         [RPC public.get_daily_reconciliation_summary(p_date text)]
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │ 1. Saldo Bancos = SUM(bank_total das 10 filiais em reconciliations)        │
  │ 2. Dinheiro em Lojas = SUM(store_cash_vault WHERE status='em_transito')    │
  │ 3. Maquininhas a Compensar = Deduplicado(pos_transactions) - ofx_rede       │
  │ 4. Total Saldo Banco (Pilar 1) = Bancos + Dinheiro Cofre + Cartões a Comp. │
  │ 5. Caixa Atual = Pilar 1 + Dinheiro MP + A Receber + Pátio OS               │
  │ 6. Fluxo de Caixa = Caixa Atual - Caixa Anterior                            │
  │ 7. Faturamento = Faturamento Base + SUM(daily_revenue_adjustments)          │
  │ 8. Valor Disp. Contas = Faturamento - Fluxo de Caixa                        │
  │ 9. Contas a Cobrir = SUM(daily_manual_bills) + COALESCE(Taxas Rede, Juros)  │
  │ 10. Diferença Final = Valor Disp. Contas - Contas a Cobrir                  │
  │ 11. Stores Array = 10 filiais com todos os saldos e status dinâmicos        │
  └─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                    [Frontend React / TanStack]
  ├── /conciliacao ──────────► Resumo do Dia (Approved quando diferença <= R$ 50)
  ├── Fechamento por Filial ─► 10 cards com Saldo Bancos, Maquininha, PIX, Pátio
  └── Modal Saldo Bancos ────► Raio-X com saldos bancários, cofre e baixa com 1 clique
```

## Interface TypeScript de Retorno da RPC
```typescript
export interface DailyReconciliationSummary {
  date: string;
  status_geral: 'approved' | 'divergent';
  
  // Pilares
  saldo_bancos_ofx: number;
  dinheiro_em_lojas: number;
  cartoes_a_compensar: number;
  devolucoes_rede: number;
  total_saldo_banco: number;
  saldo_negativo_itau: number;
  
  dinheiro_mp: number;
  a_receber: number;
  na_loja_os: number;
  
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
  
  total_entradas_ofx: number;
  total_saidas_ofx: number;
  
  contas_itens: Array<{ id: string; title: string; amount: number; category?: string }>;
  faturamento_itens: Array<{ id: string; title: string; amount: number; type: string }>;
  stores: StoreReconciliationSummary[];
  stores_detail: StoreReconciliationSummary[];
}
```

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
1. **Lançamento de Nova Conta Manual pelo Usuário:**
   - Usuário insere qualquer conta em `daily_manual_bills` (ex: `R$ 10.070,00`).
   - A RPC reflete o novo total de `contas_manual` e recalcula `subtotal_contas` e `diferenca_final` automaticamente sem intervenção.
2. **Lançamento de Ajuste de Receita (Sucata):**
   - Usuário insere `daily_revenue_adjustments` de `R$ 60,00` e `R$ 30,00`.
   - A RPC reflete `faturamento_ajustes = 90.00` e recalcula `faturamento_periodo` e `valor_disp_contas` automaticamente.
3. **Resolução de PGRST203:**
   - Chamada `supabase.rpc('get_daily_reconciliation_summary', { p_date: '2026-08-24' })` funciona com sucesso retornando os 10 cards de filial.
