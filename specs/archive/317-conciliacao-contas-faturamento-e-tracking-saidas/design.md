# Design: Conciliação de Contas, Faturamento com Aportes e Tracking de Saídas (Contas x Débitos OFX) (317)

## Arquitetura e Fluxo de Dados

```
[Importação OFX / Planilha]
         │
         ├── Débitos OFX (type='out') ──┐
         └── Contas a Pagar (.xls)    ──┴─► [Batimento de Saídas (Contas x OFX)]
                                                         │
                                               [Auto-Match & Justificativas]
                                                         │
                                        [Toggle: Contabilizar no Fechamento?]
                                                         │
                                              SIM ───────┴─────── NÃO
                                               │                   │
                                               ▼                   ▼
                                      [daily_manual_bills]  [Auditoria Bancária]
                                               │
                                               ▼
                              [RPC: get_daily_reconciliation_summary]
                                      │              │
                    (Faturamento + Aportes)   (Contas Total + Juros)
                                      │              │
                                      ▼              ▼
                              [ResumoDiaPanel] ◄─────┘
                                      │
                         [Diferença Final = R$ 0,00]
```

## Interfaces TypeScript

```typescript
export interface DailyManualBill {
  id: string;
  date: string;
  store_id: string | null;
  category: string;
  title: string;
  amount: number;
  description?: string | null;
  external_code?: string | null;
  contabilizar_no_subtotal?: boolean;
  matched_ofx_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OfxSaidaItem {
  id: string;
  fitid: string;
  target_date: string;
  amount: number;
  counterpart_name: string;
  bank_name: string;
  store_id: string | null;
  matched_bill_id?: string | null;
  contabilizar_no_subtotal?: boolean;
  manual_category?: string | null;
  justification?: string | null;
}

export interface DailyReconciliationSummary {
  date: string;
  status_geral: 'approved' | 'divergent';
  is_closed: boolean;
  saldo_bancos_positivo: number;
  saldo_negativo_itau: number;
  dinheiro_em_lojas: number;
  cartoes_a_compensar: number;
  total_saldo_banco_positivo: number;
  dinheiro_mp: number;
  a_receber: number;
  na_loja_os: number;
  caixa_atual: number;
  caixa_anterior: number;
  fluxo_caixa: number;
  faturamento_oi_base: number;
  faturamento_ajustes: number;
  faturamento_periodo: number;
  faturamento_anterior: number;
  valor_disp_contas: number;
  contas_base: number;
  contas_extras: number;
  contas_manual: number;
  juros_rede: number;
  subtotal_contas: number;
  diferenca_final: number;
  total_entradas_ofx: number;
  total_saidas_ofx: number;
}
```

## Mutações em Arquivos Existentes [MODIFY / EXTEND]

### 1. `supabase/migrations/20260831000003_fix_faturamento_aportes_and_saidas_tracking.sql` [NEW MIGRATION]
- Adiciona colunas `contabilizar_no_subtotal` e chaves de vínculo em `daily_manual_bills` e `ofx_transactions`.
- Atualiza a RPC canônica `get_daily_reconciliation_summary` para:
  - Incluir aportes de `ofx_transactions` em `v_faturamento_ajustes`.
  - Respeitar `contabilizar_no_subtotal = true` ao somar `v_contas_manual`, `v_contas_base` e `v_contas_extras`.
  - Garantir o subtotal exato $Contas\ Manual\ (Total) + Juros\ Rede = Subtotal\ a\ Cobrir$.

### 2. `src/components/conciliacao/ResumoDiaPanel.tsx` [MODIFY]
- **Card Faturamento do Dia (L703–752):**
  - Renderiza `faturamento_periodo` como valor de destaque ($60.420,95$).
  - Sub-badges: `OI Base: R$ 55.420,95` e `+ Aportes/Ajustes: R$ 5.000,00`.
- **Card Contas (Manual) (L764–822):**
  - Renderiza `contas_manual` ($51.394,05$) como valor de destaque (em vez de exibir apenas a base desatualizada).
  - Sub-badges: `Base Planilha: R$ 46.394,05`, `+ Extras: R$ 5.000,00`, `Juros Rede: R$ 3.932,35`.
  - Subtotal a Cobrir: $51.394,05 + 3.932,35 = \mathbf{55.326,40}$.

### 3. `src/components/conciliacao/ContasManualModal.tsx` [EXTEND]
- Adiciona aba **"Batimento de Saídas (Contas x Débitos OFX)"**:
  - Lista débitos OFX (`ofx_transactions WHERE type = 'out'`).
  - Lista contas a pagar (`daily_manual_bills`).
  - Permite vincular débito bancário a uma conta a pagar ou marcar com toggle `Contabilizar no Fechamento`.
  - Salva em batch via Supabase mutations.

---

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Inclusão de Aporte de R$ 5.000 no Extrato Bancário
- **Estado Inicial:** Faturamento OI = R$ 55.420,95; Extrato possui 1 crédito de R$ 5.000,00 justificado como "Aporte".
- **Ação:** Acessar a tela de conciliação do dia 31/08.
- **Resultado Esperado:**
  - Card "Faturamento do Dia" exibe **R$ 60.420,95** (`OI: R$ 55.420,95` e `+ Ajustes: R$ 5.000,00`).
  - `Valor Disp. Contas` recalculado dinamicamente para comportar o aporte.

### Cenário 2: Contas Importadas + 2 Retiradas Manuais de R$ 5.000
- **Estado Inicial:** 45 contas importadas = R$ 46.394,05; 2 retiradas cadastradas = R$ 5.000,00; Juros Rede = R$ 3.932,35.
- **Ação:** Abrir o painel e conferir o card de Contas e a barra de Subtotal.
- **Resultado Esperado:**
  - Card "Contas (Manual)" exibe **R$ 51.394,05** com chips `Base: R$ 46.394,05` e `+ Extras: R$ 5.000,00`.
  - Barra de Subtotal exibe **R$ 55.326,40** ($51.394,05 + 3.932,35$).
  - Matemática 100% harmonizada e sem incongruência visual.
