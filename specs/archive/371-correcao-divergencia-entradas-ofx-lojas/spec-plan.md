# 📋 Plano de Implementação: Correção de Divergência de Entradas OFX por Filial

**Spec ID:** `371-correcao-divergencia-entradas-ofx-lojas`  
**Data:** 04/09/2026  
**Status:** Concluído  

---

## Checklist de Tarefas Atômicas

- [x] **Task 1: [DB] Criar Migration para RPC `get_daily_reconciliation_summary` com saneamento de Entradas**
  - Criar `supabase/migrations/20260904000035_fix_store_entradas_orfas.sql`.
  - Na CTE `ofx_entradas_agg`: excluir explicitamente transações de adquirente (`REDE`, `CARD`, `CIELO`, `STONE`, `PAGSEGURO`) da agregação de `entradas_orfas`.
  - Na projeção `v_stores_detail`:
    - `dif_entradas`: calcular linearmente como `(ofx_entradas_total - entradas_conciliadas)`.
    - `status`: marcar `'approved'` quando `ABS(dif_entradas) <= 0.05 AND ABS(dif_saidas) <= 0.05`.

- [x] **Task 2: [DB] Aplicar Migration no Supabase via script headless**
  - Executar a migration `20260904000035_fix_store_entradas_orfas.sql` no banco Supabase.
  - Verificar a ausência de erros na recriação da função.

- [x] **Task 3: [FRONTEND] Blindar cálculo de `orfasEntradas` em `ConciliacaoLojasView.tsx`**
  - Garantir que `orfasEntradas` sempre reflita `ofxEntradas - concEntradas` prevenindo sobreposições espúrias.

- [x] **Task 4: [TEST] Validação Forense de todas as 10 Filiais via Script e Build Gate**
  - Executar script Node contra a RPC `get_daily_reconciliation_summary('2026-09-04', true)`.
  - Confirmar que todas as 10 lojas possuem `dif_entradas: 0.00`, `dif_saidas: 0.00` e `status: 'approved'`.
  - Executar `npm run build` para garantir integridade TypeScript e empacotamento.
