# Plan — End-to-End Reconciliation & Silent AI Telemetry Stress Test

## Milestone 1: Exploration & Data Seeding (R1)
- Step 1.1: Dispatch `teamwork_preview_explorer` (Explorer 1) to inspect codebase architecture, Supabase schema/tables (`stores`, `patio_os`, `transactions`, etc.), existing reconciliation logic, and AI telemetry structure.
- Step 1.2: Explorer produces a detailed handoff report with exact schema fields, registered stores, foreign key constraints, and a data generator plan.
- Step 1.3: Dispatch `teamwork_preview_worker` (Worker 1) to generate and insert realistic mock financial data for ALL registered stores (`patio_os`, `transactions` source=rede, `transactions` source=ofx) with exact matches, partial matches, and exception cases, tagged with a unique stress test batch ID.
- Step 1.4: Dispatch `teamwork_preview_reviewer` (Reviewer 1) to verify mock data integrity across all stores.

## Milestone 2: Silent AI Reconciler Execution & Telemetry Validation (R2)
- Step 2.1: Dispatch `teamwork_preview_worker` (Worker 2) to trigger/run reconciliation engine calculation (`useBackgroundAiReconciler` / `generateTripleMatchSuggestions`).
- Step 2.2: Dispatch `teamwork_preview_reviewer` (Reviewer 2) and `teamwork_preview_challenger` (Challenger 1) to validate that telemetry logs are correctly written to `ai_execution_logs` (tokens, cost USD/BRL, reasoning) and matches with score >= 90% are saved in `conciliation_matches`.

## Milestone 3: Audit Report & 100% Test Data Cleanup (R3)
- Step 3.1: Dispatch `teamwork_preview_auditor` (Auditor 1) to perform full forensic audit of the stress test results, telemetry, and integrity.
- Step 3.2: Dispatch `teamwork_preview_worker` (Worker 3) to execute 100% purge of test data from `conciliation_matches`, `transactions`, `patio_os`, `reconciliations`, `import_logs`, `import_batches`.
- Step 3.3: Dispatch `teamwork_preview_auditor` (Auditor 2) to verify total restoration of database state (zero test leftovers, clean original state).
- Step 3.4: Final report to Sentinel / Parent.
