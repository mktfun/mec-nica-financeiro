# Project: Central de Agentes IAS — Realtime Chat & Sidebar Navigation Fixes

## Architecture
Central de Agentes IAS is a React + Supabase frontend and backend architecture:
- **Track 1: Chat Realtime & Bot Processing (R1)**
  - UI components: `src/routes/agente.tsx`, chat components in `src/components/`
  - Real-time reactivity: Supabase realtime channels or React query / state mutations for chat message list.
  - Bot processing: Edge function invocation / webhook / API integration.
- **Track 2: Sidebar Navigation (R2)**
  - Navigation components: `src/components/Sidebar.tsx` (or similar sidebar component) and routing in `src/routes/` or App router.
  - Buttons to restore: "Log do Agente de IA" and "Log do Motor de Conciliação" pointing to isolated log views instead of embedded/grouped in settings.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Exploration & Root-Cause Diagnosis | R1, R2 | none | DONE |
| 2 | M2: Implementation of Chat & Sidebar Fixes | R1, R2 | M1 | DONE |
| 3 | M3: Review & Forensic Audit Gating | R1, R2 | M2 | IN_PROGRESS |

## Code Layout
- Frontend UI: `src/routes/agente.tsx`, `src/components/Sidebar.tsx`, `src/routes/` log routes.
- State / Backend: `src/lib/supabase.ts`, `src/services/` or `supabase/functions/`
