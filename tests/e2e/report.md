# E2E Test Execution Report

**Date**: 2026-09-17T17:11:29.774Z
**Total Tests**: 291 | **Passed**: 221 | **Failed**: 70
**Duration**: 123.34s

## Tier Summary

| Tier | Description | Suites | Passed | Failed | Pass Rate |
|---|---|---|---|---|---|
| Tier 1 | Tier 1: Feature Coverage (Features 1–22) | 6 | 70 | 42 | 62.5% |
| Tier 2 | Tier 2: Boundary & Corner Cases | 6 | 100 | 10 | 90.9% |
| Tier 3 | Tier 3: Pairwise Cross-Feature Combinations | 5 | 19 | 6 | 76.0% |
| Tier 4 | Tier 4: Real-World Dates & Snapshots | 2 | 32 | 12 | 72.7% |

## Suite Details

| Suite | Tier | File | Passed | Failed | Status |
|---|---|---|---|---|---|
| M1: SSOT Calculator (Features 1–5) | Tier 1 | `tests/e2e/tier1_features/m1_ssot_calculator.test.mjs` | 14 | 11 | ❌ FAIL (Pending) |
| M2: Frontend SSOT Hook & Math Purge (Features 6–9) | Tier 1 | `tests/e2e/tier1_features/m2_frontend_ssot.test.mjs` | 11 | 9 | ❌ FAIL (Pending) |
| M3: Backend-First Fechamento (Features 10–13) | Tier 1 | `tests/e2e/tier1_features/m3_backend_closing.test.mjs` | 13 | 7 | ❌ FAIL (Pending) |
| M4: Status Standardization (Features 14–17) | Tier 1 | `tests/e2e/tier1_features/m4_status_standards.test.mjs` | 18 | 2 | ❌ FAIL (Pending) |
| M5: Real Table Write Paths (Features 18–20) | Tier 1 | `tests/e2e/tier1_features/m5_write_paths.test.mjs` | 10 | 5 | ❌ FAIL (Pending) |
| M6: User Flow Simplification (Features 21–22) | Tier 1 | `tests/e2e/tier1_features/m6_user_flow.test.mjs` | 4 | 8 | ❌ FAIL (Pending) |
| M1 Boundary: Calculator & Invariants (Features 1–5) | Tier 2 | `tests/e2e/tier2_boundary/m1_calculator_boundary.test.mjs` | 24 | 1 | ❌ FAIL (Pending) |
| M2 Boundary: Frontend Hook & Math (Features 6–9) | Tier 2 | `tests/e2e/tier2_boundary/m2_frontend_boundary.test.mjs` | 18 | 2 | ❌ FAIL (Pending) |
| M3 Boundary: Closing & Protection (Features 10–13) | Tier 2 | `tests/e2e/tier2_boundary/m3_closing_boundary.test.mjs` | 19 | 1 | ❌ FAIL (Pending) |
| M4 Boundary: Status Constraints (Features 14–17) | Tier 2 | `tests/e2e/tier2_boundary/m4_status_boundary.test.mjs` | 16 | 4 | ❌ FAIL (Pending) |
| M5 Boundary: Physical Writes & Views (Features 18–20) | Tier 2 | `tests/e2e/tier2_boundary/m5_write_boundary.test.mjs` | 15 | 0 | ✅ PASS |
| M6 Boundary: Wizard Flow & Invariants (Features 21–22) | Tier 2 | `tests/e2e/tier2_boundary/m6_flow_boundary.test.mjs` | 8 | 2 | ❌ FAIL (Pending) |
| Pairwise M1 ↔ M2: DB Summary ↔ Frontend Hook | Tier 3 | `tests/e2e/tier3_combinations/pairwise_m1_m2.test.mjs` | 1 | 4 | ❌ FAIL (Pending) |
| Pairwise M1 ↔ M3: SSOT Calculator ↔ Closing Snapshot | Tier 3 | `tests/e2e/tier3_combinations/pairwise_m1_m3.test.mjs` | 5 | 0 | ✅ PASS |
| Pairwise M3 ↔ M4: Closing Pipeline ↔ Status Enums | Tier 3 | `tests/e2e/tier3_combinations/pairwise_m3_m4.test.mjs` | 5 | 0 | ✅ PASS |
| Pairwise M4 ↔ M5: Status Standards ↔ Physical Writes | Tier 3 | `tests/e2e/tier3_combinations/pairwise_m4_m5.test.mjs` | 4 | 1 | ❌ FAIL (Pending) |
| Pairwise M2 ↔ M6: Frontend SSOT ↔ Wizard Step 4 | Tier 3 | `tests/e2e/tier3_combinations/pairwise_m2_m6.test.mjs` | 4 | 1 | ❌ FAIL (Pending) |
| Real Dates Audit (17, 18, 19, 21, 24/08 & 16/09) | Tier 4 | `tests/e2e/tier4_real_world/real_dates_audit.test.mjs` | 27 | 11 | ❌ FAIL (Pending) |
| Frozen Closed Snapshot Audit & Immutability | Tier 4 | `tests/e2e/tier4_real_world/closed_snapshot_audit.test.mjs` | 5 | 1 | ❌ FAIL (Pending) |

## Defect Escalation & Pending Implementation Gaps

### 1. F1-T1: should return a single comprehensive day object matching interface contract (1216.4462ms)
- **Suite**: M1: SSOT Calculator (Features 1–5) (Tier 1)
- **File**: `tests/e2e/tier1_features/m1_ssot_calculator.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Summary missing canonical fields: is_marco_zero, closed_at, odometro_anterior`

### 2. F1-T3: should return stores breakdown array with 10 stores (493.8734ms)
- **Suite**: M1: SSOT Calculator (Features 1–5) (Tier 1)
- **File**: `tests/e2e/tier1_features/m1_ssot_calculator.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Store 'Planalto - BRASICAR' missing required fields: saldo_banco_ofx, saldo_positivo_real, saldo_devedor_real, rede_taxas, rede_devolucoes, nao_entrou_valor, status_compensacao, status_banco, entradas_realizadas, entradas_previsto, diferenca_entradas, saidas_ofx, contas_loja`

### 3. F1-T4: should provide dual split for bank balances (saldo_positivo_real and saldo_devedor_real) (502.7368ms)
- **Suite**: M1: SSOT Calculator (Features 1–5) (Tier 1)
- **File**: `tests/e2e/tier1_features/m1_ssot_calculator.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Store Planalto - BRASICAR missing saldo_positivo_real`

### 4. F2-T3: closed day should return frozen snapshot data without recalculation (361.1548ms)
- **Suite**: M1: SSOT Calculator (Features 1–5) (Tier 1)
- **File**: `tests/e2e/tier1_features/m1_ssot_calculator.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Closed day must have closed_at timestamp`

### 5. F2-T5: closed day snapshot metadata should preserve cash_vault_snapshot (359.6971ms)
- **Suite**: M1: SSOT Calculator (Features 1–5) (Tier 1)
- **File**: `tests/e2e/tier1_features/m1_ssot_calculator.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Closed snapshot should preserve cash_vault_snapshot in metadata`

### 6. F3-T1: status_geral must be strictly "approved" or "divergence" (no "divergent") (505.4459ms)
- **Suite**: M1: SSOT Calculator (Features 1–5) (Tier 1)
- **File**: `tests/e2e/tier1_features/m1_ssot_calculator.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Status vocabulary violation: expected strictly 'approved' or 'divergence', received 'divergent'`

### 7. F3-T4: diferenca_final > 50.00 must produce status_geral = "divergence" (349.9325ms)
- **Suite**: M1: SSOT Calculator (Features 1–5) (Tier 1)
- **File**: `tests/e2e/tier1_features/m1_ssot_calculator.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:`

### 8. F3-T5: tolerance evaluation must be verified across tolerance calculation helper (334.6421ms)
- **Suite**: M1: SSOT Calculator (Features 1–5) (Tier 1)
- **File**: `tests/e2e/tier1_features/m1_ssot_calculator.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Tolerance rule mismatch: diferenca_final=90 should yield status='divergence', got 'divergent'`

### 9. F4-T3: frontend codebase must not contain calls to calculate_daily_conciliation (895.3671ms)
- **Suite**: M1: SSOT Calculator (Features 1–5) (Tier 1)
- **File**: `tests/e2e/tier1_features/m1_ssot_calculator.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Found 3 references to calculate_daily_conciliation in src/: src\hooks\useBackendConciliacao.ts:39, src\hooks\useBackendConciliacao.ts:41, src\integrations\supabase\types.ts:1758`

### 10. F4-T4: get_daily_reconciliation_summary must be the only reconciliation RPC in pg_proc (251.5905ms)
- **Suite**: M1: SSOT Calculator (Features 1–5) (Tier 1)
- **File**: `tests/e2e/tier1_features/m1_ssot_calculator.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: get_daily_reconciliation_summary must exist in pg_proc`

### 11. F5-T1: RPC get_daily_reconciliation_summary must not contain hardcoded "2026-09-16" values (243.3674ms)
- **Suite**: M1: SSOT Calculator (Features 1–5) (Tier 1)
- **File**: `tests/e2e/tier1_features/m1_ssot_calculator.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Function get_daily_reconciliation_summary must exist`

### 12. F6-T1: src/hooks/useDailyReconciliationSummary.ts must exist (5.9192ms)
- **Suite**: M2: Frontend SSOT Hook & Math Purge (Features 6–9) (Tier 1)
- **File**: `tests/e2e/tier1_features/m2_frontend_ssot.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Canonical hook src/hooks/useDailyReconciliationSummary.ts does not exist!`

### 13. F7-T2: codebase must NOT contain conflicting query key "daily-reconciliation-summary" (kebab-case) (229.4282ms)
- **Suite**: M2: Frontend SSOT Hook & Math Purge (Features 6–9) (Tier 1)
- **File**: `tests/e2e/tier1_features/m2_frontend_ssot.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Found legacy kebab-case query key in: src\components\conciliacao\BaixaDinheiroModal.tsx:177, src\components\conciliacao\CashVaultCompositionModal.tsx:315, src\components\conciliacao\CashVaultCompositionModal.tsx:413, src\components\conciliacao\CashVaultCompositionModal.tsx:437, src\components\conciliacao\CashVaultCompositionModal.tsx:501, src\components\conciliacao\CashVaultCompositionModal.tsx:589, src\components\conciliacao\ContasManualModal.tsx:172, src\components\conciliacao\ContasManualModal.tsx:220, src\components\conciliacao\ContasManualModal.tsx:259, src\components\conciliacao\ContasManualModal.tsx:280, src\components\conciliacao\ContasManualModal.tsx:298, src\components\conciliacao\FaturamentoDetalhesModal.tsx:112, src\components\conciliacao\FaturamentoDetalhesModal.tsx:147, src\components\conciliacao\FaturamentoDetalhesModal.tsx:165, src\components\conciliacao\PatioOsDetailModal.tsx:192, src\components\conciliacao\ResumoDiaPanel.tsx:502, src\components\conciliacao\ResumoDiaPanel.tsx:1306, src\components\conciliacao\SaldoBancosDetailModal.tsx:343, src\components\conciliacao\SaldoBancosDetailModal.tsx:360, src\components\conciliacao\StoreExtratoBancarioView.tsx:242, src\components\conciliacao\StoreExtratoBancarioView.tsx:426, src\components\conciliacao\StoreExtratoBancarioView.tsx:588, src\components\conciliacao\StoreExtratoBancarioView.tsx:609, src\components\conciliacao\StoreOrdensServicoView.tsx:152, src\components\conciliacao\StoreOrdensServicoView.tsx:249, src\components\importacoes\CentralImportWizard.tsx:2181, src\components\importacoes\CentralImportWizard.tsx:2251, src\components\importacoes\wizard\Step2NonRevenueJustifications.tsx:534, src\components\importacoes\wizard\Step2NonRevenueJustifications.tsx:571, src\hooks\useAutonomousReconciliation.ts:22, src\hooks\useBackendConciliacao.ts:227, src\hooks\useCategorizeOrphan.ts:189, src\hooks\useContasAPagarImport.ts:136, src\hooks\useManualMatch.ts:187, src\hooks\useManualMatch.ts:235, src\hooks\useManualMatch.ts:270, src\hooks\useManualMatch.ts:331, src\hooks\usePurgeDailyData.ts:30, src\hooks\useRecebiveis.ts:168, src\hooks\useRecebiveis.ts:200, src\hooks\useRecebiveis.ts:222, src\hooks\useRecebiveis.ts:241, src\hooks\useRecebiveis.ts:277, src\hooks\useRecebiveis.ts:331`

### 14. F7-T3: codebase must NOT contain conflicting query key "backend-conciliacao" (223.9502ms)
- **Suite**: M2: Frontend SSOT Hook & Math Purge (Features 6–9) (Tier 1)
- **File**: `tests/e2e/tier1_features/m2_frontend_ssot.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Found legacy query key 'backend-conciliacao' in: src\components\conciliacao\BaixaDinheiroModal.tsx:183, src\components\conciliacao\CashVaultCompositionModal.tsx:317, src\components\conciliacao\CashVaultCompositionModal.tsx:416, src\components\conciliacao\CashVaultCompositionModal.tsx:504, src\components\conciliacao\CashVaultCompositionModal.tsx:591, src\components\conciliacao\ContasManualModal.tsx:173, src\components\conciliacao\ContasManualModal.tsx:221, src\components\conciliacao\ContasManualModal.tsx:260, src\components\conciliacao\ContasManualModal.tsx:281, src\components\conciliacao\ContasManualModal.tsx:299, src\components\conciliacao\FaturamentoDetalhesModal.tsx:113, src\components\conciliacao\FaturamentoDetalhesModal.tsx:148, src\components\conciliacao\FaturamentoDetalhesModal.tsx:166, src\components\conciliacao\PatioOsDetailModal.tsx:198, src\components\conciliacao\ResumoDiaPanel.tsx:503, src\components\conciliacao\ResumoDiaPanel.tsx:1310, src\components\conciliacao\SaldoBancosDetailModal.tsx:349, src\components\conciliacao\SaldoBancosDetailModal.tsx:366, src\components\conciliacao\StoreExtratoBancarioView.tsx:244, src\components\conciliacao\StoreExtratoBancarioView.tsx:429, src\components\conciliacao\StoreOrdensServicoView.tsx:255, src\components\importacoes\CentralImportWizard.tsx:2252, src\components\importacoes\wizard\Step2NonRevenueJustifications.tsx:535, src\components\importacoes\wizard\Step2NonRevenueJustifications.tsx:572, src\hooks\useAutonomousReconciliation.ts:23, src\hooks\useBackendConciliacao.ts:18, src\hooks\useCategorizeOrphan.ts:190, src\hooks\useContasAPagarImport.ts:138, src\hooks\useManualMatch.ts:190, src\hooks\useManualMatch.ts:238, src\hooks\useManualMatch.ts:273, src\hooks\usePurgeDailyData.ts:31`

### 15. F7-T4: codebase must NOT contain conflicting query key "daily-snapshot" or "daily_snapshots" (202.9147ms)
- **Suite**: M2: Frontend SSOT Hook & Math Purge (Features 6–9) (Tier 1)
- **File**: `tests/e2e/tier1_features/m2_frontend_ssot.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Found conflicting query key 'daily-snapshot' in: src\components\conciliacao\LegacyOsTable.tsx:56, src\components\conciliacao\PatioOsDetailModal.tsx:195, src\components\importacoes\wizard\Step2NonRevenueJustifications.tsx:538, src\components\importacoes\wizard\Step2NonRevenueJustifications.tsx:575, src\hooks\useCategorizeOrphan.ts:192`

### 16. F7-T5: cache invalidation calls in components/mutations must target ["daily_reconciliation_summary"] (122.5644ms)
- **Suite**: M2: Frontend SSOT Hook & Math Purge (Features 6–9) (Tier 1)
- **File**: `tests/e2e/tier1_features/m2_frontend_ssot.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Invalidation at src\components\conciliacao\BaixaDinheiroModal.tsx:180 does not use canonical query key`

### 17. F8-T1: ResumoDiaPanel.tsx must NOT derive financial totals using client-side math (2.1483ms)
- **Suite**: M2: Frontend SSOT Hook & Math Purge (Features 6–9) (Tier 1)
- **File**: `tests/e2e/tier1_features/m2_frontend_ssot.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: ResumoDiaPanel still contains client-side caixaAtualCalculado derivation!`

### 18. F8-T2: conciliacao.index.tsx must NOT aggregate store totals via .reduce (1.7434ms)
- **Suite**: M2: Frontend SSOT Hook & Math Purge (Features 6–9) (Tier 1)
- **File**: `tests/e2e/tier1_features/m2_frontend_ssot.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: conciliacao.index.tsx still aggregates store metrics via .reduce in browser!`

### 19. F8-T3: conciliacao.$lojaId.tsx must NOT contain client-side tolerance rules (1.5512ms)
- **Suite**: M2: Frontend SSOT Hook & Math Purge (Features 6–9) (Tier 1)
- **File**: `tests/e2e/tier1_features/m2_frontend_ssot.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: conciliacao.$lojaId.tsx contains client-side tolerance calculation!`

### 20. F9-T1: ResumoDiaPanel.tsx must consume useDailyReconciliationSummary (1.8737ms)
- **Suite**: M2: Frontend SSOT Hook & Math Purge (Features 6–9) (Tier 1)
- **File**: `tests/e2e/tier1_features/m2_frontend_ssot.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: ResumoDiaPanel must import and use useDailyReconciliationSummary`

### 21. F10-T1: fechar_dia function must exist in public schema with correct signature (787.9167ms)
- **Suite**: M3: Backend-First Fechamento (Features 10–13) (Tier 1)
- **File**: `tests/e2e/tier1_features/m3_backend_closing.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: fechar_dia function does not exist in public schema! Must be created in M3.`

### 22. F12-T3: src/components must NOT contain direct .upsert() on daily_snapshots (154.9241ms)
- **Suite**: M3: Backend-First Fechamento (Features 10–13) (Tier 1)
- **File**: `tests/e2e/tier1_features/m3_backend_closing.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Found direct upsert on daily_snapshots: src\components\importacoes\CentralImportWizard.tsx:2120`

### 23. F12-T4: CentralImportWizard.tsx must NOT contain direct daily_snapshots mutation (4.6321ms)
- **Suite**: M3: Backend-First Fechamento (Features 10–13) (Tier 1)
- **File**: `tests/e2e/tier1_features/m3_backend_closing.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: CentralImportWizard contains direct upsert on daily_snapshots!`

### 24. F12-T5: useSaveDailySnapshot hook must NOT be used to bypass backend closing (26.2955ms)
- **Suite**: M3: Backend-First Fechamento (Features 10–13) (Tier 1)
- **File**: `tests/e2e/tier1_features/m3_backend_closing.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Found useSaveDailySnapshot in reconciliation UI: src\components\conciliacao\ResumoDiaPanel.tsx:13, src\components\conciliacao\ResumoDiaPanel.tsx:81`

### 25. F13-T1: ResumoDiaPanel.tsx close action must invoke supabase.rpc("fechar_dia") (6.1178ms)
- **Suite**: M3: Backend-First Fechamento (Features 10–13) (Tier 1)
- **File**: `tests/e2e/tier1_features/m3_backend_closing.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: ResumoDiaPanel must invoke fechar_dia RPC!`

### 26. F13-T2: CentralImportWizard.tsx final step must invoke supabase.rpc("fechar_dia") (2.5314ms)
- **Suite**: M3: Backend-First Fechamento (Features 10–13) (Tier 1)
- **File**: `tests/e2e/tier1_features/m3_backend_closing.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: CentralImportWizard must invoke fechar_dia RPC!`

### 27. F13-T5: successful close must invalidate canonical query key ["daily_reconciliation_summary"] (2.2254ms)
- **Suite**: M3: Backend-First Fechamento (Features 10–13) (Tier 1)
- **File**: `tests/e2e/tier1_features/m3_backend_closing.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Successful close must invalidate daily_reconciliation_summary query`

### 28. F15-T1: src/types/status.ts must exist (5.6477ms)
- **Suite**: M4: Status Standardization (Features 14–17) (Tier 1)
- **File**: `tests/e2e/tier1_features/m4_status_standards.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: src/types/status.ts must exist`

### 29. F17-T2: no raw comparison match_status === "MATCHED" (uppercase) in frontend (264.485ms)
- **Suite**: M4: Status Standardization (Features 14–17) (Tier 1)
- **File**: `tests/e2e/tier1_features/m4_status_standards.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Found legacy comparison with 'MATCHED' in: src\hooks\useConciliacao.ts:344, src\hooks\useJustifiedTransactions.ts:80`

### 30. F18-T1: ofx_transactions must be a physical BASE TABLE, not a view (767.1015ms)
- **Suite**: M5: Real Table Write Paths (Features 18–20) (Tier 1)
- **File**: `tests/e2e/tier1_features/m5_write_paths.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: ofx_transactions table must exist`

### 31. F18-T2: pos_transactions must be a physical BASE TABLE, not a view (256.4843ms)
- **Suite**: M5: Real Table Write Paths (Features 18–20) (Tier 1)
- **File**: `tests/e2e/tier1_features/m5_write_paths.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: pos_transactions table must exist`

### 32. F18-T3: manual_transactions must be a physical BASE TABLE, not a view (252.4552ms)
- **Suite**: M5: Real Table Write Paths (Features 18–20) (Tier 1)
- **File**: `tests/e2e/tier1_features/m5_write_paths.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: manual_transactions table must exist`

### 33. F19-T4: useCategorizeOrphan.ts must update physical table rather than view (4.5628ms)
- **Suite**: M5: Real Table Write Paths (Features 18–20) (Tier 1)
- **File**: `tests/e2e/tier1_features/m5_write_paths.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: useCategorizeOrphan still targets view 'transactions'! It must write to ofx_transactions or pos_transactions.`

### 34. F20-T1: src/hooks must NOT query transactions view filtered by source="ofx" (37.4049ms)
- **Suite**: M5: Real Table Write Paths (Features 18–20) (Tier 1)
- **File**: `tests/e2e/tier1_features/m5_write_paths.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Found query on transactions view with source='ofx': src\hooks\useBackendConciliacao.ts:67, src\hooks\useTransactions.ts:59, src\hooks\useTransactions.ts:74, src\hooks\useTransactions.ts:120, src\hooks\useTransactions.ts:168, src\hooks\useTransactions.ts:502, src\hooks\useTransactions.ts:818. Must read ofx_transactions directly.`

### 35. F21-T2: wizard must NOT execute premature closing before exception review (6.2973ms)
- **Suite**: M6: User Flow Simplification (Features 21–22) (Tier 1)
- **File**: `tests/e2e/tier1_features/m6_user_flow.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Wizard should not perform premature JS-driven daily_snapshots closing before reviewing exceptions`

### 36. F22-T: date 2026-08-17 must produce zero discrepancy between store sums and global totals (986.0861ms)
- **Suite**: M6: User Flow Simplification (Features 21–22) (Tier 1)
- **File**: `tests/e2e/tier1_features/m6_user_flow.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Summary missing canonical fields: is_marco_zero, closed_at, odometro_anterior`

### 37. F22-T: date 2026-08-18 must produce zero discrepancy between store sums and global totals (374.297ms)
- **Suite**: M6: User Flow Simplification (Features 21–22) (Tier 1)
- **File**: `tests/e2e/tier1_features/m6_user_flow.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Summary missing canonical fields: is_marco_zero, closed_at, odometro_anterior`

### 38. F22-T: date 2026-08-19 must produce zero discrepancy between store sums and global totals (348.1816ms)
- **Suite**: M6: User Flow Simplification (Features 21–22) (Tier 1)
- **File**: `tests/e2e/tier1_features/m6_user_flow.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Summary missing canonical fields: is_marco_zero, closed_at, odometro_anterior`

### 39. F22-T: date 2026-08-21 must produce zero discrepancy between store sums and global totals (365.1815ms)
- **Suite**: M6: User Flow Simplification (Features 21–22) (Tier 1)
- **File**: `tests/e2e/tier1_features/m6_user_flow.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Summary missing canonical fields: is_marco_zero, closed_at, odometro_anterior`

### 40. F22-T: date 2026-08-24 must produce zero discrepancy between store sums and global totals (370.725ms)
- **Suite**: M6: User Flow Simplification (Features 21–22) (Tier 1)
- **File**: `tests/e2e/tier1_features/m6_user_flow.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Summary missing canonical fields: is_marco_zero, closed_at, odometro_anterior`

### 41. F22-T: date 2026-09-16 must produce zero discrepancy between store sums and global totals (407.2583ms)
- **Suite**: M6: User Flow Simplification (Features 21–22) (Tier 1)
- **File**: `tests/e2e/tier1_features/m6_user_flow.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Summary missing canonical fields: is_marco_zero, closed_at, odometro_anterior`

### 42. F22-T6: date 2026-09-16 must reflect exact OFX net balance (R$ 105.714,91) (398.9258ms)
- **Suite**: M6: User Flow Simplification (Features 21–22) (Tier 1)
- **File**: `tests/e2e/tier1_features/m6_user_flow.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Bank net balance on 2026-09-16 expected near R$ 105.714,91, got 129860.02`

### 43. F2-B4: marco zero date handling (is_marco_zero flag) (490.4757ms)
- **Suite**: M1 Boundary: Calculator & Invariants (Features 1–5) (Tier 2)
- **File**: `tests/e2e/tier2_boundary/m1_calculator_boundary.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:`

### 44. F6-B1: hook source file must handle undefined or empty date gracefully (6.042ms)
- **Suite**: M2 Boundary: Frontend Hook & Math (Features 6–9) (Tier 2)
- **File**: `tests/e2e/tier2_boundary/m2_frontend_boundary.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Hook file useDailyReconciliationSummary.ts must exist`

### 45. F9-B1: ConciliacaoLojasView must handle stores being empty array without exception (2.2526ms)
- **Suite**: M2 Boundary: Frontend Hook & Math (Features 6–9) (Tier 2)
- **File**: `tests/e2e/tier2_boundary/m2_frontend_boundary.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: ConciliacaoLojasView must guard against undefined or empty stores array`

### 46. F12-B3: static audit: no client components may directly mutate daily_snapshots table (221.9135ms)
- **Suite**: M3 Boundary: Closing & Protection (Features 10–13) (Tier 2)
- **File**: `tests/e2e/tier2_boundary/m3_closing_boundary.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Forbidden direct mutation of daily_snapshots in client components: src\components\importacoes\CentralImportWizard.tsx:2120`

### 47. F15-B1: src/types/status.ts must exist and declare "as const" on all enum dictionaries (16.1052ms)
- **Suite**: M4 Boundary: Status Constraints (Features 14–17) (Tier 2)
- **File**: `tests/e2e/tier2_boundary/m4_status_boundary.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: src/types/status.ts must exist`

### 48. F17-B2: verify zero occurrences of === "conciliado" in active logic (420.8023ms)
- **Suite**: M4 Boundary: Status Constraints (Features 14–17) (Tier 2)
- **File**: `tests/e2e/tier2_boundary/m4_status_boundary.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Found legacy raw string comparison 'conciliado' in: src\components\conciliacao\LegacyOsTable.tsx:66, src\components\conciliacao\LegacyOsTable.tsx:167, src\components\conciliacao\StoreCardModulo1.tsx:14, src\routes\conciliacao.$lojaId.tsx:86`

### 49. F17-B3: verify zero occurrences of === "pendente" in active logic (225.3539ms)
- **Suite**: M4 Boundary: Status Constraints (Features 14–17) (Tier 2)
- **File**: `tests/e2e/tier2_boundary/m4_status_boundary.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Found legacy raw string comparison 'pendente' in: src\components\importacoes\wizard\Step4FinalAuditAndClose.tsx:165, src\components\importacoes\wizard\Step4FinalAuditAndClose.tsx:180, src\components\recebiveis\StoreReceivablesCard.tsx:78, src\hooks\useConciliacao.ts:664, src\hooks\useImportProcessor.ts:232, src\hooks\useRecebiveis.ts:113, src\routes\recebiveis.tsx:85`

### 50. F17-B4: verify zero occurrences of status === "divergente" in active logic (260.502ms)
- **Suite**: M4 Boundary: Status Constraints (Features 14–17) (Tier 2)
- **File**: `tests/e2e/tier2_boundary/m4_status_boundary.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Found legacy comparison status === 'divergente' in: src\components\importacoes\wizard\PostMotorDiagnosticCockpit.tsx:263, src\components\importacoes\wizard\PostMotorDiagnosticCockpit.tsx:285, src\components\maquininhas\MdrAuditView.tsx:167, src\components\maquininhas\MdrAuditView.tsx:605, src\components\taxas\TaxasDashboardView.tsx:578, src\hooks\useMdrAudit.ts:243, src\hooks\useMdrAudit.ts:263, src\hooks\useMdrAudit.ts:324, src\lib\parsers\redeSalesParser.ts:281`

### 51. F21-B4: empty or zero files uploaded in Step 1 must not trigger closing or exception review (9.2013ms)
- **Suite**: M6 Boundary: Wizard Flow & Invariants (Features 21–22) (Tier 2)
- **File**: `tests/e2e/tier2_boundary/m6_flow_boundary.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Wizard Step 1 must validate presence of files before proceeding`

### 52. F22-B5: store totals vs macro pillars equality across multiple test dates (1319.209ms)
- **Suite**: M6 Boundary: Wizard Flow & Invariants (Features 21–22) (Tier 2)
- **File**: `tests/e2e/tier2_boundary/m6_flow_boundary.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Sum of store OFX (0.00) does not match summary saldo_bancos_ofx (129860.02)`

### 53. Pair-M1-M2-01: RPC summary payload satisfies the TypeScript interface contract expected by frontend (941.4134ms)
- **Suite**: Pairwise M1 ↔ M2: DB Summary ↔ Frontend Hook (Tier 3)
- **File**: `tests/e2e/tier3_combinations/pairwise_m1_m2.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Summary missing canonical fields: is_marco_zero, closed_at, odometro_anterior`

### 54. Pair-M1-M2-02: dual bank split (saldo_positivo_real, saldo_devedor_real) matches modal props (331.9074ms)
- **Suite**: Pairwise M1 ↔ M2: DB Summary ↔ Frontend Hook (Tier 3)
- **File**: `tests/e2e/tier3_combinations/pairwise_m1_m2.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Store Planalto - BRASICAR saldo_positivo_real must be numeric`

### 55. Pair-M1-M2-03: stores array matches ConciliacaoLojasView layout without requiring frontend aggregation (327.7072ms)
- **Suite**: Pairwise M1 ↔ M2: DB Summary ↔ Frontend Hook (Tier 3)
- **File**: `tests/e2e/tier3_combinations/pairwise_m1_m2.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Store 'Planalto - BRASICAR' missing required fields: saldo_banco_ofx, saldo_positivo_real, saldo_devedor_real, rede_taxas, rede_devolucoes, nao_entrou_valor, status_compensacao, status_banco, entradas_realizadas, entradas_previsto, diferenca_entradas, saidas_ofx, contas_loja`

### 56. Pair-M1-M2-04: status_geral directly supplies status indicator in ResumoDiaPanel without re-derivation (325.215ms)
- **Suite**: Pairwise M1 ↔ M2: DB Summary ↔ Frontend Hook (Tier 3)
- **File**: `tests/e2e/tier3_combinations/pairwise_m1_m2.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: status_geral must be strictly 'approved' or 'divergence', got 'divergent'`

### 57. Pair-M4-M5-05: physical tables retain only canonical statuses across recent records (368.499ms)
- **Suite**: Pairwise M4 ↔ M5: Status Standards ↔ Physical Writes (Tier 3)
- **File**: `tests/e2e/tier3_combinations/pairwise_m4_m5.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Found non-canonical match_status 'intercompany_paired' in recent physical table rows`

### 58. Pair-M2-M6-03: zero client-side financial aggregation in CentralImportWizard components (12.6827ms)
- **Suite**: Pairwise M2 ↔ M6: Frontend SSOT ↔ Wizard Step 4 (Tier 3)
- **File**: `tests/e2e/tier3_combinations/pairwise_m2_m6.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Component CentralImportWizard.tsx contains client-side mathematical derivations!`

### 59. Audit-2026-08-17-01: get_daily_reconciliation_summary returns valid SSOT contract (1011.2147ms)
- **Suite**: Real Dates Audit (17, 18, 19, 21, 24/08 & 16/09) (Tier 4)
- **File**: `tests/e2e/tier4_real_world/real_dates_audit.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Summary missing canonical fields: is_marco_zero, closed_at, odometro_anterior`

### 60. Audit-2026-08-17-05: status_geral matches tolerance rule (<= 50.00 approved, else divergence) (329.3853ms)
- **Suite**: Real Dates Audit (17, 18, 19, 21, 24/08 & 16/09) (Tier 4)
- **File**: `tests/e2e/tier4_real_world/real_dates_audit.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Status vocabulary violation: expected strictly 'approved' or 'divergence', received 'divergent'`

### 61. Audit-2026-08-18-01: get_daily_reconciliation_summary returns valid SSOT contract (415.6711ms)
- **Suite**: Real Dates Audit (17, 18, 19, 21, 24/08 & 16/09) (Tier 4)
- **File**: `tests/e2e/tier4_real_world/real_dates_audit.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Summary missing canonical fields: is_marco_zero, closed_at, odometro_anterior`

### 62. Audit-2026-08-19-01: get_daily_reconciliation_summary returns valid SSOT contract (341.5467ms)
- **Suite**: Real Dates Audit (17, 18, 19, 21, 24/08 & 16/09) (Tier 4)
- **File**: `tests/e2e/tier4_real_world/real_dates_audit.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Summary missing canonical fields: is_marco_zero, closed_at, odometro_anterior`

### 63. Audit-2026-08-21-01: get_daily_reconciliation_summary returns valid SSOT contract (323.7099ms)
- **Suite**: Real Dates Audit (17, 18, 19, 21, 24/08 & 16/09) (Tier 4)
- **File**: `tests/e2e/tier4_real_world/real_dates_audit.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Summary missing canonical fields: is_marco_zero, closed_at, odometro_anterior`

### 64. Audit-2026-08-21-05: status_geral matches tolerance rule (<= 50.00 approved, else divergence) (328.1029ms)
- **Suite**: Real Dates Audit (17, 18, 19, 21, 24/08 & 16/09) (Tier 4)
- **File**: `tests/e2e/tier4_real_world/real_dates_audit.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Status vocabulary violation: expected strictly 'approved' or 'divergence', received 'divergent'`

### 65. Audit-2026-08-24-01: get_daily_reconciliation_summary returns valid SSOT contract (317.7397ms)
- **Suite**: Real Dates Audit (17, 18, 19, 21, 24/08 & 16/09) (Tier 4)
- **File**: `tests/e2e/tier4_real_world/real_dates_audit.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Summary missing canonical fields: is_marco_zero, closed_at, odometro_anterior`

### 66. Audit-2026-08-24-05: status_geral matches tolerance rule (<= 50.00 approved, else divergence) (327.2491ms)
- **Suite**: Real Dates Audit (17, 18, 19, 21, 24/08 & 16/09) (Tier 4)
- **File**: `tests/e2e/tier4_real_world/real_dates_audit.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Status vocabulary violation: expected strictly 'approved' or 'divergence', received 'divergent'`

### 67. Audit-2026-09-16-01: get_daily_reconciliation_summary returns valid SSOT contract (365.7083ms)
- **Suite**: Real Dates Audit (17, 18, 19, 21, 24/08 & 16/09) (Tier 4)
- **File**: `tests/e2e/tier4_real_world/real_dates_audit.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Summary missing canonical fields: is_marco_zero, closed_at, odometro_anterior`

### 68. Audit-2026-09-16-02: caixa_atual accounting invariant holds within 0.05 tolerance (396.0044ms)
- **Suite**: Real Dates Audit (17, 18, 19, 21, 24/08 & 16/09) (Tier 4)
- **File**: `tests/e2e/tier4_real_world/real_dates_audit.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Caixa atual formula drift on 2026-09-16: expected 221354.96, got 243755.67 (diff: 22400.7100)`

### 69. Audit-2026-09-16-06: stores breakdown sum equals macro pillars with zero difference (500.6226ms)
- **Suite**: Real Dates Audit (17, 18, 19, 21, 24/08 & 16/09) (Tier 4)
- **File**: `tests/e2e/tier4_real_world/real_dates_audit.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: Sum of store OFX (0.00) does not match summary saldo_bancos_ofx (129860.02)`

### 70. Snap-Audit-02: closed day 2026-09-16 returns frozen snapshot via get_daily_reconciliation_summary (850.339ms)
- **Suite**: Frozen Closed Snapshot Audit & Immutability (Tier 4)
- **File**: `tests/e2e/tier4_real_world/closed_snapshot_audit.test.mjs`
- **Error**: `AssertionError [ERR_ASSERTION]: closed_at must be populated`

