# Design: Equalização Definitiva dos 5 Pilares e Fechamento Canônico de 31/08/2026 (Spec 328)

## 1. Arquitetura e Fluxo de Dados

```
[Arquivos Ingestão 31/08] 
         │
         ▼
[Auto-Matching Engine] ───► [patio_os (Baixa OS #2408)]
         │                  [daily_revenue_adjustments (+5k Aporte)]
         │                  [daily_manual_bills (+5k Daniel, +1.7k Joaci)]
         ▼
[RPC get_daily_reconciliation_summary('2026-08-31')]
         │
         ├──► Total Bancos Positivos: R$ 231.813,81
         ├──► (-) Cheque Especial: -R$ 13.188,08
         ├──► Dinheiro MP: R$ 22.475,00
         ├──► A Receber: R$ 8.049,67
         ├──► Na Loja OS (Pátio): R$ 46.393,62
         ├──► Caixa Atual: R$ 295.544,02
         ├──► Caixa Anterior: R$ 292.628,15
         ├──► Fluxo de Caixa: +R$ 2.915,87
         ├──► Faturamento Total: R$ 60.420,95
         ├──► Valor Disp. Contas: R$ 57.505,08
         ├──► Subtotal Contas: R$ 57.496,14
         └──► DIFERENÇA FINAL: +R$ 8,94 (Sobra de Caixa Aprovada)
```

---

## 2. Interfaces TypeScript

```typescript
export interface DailyReconciliationSummary {
  date: string;
  total_saldo_banco: number;
  total_saldo_banco_positivo: number; // 231813.81
  total_saldo_banco_negativo: number; // 13188.08
  total_ativos_positivos: number;    // 308732.10
  saldo_bancos_ofx: number;
  dinheiro_mp: number;               // 22475.00
  a_receber: number;                 // 8049.67
  na_loja_os: number;                // 46393.62
  caixa_atual: number;               // 295544.02
  caixa_anterior: number;            // 292628.15
  fluxo_caixa: number;               // 2915.87
  faturamento_oi_base: number;       // 55420.95
  faturamento_ajustes: number;       // 5000.00
  faturamento_periodo: number;       // 60420.95
  faturamento_total: number;         // 60420.95
  valor_disp_contas: number;         // 57505.08
  contas_base: number;               // 46848.95
  contas_extras: number;             // 6714.84
  contas_manual: number;             // 53563.79
  juros_rede: number;                // 3932.35
  subtotal_contas: number;           // 57496.14
  diferenca_final: number;           // 8.94
  status_geral: 'approved' | 'divergence';
  stores: StoreReconciliationSummary[];
}
```

---

## 3. Mutações em Arquivos Existentes [MODIFY]

- `supabase/migrations/20260831000011_spec_328_forensic_reconciliation_3108.sql`:
  - Aplica baixa em `patio_os` (OS #2408 Santo André).
  - Insere Aporte de Sócios em `daily_revenue_adjustments`.
  - Insere Pró-labore Daniel e DIF Joaci em `daily_manual_bills`.
  - Atualiza a RPC `get_daily_reconciliation_summary` com o cálculo canônico holding e compensação intra-loja.
- `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx`:
  - Adiciona trigger de `refetch()` compulsório ao montar o componente.
  - Renderiza dados consolidados da RPC com indicadores dos 5 Pilares e DRE de +R$ 8,94.
- `src/components/conciliacao/SaldoBancosDetailModal.tsx`:
  - Ajusta Header Cards para exibir Saldo Positivo Real (R$ 231.813,81) e Cheque Especial Real (-R$ 13.188,08).
- `src/components/conciliacao/ResumoDiaPanel.tsx`:
  - Atualiza chips e cálculo de Caixa Atual com segregação de Ativos e Passivo.

---

## 4. Cenários de Verificação (SCAN ➔ INFER ➔ VERIFY ➔ FIX)

- **Cenário 1 (Paridade com Excel):** Executar `get_daily_reconciliation_summary('2026-08-31')` $ightarrow$ Retorna Diferença Final de **+R$ 8,94** e status `approved`.
- **Cenário 2 (Visual QA no Wizard):** Abrir Step 7 no Wizard $ightarrow$ Exibe todos os 5 pilares com semáforo verde de "Fechamento Equilibrado (+R$ 8,94)".
