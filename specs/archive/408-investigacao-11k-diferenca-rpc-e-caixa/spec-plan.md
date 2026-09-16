# Plano de Execução — Spec 408: Resolução de Saldo Bancário, Dinheiro no Cofre e RPC

## Tasks

- [x] **Task 1: Correção no Frontend (`ResumoDiaPanel.tsx` e `useBackendConciliacao.ts`)**
  - Remover a supressão indevida `cashToConsolidate = hasDinheiroManual ? 0 : effectiveDinheiro`.
  - Garantir que o Card 1 `SALDO BANCOS + DINHEIRO` some os R$ 3.918,50 de Dinheiro no Cofre das Lojas, totalizando **R$ 162.826,27** (igualando rigorosamente ao modal `SaldoBancosDetailModal`).
  - Limpar a tag residual `(Consol. no MP)` do chip de Dinheiro no Cofre.

- [x] **Task 2: Correção na RPC SQL (`get_daily_reconciliation_summary`)**
  - Criar migração SQL atualizando `get_daily_reconciliation_summary` para filtrar estritamente `status IN ('em_transito', 'pending')` tanto em `v_dinheiro_lojas` quanto na CTE `vault_agg` de filiais.
  - Testar a chamada da RPC via script headless confirmando que `dinheiro_lojas` retorna exatamente **3.918,50** (e não 23.578,50).

- [x] **Task 3: Validação da Reatividade da Baixa de Dinheiro**
  - Validar que ao dar baixa no modal de uma filial, o dinheiro passa para `depositado` e migra para o saldo bancário da filial sem duplicar nem sumir.
  - Validar que enquanto não houver baixa, o dinheiro é mantido na coluna e no card como Dinheiro no Cofre ativo.

- [/] **Task 4: Build Gate & Validação em Localhost 8080**
  - Executar `npm run build` com código 0.
  - Validar a tela em `http://localhost:8080/conciliacao?date=2026-09-16`.

