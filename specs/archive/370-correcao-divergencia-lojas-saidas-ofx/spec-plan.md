# 📋 Plano de Implementação: Correção de Divergências de Saídas OFX por Filial

**Spec ID:** `370-correcao-divergencia-lojas-saidas-ofx`  
**Data:** 04/09/2026  
**Status:** Concluído  

---

## Checklist de Tarefas Atômicas

- [x] **Task 1: [DB] Criar Migration para RPC `get_daily_reconciliation_summary` e Backfill de Kennedy**
  - Criar `supabase/migrations/20260904000034_fix_store_saidas_divergences.sql`.
  - Na CTE `bills_store_agg`: associar contas com `store_id IS NULL` que tenham transações pareadas (`matched_ofx_id` ou `matched_bill_id`) à loja pagadora correspondente.
  - Na apuração do split de saídas por filial:
    - `saidas_orfas`: soma de débitos com `matched_bill_id IS NULL AND manual_category IS NULL`.
    - `contas_conciliadas`: `ofx_saidas_total - saidas_orfas`.
    - `dif_saidas`: `saidas_orfas` (eliminando a dupla contagem `contas_loja_total + saidas_justificadas`).
    - `status`: `'approved'` quando `dif_entradas <= 0.05 AND dif_saidas <= 0.05`.
  - Executar backfill determinístico para o dia `2026-09-04` vinculando os 6 débitos de Kennedy (`st-04`) às 6 contas corporativas de `daily_manual_bills` (MP Master, Sky Automotive, David de Oliveira, Brooow), atualizando `store_id = 'st-04'`, `matched_ofx_id` e `matched_bill_id`.

- [x] **Task 2: [DB] Aplicar Migration no Supabase via script de execução direta**
  - Aplicar a migration `20260904000034_fix_store_saidas_divergences.sql` no banco Supabase em produção/staging.
  - Verificar a execução e ausência de erros na recriação da função.

- [x] **Task 3: [FRONTEND] Ajustar Consumo e Tratamento Defensivo em `ConciliacaoLojasView.tsx`**
  - Garantir que `ConciliacaoLojasView.tsx` consuma diretamente `rawLog.contas_conciliadas` e `rawLog.dif_saidas` da RPC sem fallbacks que reintroduzam a soma aritmética duplicada.
  - Validar badges e cores de status (verde para `approved`, vermelho para divergências reais).

- [x] **Task 4: [FRONTEND] Persistência de Auto-Match em `StoreExtratoBancarioView.tsx`**
  - Implementar recurso para consolidar no banco os pares identificados pelo algoritmo fuzzy de despesas (`matchExpenseWithOfxDebit`), atualizando `matched_bill_id` e `matched_ofx_id` via Supabase.
  - Assegurar invalidação de cache do React Query (`daily_reconciliation_summary`, `transactions`, `daily_manual_bills`).

- [x] **Task 5: [TEST] Validação Forense das Filiais via Script e Build Gate**
  - Rodar script Node contra a RPC `get_daily_reconciliation_summary` para `2026-09-04`:
    - Confirmar que Kennedy (`st-04`) exibe `dif_saidas: 0` e `status: 'approved'`.
    - Confirmar que Santo André (`st-08`) exibe `dif_saidas: 0` e `status: 'approved'`.
    - Confirmar que Planalto (`st-06`) exibe `dif_saidas` coerente (apenas o boleto pendente real de R$ 270,00, sem o erro de -R$ 5.000,00).
  - Executar `npm run build` para garantir zero erros de TypeScript e Lint.
