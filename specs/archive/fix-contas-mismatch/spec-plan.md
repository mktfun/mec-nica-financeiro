# Spec Plan: Fix Contas Manual Mismatch

[x] 1. Analisar divergência matemática entre Modal (32k) e Dashboard (22k)
[x] 2. Descobrir Root Cause Bayesiana (RPC exclui contas marcadas como `paid_cash` gerando erro matemático no Fluxo de Caixa).
[x] 3. Alterar `src/hooks/useBackendConciliacao.ts` para buscar `daily_manual_bills` via fetcher extra (overlap tático).
[x] 4. Recalcular `finalSubtotalContas` baseado unicamente em `totalManualBills`.
[x] 5. Ajustar o objeto retornado (overriding `raw.contas_manual` com `totalManualBills`).
[x] 6. Validar compilação (`npm run build`).

*(Note: The plan has already been executed defensively to ensure strict functional stability during this session).*
