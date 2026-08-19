# Design: RPC de Limpeza Geral Atômica & Sincronização de Marco Zero (Spec 238)

## 1. Arquitetura de Limpeza Transacional

```
[UI: Botão "Limpar Todos os Dados"]
                │
                ▼
      useClearAllData()
                │
                ▼
  supabase.rpc('clear_all_financial_data')
                │
    ┌───────────┴───────────────────────────────┐
    │  PostgreSQL (SECURITY DEFINER)            │
    │  TRUNCATE TABLE ... CASCADE:              │
    │  - ofx_transactions                       │
    │  - pos_transactions                       │
    │  - patio_os                               │
    │  - estoque_os_pendente                    │
    │  - reconciliations                        │
    │  - reconciliacoes_triplas                 │
    │  - daily_snapshots                        │
    │  - dashboard_daily_logs                   │
    │  - conciliation_daily_logs                │
    │  - conciliation_matches                   │
    │  - manual_transactions                    │
    │  - receivables                            │
    │  - import_logs                            │
    │  - import_batches                         │
    │  - cash_registers                         │
    │  - transactions                           │
    │  - oficina_contas                         │
    │  - oficina_os_cache                       │
    │  - audit_logs                             │
    │  - alerts                                 │
    └───────────────────────────────────────────┘
```

---

## 2. Fluxo de Implantação e Contabilização do Marco Zero

```
[Planilha Excel Marco Zero: CONCILIAÇÃO 1408.xlsx]
                │
                ▼
       marcoZeroParser.ts
   ├── Aba SALDO: Varredura multi-linha por loja (Linha N: Loja, Linha N+1: Saldo)
   │   └── Calcula saldoBancos (R$ 170.244,95)
   ├── Aba OS: Varredura de OSs abertas (filtra status pago)
   │   └── Calcula totalPatio (R$ 107.229,76)
   └── Extração Global:
       └── Dinheiro MP (R$ 13.066), A Receber (R$ 10.694,50), Negativo (R$ 11.849,09)
                │
                ▼
   process_marco_zero_import (PostgreSQL)
   ├── Cast explícito: v_target_date date := p_target_date::date
   ├── Grava reconciliations para as 10 lojas com o saldo de cada unidade
   ├── Grava patio_os para todas as ordens legadas
   └── Grava daily_snapshots com:
       - saldo_bancario = v_saldo_bancos (R$ 170.244,95)
       - total_patio = v_total_patio (R$ 107.229,76)
       - caixa_atual = R$ 289.386,12
       - metadata.is_marco_zero = true
       - metadata.caixa_anterior = R$ 258.736,15
       - metadata.faturamento_anterior = R$ 496.797,82
                │
                ▼
   get_daily_reconciliation_summary (PostgreSQL)
   └── Detecta is_marco_zero = true:
       ├── Pilar 1 (Saldo Bancos): R$ 170.244,95
       ├── Pilar 2 (Dinheiro MP): R$ 13.066,00
       ├── Pilar 3 (A Receber): R$ 10.694,50
       ├── Pilar 4 (Na Loja OS): R$ 107.229,76
       ├── Caixa Atual: R$ 289.386,12
       ├── Caixa Anterior: R$ 258.736,15
       ├── Fluxo de Caixa: R$ 30.649,97
       ├── Faturamento Atual: R$ 76.187,25
       ├── Contas a Pagar: R$ 45.538,06
       └── Diferença Final: -R$ 0,78 (Em conformidade)
```
