# BRIEFING — 2026-08-24T18:00:00-03:00

## Mission
Deep forensic investigation of Bug 2: POS / Rede duplicate imports breaking reconciliation matching and interest calculation formula.

## 🔒 My Identity
- Archetype: explorer
- Roles: [investigator, forensic auditor, financial math specialist]
- Working directory: C:\Users\admin\.gemini\antigravity\scratch\financeiro\.agents\explorer_bug2\
- Original parent: e40547c9-e20c-46d5-bc40-e6b5eba283ac
- Milestone: Bug 2 Forensic Audit

## 🔒 Key Constraints
- Read-only investigation — do NOT implement production changes or apply migrations
- Document exact file paths, line numbers, and verbatim code
- Provide complete data flow maps, root cause analysis, mathematical formula audit, and concrete proposed fixes

## Current Parent
- Conversation ID: e40547c9-e20c-46d5-bc40-e6b5eba283ac
- Updated: 2026-08-24T18:00:00-03:00

## Investigation State
- **Explored paths**: initial directory listing and migration listing
- **Key findings**: identified parsers (redeParser.ts, redeSalesParser.ts, jurosRedeParser.ts), hooks (useImportProcessor.ts, useTripleMatch.ts, useRecebiveis.ts, useMdrAudit.ts, useFeeContracts.ts), and migrations (20260810000000_add_pos_dedup_hash.sql, 20260810000003_fix_conciliation_math_and_duplicates.sql, 20260817100000_create_mdr_contracts_and_audit_rpc.sql, 20260824000008_fix_contas_duplication_and_file_sources_reconciliation.sql, etc.)
- **Unexplored areas**: detailed parser deduplication, DB table schemas & unique constraints, match engine RPCs and frontend hooks, interest/MDR/anticipation formulas

## Key Decisions Made
- Undertake systematic deep dive across all 6 mission steps

## Artifact Index
- report_bug2.md — Complete forensic report for Bug 2
- handoff.md — Self-contained 5-component handoff report
