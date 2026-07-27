# Project: End-to-End Reconciliation & Silent AI Telemetry Stress Test

## Architecture
- Target Project: Financial Reconciliation System (Next.js / Supabase / React)
- Key Modules:
  - Database tables: `stores`, `patio_os`, `transactions` (source='rede', source='ofx'), `reconciliations`, `conciliation_matches`, `ai_execution_logs`, `import_logs`, `import_batches`
  - Reconciler / AI engine: `useBackgroundAiReconciler`, `generateTripleMatchSuggestions`
  - Telemetry & Logging: `/agente` view / API writing tokens, USD/BRL costs, and reasoning logs to `ai_execution_logs`
  - Cleanup / Purge: Purge script/routine to remove 100% of test data identified by test markers/batch IDs.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Data Seeding | Inspect DB schema, stores list, reconciliation logic; create and execute realistic mock data insertion across ALL registered stores (patio_os, transactions rede & ofx) with exact matches, partial matches, and exceptions | none | IN_PROGRESS |
| 2 | Silent AI Reconciler Execution & Telemetry Validation | Trigger background AI reconciliation engine (`useBackgroundAiReconciler` / `generateTripleMatchSuggestions`), verify telemetry logs in `ai_execution_logs` (tokens, cost, reasoning) and high-confidence matches (>=90%) in `conciliation_matches` | M1 | PLANNED |
| 3 | Audit Report & 100% Test Data Cleanup | Run forensic audit, generate comprehensive stress test report, and purge 100% of generated test data from `conciliation_matches`, `transactions`, `patio_os`, `reconciliations`, `import_logs`, `import_batches` to restore DB | M2 | PLANNED |

## Interface Contracts & Data Schema Boundaries
- `patio_os`: Work orders (OS) from patio
- `transactions`: Transactions from card machines (`source='rede'`) and bank statements (`source='ofx'`)
- `ai_execution_logs`: Stores token counts, execution cost (USD/BRL), and AI reasoning traces
- `conciliation_matches`: Stores matched triples (OS + Rede + OFX) with match score (>=90% confidence)
- Test Isolation Tag: All inserted records must be tagged with a distinct test execution batch identifier (e.g. `STRESS_TEST_20260724_...`) to allow 100% safe and total purge.
