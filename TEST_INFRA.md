# TEST_INFRA.md — E2E Testing Infrastructure Specification

**Project**: Financial Reconciliation Single Source of Truth (SSOT) Refactor  
**Authoritative Sources**:
- `ORIGINAL_REQUEST.md` (Header: `## 2026-09-17T15:04:09Z`)
- `.agents/orchestrator_1/PROJECT.md`
**Environment**: Supabase PostgreSQL (`cnwzsvowkfymtdiryhqc.supabase.co`) + TanStack Start / React 19 Frontend  
**Date**: 2026-09-17  
**Status**: ACTIVE / TEST_INFRA ESTABLISHED

---

## 1. Testing Philosophy & Architecture

The E2E test suite adheres to strict **Opaque-Box Requirement-Driven** testing principles:
1. **SSOT Enforcement**: The Supabase database engine is the sole source of truth for all accounting metrics, tolerances, closures, and status evaluations.
2. **Zero Facade Tests**: Tests execute real operations against the database RPCs/tables and run static AST/token verification on the frontend codebase. No mocking of business logic or artificial pass-throughs.
3. **Progressive Testability & Defect Escalation**: Tests verify the system contract. When a milestone has not yet applied its migration or code changes (e.g. `calculate_daily_conciliation` not yet dropped), tests accurately report the violation with actionable RCA for the milestone implementer.
4. **Adversarial Edge & Boundary Stress**: Coverage includes malformed inputs, SQL injection attempts, concurrent closing invocations (advisory locking), out-of-order date closures, and floating-point boundary rounding.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             E2E TEST HARNESS                                │
│                                                                             │
│  tests/e2e/harness/                                                         │
│  ├── client.mjs          (Supabase Client, Management SQL API, AST Scanner) │
│  ├── assertions.mjs      (5 Pillars, Stores Breakdown, Status Enum, DRE)    │
│  ├── config.mjs          (5 Real Dates, Canonical Statuses, Tolerances)     │
│  └── fixtures.mjs        (Payload templates, Mock transactions, Dates)      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
│ Tier 1: Features │          │ Tier 2: Boundary │          │ Tier 3: Pairwise │
│ (110+ Tests)     │          │ (110+ Tests)     │          │ (25+ Tests)      │
│ Features 1 to 22 │          │ Edge & Stress    │          │ Cross-Module     │
└──────────────────┘          └──────────────────┘          └──────────────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │ Tier 4: Real-Day │
                              │ 5 Real Dates     │
                              │ 17, 18, 19, 21,  │
                              │ 24/08 and 16/09  │
                              └──────────────────┘
```

---

## 2. The 22-Feature Coverage Matrix

Each feature from `PROJECT.md` is tested across all 4 tiers with >=5 primary tests in Tier 1 and >=5 boundary/corner cases in Tier 2:

| # | Feature Name | Tier 1 Suite | Tier 2 Suite | Tier 3 Pairwise | Tier 4 Real Date |
|---|--------------|--------------|--------------|-----------------|------------------|
| 1 | SSOT Calculator Function | `m1_ssot_calculator.test.mjs` | `m1_calculator_boundary.test.mjs` | M1 ↔ M2 Payload Contract | 17, 18, 19, 21, 24/08, 16/09 |
| 2 | Open vs Closed Day Handling | `m1_ssot_calculator.test.mjs` | `m1_calculator_boundary.test.mjs` | M1 ↔ M3 Snapshot Isolation | Closed snapshot verification |
| 3 | Fixed Status Vocabulary | `m1_ssot_calculator.test.mjs` | `m1_calculator_boundary.test.mjs` | M1 ↔ M4 Status Integrity | All 6 real dates |
| 4 | Obsolete Function Deprecation | `m1_ssot_calculator.test.mjs` | `m1_calculator_boundary.test.mjs` | M1 ↔ M2 No Dead RPC Call | Schema verification |
| 5 | Remove Hardcoded Dates | `m1_ssot_calculator.test.mjs` | `m1_calculator_boundary.test.mjs` | M1 ↔ M6 Dynamic Integrity | 16/09 dynamic vs hardcode |
| 6 | Single Reading Hook | `m2_frontend_ssot.test.mjs` | `m2_frontend_boundary.test.mjs` | M1 ↔ M2 Pass-through | UI Hook contract |
| 7 | Unified Cache Key | `m2_frontend_ssot.test.mjs` | `m2_frontend_boundary.test.mjs` | M2 Cache Consistency | Query key scan |
| 8 | Purge Client Financial Math | `m2_frontend_ssot.test.mjs` | `m2_frontend_boundary.test.mjs` | M2 ↔ M6 Presentation | Component AST scan |
| 9 | Direct Component Adaptation | `m2_frontend_ssot.test.mjs` | `m2_frontend_boundary.test.mjs` | M2 Component Audit | View component audit |
| 10| Transactional Fechar Dia RPC| `m3_backend_closing.test.mjs`| `m3_closing_boundary.test.mjs` | M1 ↔ M3 Snapshot Generation | Real date closing run |
| 11| Closing Idempotency | `m3_backend_closing.test.mjs`| `m3_closing_boundary.test.mjs` | M3 Consecutive Runs | Double close validation |
| 12| Disallow Snapshot Direct Write| `m3_backend_closing.test.mjs`| `m3_closing_boundary.test.mjs` | M3 ↔ M5 Table Protection | Codebase mutation audit |
| 13| Wire UI Closing to RPC | `m3_backend_closing.test.mjs`| `m3_closing_boundary.test.mjs` | M2 ↔ M3 Button Invocation | Component AST scan |
| 14| Closed Status Vocabulary | `m4_status_standards.test.mjs`| `m4_status_boundary.test.mjs` | M4 DB Column Constraints | All physical tables |
| 15| Status TypeScript Constants | `m4_status_standards.test.mjs`| `m4_status_boundary.test.mjs` | M4 Code Imports | `src/types/status.ts` |
| 16| Data Status Migration | `m4_status_standards.test.mjs`| `m4_status_boundary.test.mjs` | M4 Data Hygiene | Zero legacy strings in DB |
| 17| Code Status Refactoring | `m4_status_standards.test.mjs`| `m4_status_boundary.test.mjs` | M4 TS Comparison Audit | Zero raw string compares |
| 18| Direct Physical Table Writes | `m5_write_paths.test.mjs` | `m5_write_boundary.test.mjs` | M5 ↔ M4 CRUD Integrity | `ofx/pos/manual` tables |
| 19| Eliminate View Mutations | `m5_write_paths.test.mjs` | `m5_write_boundary.test.mjs` | M5 Error 55000 Prevention | Zero view mutations |
| 20| Redirect Critical Reads | `m5_write_paths.test.mjs` | `m5_write_boundary.test.mjs` | M5 OFX Direct Access | Zero `source='ofx'` in view |
| 21| Simplified 4-Step Flow | `m6_user_flow.test.mjs` | `m6_flow_boundary.test.mjs` | M6 ↔ M2 Wizard Pipeline | CentralImportWizard audit |
| 22| Acceptance Criteria Verification| `m6_user_flow.test.mjs` | `m6_flow_boundary.test.mjs` | End-to-End System Audit | 5 Real Dates Zero Drift |

---

## 3. Directory Layout & Organization

All test files reside under `tests/e2e/`:

```
tests/e2e/
├── harness/
│   ├── client.mjs          # Database connection, Supabase RPC caller, AST code parser
│   ├── assertions.mjs      # Accounting assertions (5 pillars, stores sum = global, tolerance)
│   ├── config.mjs          # Real dates, test thresholds, canonical vocabulary constants
│   └── fixtures.mjs        # Fixture payloads, mock dates, test input matrices
├── tier1_features/
│   ├── m1_ssot_calculator.test.mjs    # Features 1 to 5
│   ├── m2_frontend_ssot.test.mjs      # Features 6 to 9
│   ├── m3_backend_closing.test.mjs    # Features 10 to 13
│   ├── m4_status_standards.test.mjs   # Features 14 to 17
│   ├── m5_write_paths.test.mjs        # Features 18 to 20
│   └── m6_user_flow.test.mjs          # Features 21 to 22
├── tier2_boundary/
│   ├── m1_calculator_boundary.test.mjs # F1-F5 boundary: null dates, extreme values, tolerance margins
│   ├── m2_frontend_boundary.test.mjs   # F6-F9 boundary: missing stores, zero amounts, undefined keys
│   ├── m3_closing_boundary.test.mjs    # F10-F13 boundary: concurrency, repeated closes, invalid dates
│   ├── m4_status_boundary.test.mjs     # F14-F17 boundary: case sensitivity, whitespace, unexpected enums
│   ├── m5_write_boundary.test.mjs      # F18-F20 boundary: missing FKs, duplicate fitids, view guardrails
│   └── m6_flow_boundary.test.mjs       # F21-F22 boundary: skipped wizard steps, out-of-order execution
├── tier3_combinations/
│   ├── pairwise_m1_m2.test.mjs         # DB Summary payload consumption by Frontend Hook
│   ├── pairwise_m1_m3.test.mjs         # Open dynamic summary vs fechar_dia frozen snapshot
│   ├── pairwise_m3_m4.test.mjs         # Closing pipeline status updates vs canonical statuses
│   ├── pairwise_m4_m5.test.mjs         # Physical table writes with canonical status enums
│   └── pairwise_m2_m6.test.mjs         # Wizard Step 4 audit and closure presentation
├── tier4_real_world/
│   ├── real_dates_audit.test.mjs       # 2026-08-17, 2026-08-18, 2026-08-19, 2026-08-21, 2026-08-24, 2026-09-16
│   └── closed_snapshot_audit.test.mjs  # Frozen snapshot immutability & metadata verification
└── runner.mjs                          # Centralized CLI Test Runner
```

---

## 4. Authoritative Expected Output Derivation

For each test case:
1. **Database Schema & RPC Signatures**:
   - `get_daily_reconciliation_summary(p_date text, p_force_dynamic boolean)` must return the exact contract defined in `PROJECT.md § Interface Contracts`.
   - `fechar_dia(p_date date, p_force_reopen boolean)` must return frozen `DailyReconciliationSummary`.
   - `calculate_daily_conciliation` must not exist in `pg_proc`.
2. **Vocabulary & Enums**:
   - `status_geral`: strictly `'approved'` or `'divergence'`.
   - Match statuses: strictly `'pending'`, `'matched'`, `'batch'`, `'intercompany'`, `'cancelled'`, `'ignored'`.
   - Closure statuses: strictly `'approved'`, `'divergence'`.
3. **Accounting Invariants**:
   - $\sum_{s \in \text{stores}} \text{saldo\_banco}(s) = \text{saldo\_bancos\_ofx}$
   - $\sum_{s \in \text{stores}} \text{dinheiro\_loja}(s) = \text{dinheiro\_lojas}$
   - $\sum_{s \in \text{stores}} \text{rede\_liquido}(s) = \text{cartoes\_a\_compensar}$
   - $\sum_{s \in \text{stores}} \text{na\_loja\_os}(s) = \text{na\_loja\_os}$
   - $\text{caixa\_atual} = \text{total\_saldo\_banco} + \text{dinheiro\_mp} + \text{a\_receber} + \text{total\_patio} - \text{saldo\_negativo\_itau}$
   - $\text{fluxo\_caixa} = \text{caixa\_atual} - \text{caixa\_anterior}$
   - $\text{valor\_disp\_contas} = \text{faturamento\_periodo} - \text{fluxo\_caixa}$
   - $\text{subtotal\_contas} = \text{contas\_base} + \text{juros\_rede}$
   - $\text{diferenca\_final} = \text{valor\_disp\_contas} - \text{subtotal\_contas}$
   - $|\text{diferenca\_final}| \le 50.00 \implies \text{status\_geral} = \text{'approved'}$; else $\text{'divergence'}$.

---

## 5. Execution Commands

The test runner operates natively with Node.js 20+:

```bash
# Run all E2E test suites (Tiers 1-4)
node tests/e2e/runner.mjs

# Run specific tiers
node tests/e2e/runner.mjs --tier=1
node tests/e2e/runner.mjs --tier=2
node tests/e2e/runner.mjs --tier=3
node tests/e2e/runner.mjs --tier=4

# Run specific feature tests
node tests/e2e/runner.mjs --feature=1
node tests/e2e/runner.mjs --feature=10

# Generate markdown report
node tests/e2e/runner.mjs --report=tests/e2e/report.md
```

---

## 6. Defect Escalation & Milestone Verification Gate

When a test suite runs during an active milestone implementation:
- If a test fails because the milestone feature is not yet applied, the test reports an **Implementation Pending / Bug Escalation** with exact file, line, and expected vs actual.
- When all milestone dependencies are applied, all corresponding tests in Tiers 1-4 must pass 100% with zero errors.
- Milestone sign-off requires passing the corresponding feature tests in `runner.mjs`.
