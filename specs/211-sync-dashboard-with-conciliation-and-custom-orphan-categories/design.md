# Design: 211-sync-dashboard-with-conciliation-and-custom-orphan-categories

## 1. Arquitetura 100% Backend (PostgreSQL RPC)

```
  ┌────────────────────────────────────────────────────────┐
  │                 PostgreSQL RPC Engine                  │
  │            get_dashboard_metrics(p_date)               │
  │                                                        │
  │  - Saldo Total: R$ 151.034,58 (ou consolidado)        │
  │  - Caixa Atual: R$ 287.964,69                          │
  │  - Caixa Anterior: R$ 258.736,15                       │
  │  - Fluxo de Caixa: R$ 29.228,54                        │
  │  - Faturamento Atual: R$ 75.004,28                     │
  │  - Faturamento Anterior: R$ 52.120,77                  │
  │  - Variação: +43.9%                                    │
  │  - Contas a Pagar: R$ 45.772,51                        │
  │  - Diferença Final: R$ 0,00 (Conciliado!)              │
  │  - Veículos Pátio: 46 ud. (R$ 113.170,11)              │
  │  - porLoja[] (Saldos, Faturamento, Contas OFX, Pátio)  │
  │  - historicoMacro[] (7 dias de fechamentos)            │
  └───────────────────────────┬────────────────────────────┘
                              │
                    (Única Chamada RPC)
                              │
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │                 useBackendDashboard.ts                 │
  │           (Pass-through transparente para UI)          │
  └───────────────────────────┬────────────────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │                 src/routes/index.tsx                   │
  │                 (Renderização Direta)                  │
  └────────────────────────────────────────────────────────┘
```

## 2. Detalhes de Implementação

### 2.1 RPC `get_dashboard_metrics(p_date DATE)`
- Arquivo de Migration: `supabase/migrations/20260815181500_harden_dashboard_rpc_v2.sql`.
- Toda a lógica de odômetro, deltas, saldos por filial, saídas de contas bancárias por loja e agregação do pátio roda em CTEs isoladas dentro da função SQL.

### 2.2 `src/components/conciliacao/OrphanCategorizationModal.tsx`
- Adição de campo `<input type="text" />` para digitação livre de categoria + chips rápidos.

### 2.3 `src/hooks/useBackendDashboard.ts`
- Remove qualquer cálculo redundante no client; passa os dados da RPC diretamente.
