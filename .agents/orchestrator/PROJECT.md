# Project: Central de Agentes IAS

## Architecture
Central de Agentes IAS is a dual-phase cognitive agent hub and UI enhancement for Oficina GPT & AntiGravity agents:
- **Parte 1: UI Fix & Hub de Orquestração Base**
  - **M1 (UI Layout Fix)**: `src/routes/agente.tsx` - Move "Oficina GPT" title to top of sidebar (above "Nova Conversa"), remove from header, anchor "Configurações" and "Logs do Sistema" buttons at the bottom of sidebar (`mt-auto`) without historical scroll overlap.
  - **M2 (Hub Base Connectors)**: Instantiable connector modules for `Graphify` (context engine for code, data, playbooks) and `Claritas` (policy/prompt registry), exposed for dependency injection in existing bots.
- **Parte 2: Arquitetura Cognitiva (Memória Dual, RAG Auditável, Reflexão, Testes Controlados)**
  - **M3 (Memória Dual & RAG Auditável)**: Database structure separating transactional memory (sessions, conversations) from structural memory (rules, prompts, Claritas configs), both indexable via Graphify. RAG pipeline returning answer + graph path (`caminho do grafo`) traversed.
  - **M4 (Camada de Reflexão & Testes Edge Function)**: Reflection validation layer using `Graphify reflect` to intercept LLM outputs applying Claritas policies (verifiable via pipeline logs). Edge Function controlled testing with real commands (e.g. "quais os detalhes da OS 22549 no rei do oleo").

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: UI Fix (agente.tsx sidebar layout) | R1 | none | DONE |
| 2 | M2: Hub Base Connectors (Graphify + Claritas) | R2 | none | DONE |
| 3 | M3: Memória Dual & RAG Auditável | R3, R4 | M2 | DONE |
| 4 | M4: Camada de Reflexão & Edge Function Testing | R5, R6 | M3 | DONE |

## Code Layout
- Frontend UI: `src/routes/agente.tsx` and related layout components in `src/components/`
- Hub Connectors & Cognition: `src/lib/` or `src/services/` or `bot/`
- Edge Function & DB: `supabase/functions/` / `supabase/migrations/`
