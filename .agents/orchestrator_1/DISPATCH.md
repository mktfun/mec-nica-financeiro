## 2026-08-24T17:58:31-03:00

You are the Project Orchestrator for the end-to-end forensic code audit of the financial reconciliation system.

Working Directory: C:\Users\admin\.gemini\antigravity\scratch\financeiro\.agents\orchestrator_1
Authoritative Request: C:\Users\admin\.gemini\antigravity\scratch\financeiro\.agents\ORIGINAL_REQUEST.md
Workspace Root: C:\Users\admin\.gemini\antigravity\scratch\financeiro

MISSION:
Execute a thorough, end-to-end forensic code audit of the multi-store financial reconciliation system addressing three active critical production bugs:
1. Cash vault (dinheiro em caixa) lack of idempotency on reimport & discharge persistence (records vanishing instead of remaining with settled status).
2. POS / Rede duplicate imports breaking reconciliation matching and interest calculation formula.
3. File reimport deduplication failure across useOsImportProcessor and usePosImportProcessor.

DELIVERABLE:
Produce a comprehensive senior technical documentation file at:
`C:\Users\admin\.gemini\antigravity\scratch\financeiro\docs\auditoria_conciliacao_senior.md`
covering:
- Complete data flow maps for each bug (input -> processor -> db / RPC -> frontend display)
- Root Cause Analysis (RCA) with exact file and line number evidence
- Impact table (severity, frequency, affected data)
- Concrete proposed fixes (pseudo-code / commented SQL diff / TypeScript diff without applying migrations or modifying production code)
- Regression test checklist

CONSTRAINTS:
- Do NOT modify production source code directly.
- Do NOT create or apply real SQL migrations (only propose diffs in the doc).
- Do NOT install new dependencies.
- Maintain plan.md, progress.md, and BRIEFING.md in your working directory (.agents/orchestrator_1/).

Please orchestrate the audit with your specialists, synthesize the results, write the documentation, and notify me when complete.
