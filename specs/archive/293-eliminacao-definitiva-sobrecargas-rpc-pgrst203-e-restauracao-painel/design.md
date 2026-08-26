# Design: Eliminação Definitiva de Sobrecargas de RPC (PGRST203) e Restauração do Painel (293)

## Arquitetura de Assinaturas Canônicas

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          CATÁLOGO POSTGRESQL & POSTGREST RPCs                          │
├───────────────────────────────────┬────────────────────────────────────────────────────┤
│ FUNÇÃO CANÔNICA                   │ ASSINATURA ÚNICA POSTGREST-SAFE                    │
├───────────────────────────────────┼────────────────────────────────────────────────────┤
│ get_daily_reconciliation_summary  │ (p_date text, p_force_dynamic boolean DEFAULT false│
├───────────────────────────────────┼────────────────────────────────────────────────────┤
│ get_store_pos_triple_reconciliat. │ (p_target_date text)                               │
├───────────────────────────────────┼────────────────────────────────────────────────────┤
│ get_raw_os_data                   │ (p_store_id text, p_date text)                     │
├───────────────────────────────────┼────────────────────────────────────────────────────┤
│ get_store_financial_stats         │ (p_store_id text, p_start_date text, p_end_date tex│
├───────────────────────────────────┼────────────────────────────────────────────────────┤
│ get_receivables_summary           │ (p_date text DEFAULT NULL)                         │
└───────────────────────────────────┴────────────────────────────────────────────────────┘
```

## Migration SQL de Desambiguação (`20260826000003_drop_all_conflicting_rpc_overloads.sql`)

```sql
-- 1. Expurgar todas as sobrecargas antigas
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(date, boolean);
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(text, boolean);
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(date);
DROP FUNCTION IF EXISTS public.get_daily_reconciliation_summary(text);

DROP FUNCTION IF EXISTS public.get_store_pos_triple_reconciliation(date);
DROP FUNCTION IF EXISTS public.get_store_pos_triple_reconciliation(text);
DROP FUNCTION IF EXISTS public.get_store_pos_triple_reconciliation(date, date);
DROP FUNCTION IF EXISTS public.get_store_pos_triple_reconciliation(text, text);

DROP FUNCTION IF EXISTS public.get_raw_os_data(uuid, date);
DROP FUNCTION IF EXISTS public.get_raw_os_data(text, date);
DROP FUNCTION IF EXISTS public.get_raw_os_data(text, text);

DROP FUNCTION IF EXISTS public.get_store_financial_stats(uuid, date, date);
DROP FUNCTION IF EXISTS public.get_store_financial_stats(text, date, date);
DROP FUNCTION IF EXISTS public.get_store_financial_stats(text, text, text);

DROP FUNCTION IF EXISTS public.get_receivables_summary();
DROP FUNCTION IF EXISTS public.get_receivables_summary(date);
DROP FUNCTION IF EXISTS public.get_receivables_summary(text);
```

## Cenários de Teste

- **Cenário 1 (get_daily_reconciliation_summary):**
  - Requisição: `supabase.rpc('get_daily_reconciliation_summary', { p_date: '2026-08-26' })`
  - *Resultado:* Retorna 200 OK com resumo populado (`saldo_bancos_ofx`, `cartoes_a_compensar`, `caixa_atual`), ZERO PGRST203.
- **Cenário 2 (get_store_pos_triple_reconciliation):**
  - Requisição: `supabase.rpc('get_store_pos_triple_reconciliation', { p_target_date: '2026-08-26' })`
  - *Resultado:* Retorna 200 OK com array das 10 lojas populado, ZERO PGRST203.
- **Cenário 3 (Auditoria de Catálogo pg_proc):**
  - Query: `SELECT proname, COUNT(*) FROM pg_proc WHERE ... GROUP BY proname HAVING COUNT(*) > 1`
  - *Resultado:* 0 funções duplicadas.
