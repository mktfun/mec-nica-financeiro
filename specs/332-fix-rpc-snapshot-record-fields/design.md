# Design: Correção de Acesso a Campos de Snapshot na RPC (332)

## Arquitetura e Fluxo de Dados
UI (`conciliacao.index.tsx`) → Hook (`useDailyReconciliationSummary`) → RPC Supabase (`get_daily_reconciliation_summary`) → Tabela `daily_snapshots` / CTEs dinâmicas → Retorno JSONB

## Mutações em Arquivos Existentes [MODIFY]
- `supabase/migrations/20260901000009_fix_snapshot_record_fields.sql`:
  - `CREATE OR REPLACE FUNCTION public.get_daily_reconciliation_summary` corrigindo os acessos diretos a `v_snapshot.caixa_anterior`, `v_snapshot.fluxo_caixa`, `v_snapshot.faturamento_anterior`, `v_snapshot.faturamento_periodo`, `v_snapshot.valor_disponivel` para lerem de `(v_snapshot.metadata->>'...')::numeric`.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (Snapshot Fechado):** Chamar `get_daily_reconciliation_summary` para uma data histórica selada (ex: '2026-08-17' ou '2026-08-24') → Retorno JSON com `is_closed: true` sem erro 42703, populando `caixa_anterior`, `fluxo_caixa`, `faturamento_periodo`.
- **Cenário 2 (Dia Aberto / Hoje):** Chamar `get_daily_reconciliation_summary` para '2026-09-01' → Cálculo dinâmico das 10 lojas e métricas sem exceções no console.
