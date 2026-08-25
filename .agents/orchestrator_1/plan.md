# Project Plan: Financial Reconciliation Forensic Code Audit

## Objective
Execute an exhaustive forensic code audit on the financial reconciliation system for 3 active critical bugs and produce a senior technical report at `docs/auditoria_conciliacao_senior.md`.

## Workstreams & Milestones

### Milestone 1: Parallel Forensic Investigation (Explorers)
- **Explorer 1 (Bug 1)**: Cash vault (`dinheiro em caixa`) lack of idempotency on reimport & discharge persistence (records vanishing instead of remaining settled).
  - Target: investigate cash intake/vault tables, import pipelines, reimport logic, discharge (`baixa`/settlement) persistence, RPCs, and UI display logic.
- **Explorer 2 (Bug 2)**: POS / Rede duplicate imports breaking reconciliation matching and interest calculation formula.
  - Target: investigate POS / card acquirer (Rede, etc.) imports, duplicate transaction ingestion, matching engine algorithms, interest/fee formulas (`taxa_parcelamento`, `mdr`, `taxa_antecipacao`), and financial math.
- **Explorer 3 (Bug 3)**: File reimport deduplication failure across `useOsImportProcessor` and `usePosImportProcessor`.
  - Target: investigate file parsing, checksum/hash logic, file tracking tables, store/account boundaries, batch insertion/upsert logic, and frontend hooks state.

### Milestone 2: Technical Authoring & Deliverable Assembly (Worker)
- Synthesize findings from Explorers 1, 2, and 3.
- Author `docs/auditoria_conciliacao_senior.md` covering:
  1. Executive Summary & Architecture Overview
  2. Complete Data Flow Maps (Input -> Processor -> DB/RPC -> UI) for all 3 bugs
  3. Deep Root Cause Analysis (RCA) with exact file paths and line numbers
  4. Impact Analysis Matrix (Severity, Frequency, Financial/Data Risk)
  5. Proposed Solutions & Concrete Code/SQL Diffs (commented TypeScript & SQL migrations proposals without applying them)
  6. Comprehensive Regression Test Checklist & Verification Matrix

### Milestone 3: Review & Forensic Audit (Reviewer & Auditor)
- **Reviewer**: Verify technical accuracy, architectural soundness, completeness of data flows, and code diff quality.
- **Forensic Auditor**: Validate integrity constraints (no production code modified, no migrations applied, genuine evidence citations).

### Milestone 4: Final Synthesis & Delivery to Parent Agent
- Update progress and state, verify documentation artifact exists and is comprehensive, send structured report to parent agent.
