# Design — Spec 451: Unificação do Cálculo de Diferença Final e Subtotal Contas

## 1. Visão Geral da Arquitetura & Fluxo de Dados

O painel de conciliação diária (`ResumoDiaPanel.tsx`) opera com base no hook `useBackendConciliacao` (`useDailyReconciliationSummary`).

### Fluxo Canônico Desejado

```
                       [ daily_snapshots (DB) ]
                                  │
                                  ▼
                [ RPC get_daily_reconciliation_summary ]
                                  │
                                  ▼
                [ Hook useDailyReconciliationSummary ]
                 ┌────────────────────────────────┐
                 │ IF day is closed:              │
                 │   SSOT = snapshot data         │
                 │   contas_base = snap.contas    │
                 │   subtotal = snap.subtotal     │
                 │   diferenca = snap.diferenca   │
                 │ ELSE (open day):               │
                 │   dynamic calculation          │
                 └────────────────────────────────┘
                                  │
                                  ▼
                     [ Component ResumoDiaPanel ]
                 ┌────────────────────────────────┐
                 │ Cards exibem:                  │
                 │ Valor Disp: R$ 48.805,95       │
                 │ Subtotal Contas: R$ 45.145,92  │
                 │ Diferença: R$ 3.660,03         │
                 │ (Idêntico em View e Edit)      │
                 └────────────────────────────────┘
```

---

## 2. Contratos & Regras Matemáticas

### R1: Autoridade de Dia Fechado (SSOT)
Quando `snapshotData?.is_closed` é `true` e `forceDynamic` é `false`:
- O dia está homologado e congelado.
- Os boletos de `daily_manual_bills` não devem ser usados para recalcular ou sobrescrever `subtotal_contas` e `diferenca_final` arbitrariamente, pois os boletos manuais podem ter sido consolidados em lote na planilha base de contas a pagar (`contas_a_pagar = 41.771,21`).
- `contas_base` = `snapshotData.contas_a_pagar ?? raw.contas_base ?? totalManualBills`
- `subtotal_contas` = `snapMeta.subtotal_contas ?? raw.subtotal_contas ?? (finalContasBase + juros_rede)`
- `valor_disp_contas` = `snapMeta.valor_disp_contas ?? raw.valor_disp_contas ?? finalValorDisp`
- `diferenca_final` = `snapMeta.diferenca_final ?? raw.diferenca_final ?? (finalValorDisp - finalSubtotalContas)`

### R2: Cálculo em Dia Aberto (Dinâmico)
Quando o dia ainda está aberto (`!snapshotData?.is_closed` ou `forceDynamic = true`):
- `contas_base` = `totalManualBills` (soma dos boletos não ignorados e marcados para contabilizar em `daily_manual_bills`).
- `juros_rede` = `Number(raw.juros_rede ?? 0)`
- `subtotal_contas` = `Number((contas_base + juros_rede).toFixed(2))`
- `valor_disp_contas` = `Number((finalFatPeriodo - finalFluxoCaixa).toFixed(2))`
- `diferenca_final` = `Number((valor_disp_contas - subtotal_contas).toFixed(2))` (salvo se `is_marco_zero` tiver override explícito).

### R3: Coerência Visual em `ResumoDiaPanel.tsx`
- Os cards visuais de "Valor Disp. Contas", "Subtotal Contas a Pagar" e "Diferença Final (Consolidada)" devem sempre satisfazer a identidade contábil:
  $$\text{DIFERENÇA FINAL} = \text{Valor Disponível Contas} - \text{Subtotal Contas}$$
- Não pode haver descompasso entre o valor que a tela calcula no Modo Edição e o valor que o hook entrega no Modo Visualização.

---

## 3. Cenários de Teste

### Cenário 1: Dia 2026-09-29 Fechado
- **Entrada**: Data `2026-09-29`.
- **Esperado**:
  - `Valor Disp. Contas`: 48.805,95
  - `Subtotal Contas`: 45.145,92
  - `Diferença Final`: 3.660,03
  - Status: Aprovado
  - Ao entrar em Modo Edição: exibe 3.660,03.
  - Ao salvar alterações: permanece 3.660,03.

### Cenário 2: Dia Aberto com Boletos e Juros
- **Entrada**: Data sem fechamento.
- **Esperado**:
  - Soma dinâmica de boletos de `daily_manual_bills` + `juros_rede`.
  - Diferença final calculada de forma exata: `valor_disp - subtotal_contas`.
