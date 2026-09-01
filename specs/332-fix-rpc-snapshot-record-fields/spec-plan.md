# Spec-Plan: Correção de Acesso a Campos de Snapshot na RPC (332)

- [x] **Step 1:** Criar a migration `supabase/migrations/20260901000009_fix_snapshot_record_fields.sql`.
  - [x] Reescrever `get_daily_reconciliation_summary` substituindo os acessos diretos de `v_snapshot` por `(v_snapshot.metadata->>'...')::numeric` para todos os campos não físicos (`caixa_anterior`, `fluxo_caixa`, `faturamento_anterior`, `faturamento_periodo`, `valor_disp_contas`/`valor_disponivel`).
  - [x] Garantir que o `status_geral` retornado seja unificado e consistente (`'approved'` ou `'divergent'` / `'balanced'`).
- [x] **Step 2:** Executar a migration no Supabase via script de Management API (`scripts/apply_0009.cjs`).
- [x] **Step 3:** Validar chamada da RPC via script Node para data aberta (01/09/2026) e data histórica (17/08/2026), garantindo retorno 200/JSONB sem erro `42703`.
- [x] **Step 4:** Notificar o usuário para recarregar `http://localhost:8080/` e testar no navegador.
