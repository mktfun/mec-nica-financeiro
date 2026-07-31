# Plan: Chat Realtime & Sidebar Navigation Fixes

## Objectives
1. Fix real-time chat message sending & receiving bot response without requiring page refresh (F5).
2. Restore individual sidebar navigation buttons for "Log do Agente de IA" and "Log do Motor de Conciliação" directing to isolated log views.

## Execution Steps

### Phase 1: Exploration & Diagnosis (M1)
- Dispatch `teamwork_preview_explorer` to:
  - Inspect chat sending & receiving implementation in `src/routes/agente.tsx` (and related components/hooks).
  - Inspect sidebar navigation in `src/components/Sidebar.tsx` (and related router configuration).
  - Determine root causes for (1) chat non-reactivity / bot silence and (2) UI navigation regression.
  - Produce recommendations for implementation in worker report.

### Phase 2: Implementation (M2)
- Dispatch `teamwork_preview_worker` to:
  - Implement chat real-time state mutation / Supabase realtime updates / Bot Edge Function triggering so messages and bot responses update immediately.
  - Restore "Log do Agente de IA" and "Log do Motor de Conciliação" buttons in the Sidebar pointing to dedicated isolated log routes.
  - Run build (`npm run build` or Vite build) and tests to verify no syntax errors or regressions.

### Phase 3: Review & Audit Gating (M3)
- Dispatch `teamwork_preview_reviewer` to review changes, run build/tests, and test functionality.
- Dispatch `teamwork_preview_auditor` to conduct forensic integrity verification.
- Synthesize findings and report final completion to parent/user.
