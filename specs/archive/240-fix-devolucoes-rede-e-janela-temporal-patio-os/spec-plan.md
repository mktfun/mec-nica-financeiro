# Spec Plan: Fix de Devoluções da Rede e Janela Temporal de OS no Pátio (Spec 240)

## Tasks

### BACKEND — Schema

- [x] [BACKEND] Criar migration `20260819000000_fix_devolucoes_rede_temporal.sql`:
  - ADD COLUMN `transaction_type text NOT NULL DEFAULT 'venda' CHECK (transaction_type IN ('venda','devolucao'))` em `pos_transactions`
  - ADD COLUMN `last_payment_date date` em `patio_os`
  - CREATE INDEX `idx_patio_os_last_payment_date` em `patio_os(last_payment_date)`

### BACKEND — RPCs

- [x] [BACKEND] Criar migration `20260819000001_fix_rpcs_devolucoes_temporal.sql`:
  - DROP e recriar `get_store_pos_triple_reconciliation(p_date date)`:
    - CTE `rede_store`: filtra `transaction_type = 'venda'` para `rede_liquido`; soma `transaction_type = 'devolucao'` para `devolucoes`
    - Retornar novo campo `total_devolucoes` no JSON de saída
  - DROP e recriar `get_daily_reconciliation_summary(p_date date)`:
    - CTE `patio_store`: substituir `COALESCE(paid_value, 0)` por `effective_paid_value` com CASE de `last_payment_date`
    - Nova variável `v_devolucoes_rede`: soma de `total_devolucoes` da conciliação tripla OU direto de `pos_transactions WHERE transaction_type = 'devolucao'`
    - `v_subtotal_contas := v_juros_rede + v_contas_manual + v_devolucoes_rede`
    - Retornar novo campo `devolucoes_rede` no JSON de saída

### FRONTEND — Hooks e Tipos

- [x] [FRONTEND] Atualizar `useBackendConciliacao.ts`:
  - Adicionar `devolucoes_rede: number` na interface `DailyReconciliationSummary`
  - Adicionar `total_devolucoes: number` na interface `PosTripleReconciliationResult`
  - Adicionar `transaction_type: 'venda' | 'devolucao'` no tipo de `pos_transactions` em `types.ts`
  - Adicionar `last_payment_date: string | null` no tipo de `patio_os` em `types.ts`

- [x] [FRONTEND] Atualizar `savePatioOsAndReceivables()` em `useImportProcessor.ts`:
  - No payload de `patio_os`, adicionar `last_payment_date: delta_paid > 0 ? targetDate : undefined`
  - Garantir que `targetDate` seja passado corretamente em todos os call sites

- [x] [FRONTEND] Atualizar `useCentralImport.ts`:
  - No parser/importador de `pos_transactions` (extrato Rede), detectar devoluções:
    - Se `net_amount < 0` OU label contém `DEVOLUCAO`, `ESTORNO`, `CHARGEBACK`, `REVERSAL` → `transaction_type = 'devolucao'`
    - Caso contrário → `transaction_type = 'venda'` (default)
  - Gravar campo `transaction_type` no INSERT de `pos_transactions`

### FRONTEND — UI

- [x] [FRONTEND] Atualizar `ResumoDiaPanel.tsx`:
  - No Pilar 5 (Contas do Dia), adicionar sub-linha `Devoluções REDE: - R$ X` quando `summary.devolucoes_rede > 0`
  - Cor: `text-rose-400`, fonte: `font-mono text-[11px]`
  - Ocultar a sub-linha se `devolucoes_rede === 0`

- [x] [FRONTEND] Atualizar `MaquininhasDetailModal.tsx`:
  - Adicionar 5º KPI card: "Devoluções (Estorno)" com `total_devolucoes`
  - Cor: rose-400/500
  - Grid KPI: mudar de `grid-cols-4` para `grid-cols-5` (ou `grid-cols-2 sm:grid-cols-3` responsivo)

### TESTES / VERIFICAÇÃO

- [x] [TEST] Cenário 1 (Bug 1 — Devolução): Verificar que importação de extrato Rede com `net_amount < 0` grava `transaction_type = 'devolucao'` no banco e que `total_nao_entrou` NÃO inclui esse valor.
- [x] [TEST] Cenário 2 (Bug 2 — Âncora Temporal): OS aberta em D-1 com `paid_value = 0`. Pagar R$ X em D. Verificar que conciliação de D-1 mostra OS com saldo `total_value` (sem dedução). Verificar que conciliação de D mostra OS com saldo `total_value - X`.
- [x] [TEST] Cenário 3 (Regressão — OSs antigas): OSs existentes sem `last_payment_date = NULL` → comportamento idêntico ao atual (usa `paid_value` atual). Zero regressão.
- [x] [TEST] Cenário 4 (Pilar 5 UI): Verificar que sub-linha "Devoluções REDE" aparece apenas quando `devolucoes_rede > 0`.
- [x] [TEST] Build de produção: `npm run build` sem erros TypeScript.
