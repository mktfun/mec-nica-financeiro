# Design: Saneamento da Tela de Conciliação e Unificação SSOT (402)

## Arquitetura e Fluxo de Dados

```
Banco de Dados Postgres (Supabase)
┌───────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
│   ofx_transactions    │   pos_transactions   │      patio_os        │  daily_manual_bills  │
└───────────┬───────────┴──────────┬───────────┴──────────┬───────────┴──────────┬───────────┘
            │                      │                      │                      │
            └──────────────────────┴──────────┬───────────┴──────────────────────┘
                                              │
                                              ▼
                             RPC: get_daily_reconciliation_summary
                               (Fonte Única de Verdade - SSOT)
                                              │
                                              ▼
                      Hook: useDailyReconciliationSummary (Frontend)
                                (Sem recálculos client-side)
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
             ResumoDiaPanel.tsx                             ConciliacaoLojasView.tsx
     (Hero Card Consolidado: 5 Pilares)               (Fechamento Individual por Filial)
                      │                                               │
                      ▼                                               ▼
              Modais de Apoio                                StoreCardModulo1.tsx
       (SaldoBancos / Contas / Fat)                                   │
                                                                      ▼
                                                          /conciliacao/$lojaId
                                              ┌───────────────────────┼───────────────────────┐
                                              ▼                       ▼                       ▼
                                       Aba 1 (Cartão)          Aba 2 (Extrato)          Aba 3 (OS)
                                      pos_transactions        ofx_transactions           patio_os
```

---

## Interfaces TypeScript Canônicas

```typescript
// Contrato de Retorno da RPC get_daily_reconciliation_summary (SSOT)
export interface StoreReconciliationSummary {
  store_id: string;
  store_name: string;
  saldo_banco: number;
  saldo_banco_ofx: number;
  maquininha: number;
  rede_bruto: number;
  rede_liquido: number;
  nao_entrou_valor: number;
  cartao_nao_entrou: number;
  status_compensacao: 'entrou' | 'nao_entrou' | 'parcial' | 'sem_movimento';
  devolucoes_rede: number;
  dinheiro_loja: number;
  pix: number;
  pix_total: number;
  ofx_entradas_total: number;
  ofx_maquininhas: number;
  entradas_justificadas: number;
  entradas_orfas: number;
  entradas_conciliadas: number;
  dif_entradas: number;
  ofx_saidas_total: number;
  saidas_justificadas: number;
  saidas_orfas: number;
  contas_loja_total: number;
  contas_conciliadas: number;
  dif_saidas: number;
  na_loja_os: number;
  patio_os: number;
  diferenca: number;
  status: 'approved' | 'divergence';
}

export interface DailyReconciliationSummary {
  date: string;
  is_closed: boolean;
  saldo_bancos_ofx: number;
  saldo_bancos_positivo: number;
  saldo_negativo_itau: number;
  dinheiro_lojas: number;
  cartoes_a_compensar: number;
  devolucoes_rede: number;
  total_saldo_banco_positivo: number;
  total_saldo_banco: number;
  dinheiro_mp: number;
  a_receber: number;
  na_loja_os: number;
  caixa_atual: number;
  caixa_anterior: number;
  fluxo_caixa: number;
  faturamento_periodo: number;
  faturamento_oi_base: number;
  faturamento_anterior: number;
  faturamento_ajustes: number;
  valor_disp_contas: number;
  contas_base: number;
  contas_extras: number;
  contas_manual: number;
  juros_rede: number;
  subtotal_contas: number;
  diferenca_final: number;
  status_geral: 'approved' | 'divergent';
  stores: StoreReconciliationSummary[];
}
```

---

## Mutações em Arquivos Existentes `[MODIFY]`

### 1. `src/hooks/useBackendConciliacao.ts`
- **O que muda**:
  - Remover todas as chamadas `supabase.from('store_cash_vault')`, `supabase.from('pos_transactions')` e `supabase.from('daily_snapshots')` de dentro de `useDailyReconciliationSummary`.
  - O hook passa a ser limpo: chama `supabase.rpc('get_daily_reconciliation_summary', { p_date: date, p_force_dynamic: forceDynamic })` e retorna os dados diretamente, garantindo que o frontend utilize os mesmos números exatos calculados pelo Postgres.

### 2. `src/components/conciliacao/ResumoDiaPanel.tsx`
- **O que muda**:
  - Substituir o cálculo reativo em JavaScript (`caixaAtualCalculado`, `fluxoCaixaCalculado`, `valorDispContasCalculado`, `subtotalContasCalculado`, `diferencaFinalCalculada`) pelas variáveis entregues pelo `summary` quando `!isEditing`.
  - Manter o cálculo dinâmico apenas enquanto `isEditing === true` para que a digitação do usuário reflita instantaneamente no preview antes de salvar.
  - Remover o `isBreakdownModalOpen` e a invocação de `FaturamentoAtualBreakdownModal`.
  - Corrigir a "Guarda de Integridade" para validar `summary.stores` diretamente, eliminando o erro de bloqueio de fechamento indevido.

### 3. `src/routes/conciliacao.index.tsx`
- **O que muda**:
  - Remover a criação artificial de `storesState: StoreSaldoState[]` com referências a `lib/modulo1Calculations.ts`.
  - Passar diretamente `summary` e `stores` para `ResumoDiaPanel` e `ConciliacaoLojasView`.
  - Remover o `BreakdownModal` e o estado morto `breakdownStore`.

### 4. `src/components/conciliacao/ConciliacaoLojasView.tsx`
- **O que muda**:
  - Eliminar os encadeamentos excessivos de fallbacks `?? ?? ??` nas linhas 26-79.
  - Mapear os cards diretamente a partir das propriedades oficiais de `StoreReconciliationSummary` (`saldo_banco_ofx`, `maquininha`, `pix`, `na_loja_os`, `previsto_ofx`, `diferenca`, `status_compensacao`, `nao_entrou_valor`).

### 5. `src/components/conciliacao/StoreCartaoMaquininhaView.tsx`
- **O que muda**:
  - Trocar o hook quebrado `useReconciliationViews` por uma query simples e direta a `pos_transactions` filtrada por `store_id` e `target_date`.
  - Mapear as colunas: Bandeira/Modalidade (`payment_method`), Valor Bruto (`gross_amount`), Taxa MDR (`fee_amount`), Valor Líquido (`net_amount`), OS vinculada (`matched_os_number`) e Status no Banco (`settlement_status === 'entrou' ? 'LIQUIDADO NO BANCO' : 'A COMPENSAR'`).

### 6. `src/components/conciliacao/StoreExtratoBancarioView.tsx`
- **O que muda**:
  - Trocar as queries que consultam a tabela legada `transactions` para consultarem a tabela canônica `ofx_transactions` (`target_date = date` e `store_id = storeId`).
  - Assegurar que os campos `fitid`, `counterpart_name`, `bank_name`, `manual_category`, `manual_justification` e `matched_os_number` sejam lidos e atualizados na mesma tabela `ofx_transactions`.

### 7. `src/routes/conciliacao.$lojaId.tsx`
- **O que muda**:
  - Simplificar os cards superiores de métricas (Saldo Total, Maquininha, PIX, Na Loja OS, Previsto, Diferença) para lerem de `storeRecon` diretamente sem conversões redundantes.

---

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Fechamento Diário Macro (`/conciliacao`)
- **Estado Inicial**: Usuário acessa `/conciliacao?date=2026-09-14`.
- **Ação**: O painel carrega o resumo via `useDailyReconciliationSummary`.
- **Resultado Esperado**:
  - Os 5 Pilares batem exatamente com a saída da RPC `get_daily_reconciliation_summary`.
  - A lista de filiais em "Fechamento por Filial" exibe todas as 10 filiais com saldo bancário, maquininha e status correto.
  - Nenhum alerta de *"⛔ Bloqueio de Segurança: O detalhamento por filiais está zerado..."* aparece quando há dados no banco.
  - O botão "Salvar Fechamento" persiste com sucesso o snapshot sem corromper metadados.

### Cenário 2: Detalhamento por Loja (`/conciliacao/$lojaId`)
- **Estado Inicial**: Usuário clica em uma filial (ex: `MPrudge` ou `MPkennedy`) com vendas em maquininha e extrato bancário importados.
- **Ação**: Navega para `/conciliacao/<lojaId>?date=2026-09-14` e acessa as abas "Cartão / Maquininha" e "Extrato Bancário".
- **Resultado Esperado**:
  - **Aba Cartão**: Lista as transações reais de `pos_transactions` com valor bruto, taxa retida, valor líquido e badge "LIQUIDADO NO BANCO" ou "A COMPENSAR".
  - **Aba Extrato**: Lista as transações reais de `ofx_transactions` com FITID, contraparte e categoria. Ao categorizar uma despesa como "Pró-Labore" ou "Fornecedor", a tabela reflete instantaneamente a alteração.
  - **Aba OS**: Mantém a listagem do pátio e permite edição inline de `total_value` e `paid_value`.
