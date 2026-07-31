# Central de Agentes IAS - Plan

## Phase 1: Exploration & Proposal Specs
1. **Explore Codebase**:
   - Explorer analyzes `src/routes/agente.tsx`, existing bot/hub files, Graphify setup, Claritas rules/prompts setup, Supabase database schema, edge functions.
   - Produce proposal specs in `specs/ias_hub/proposal.md`, `design.md`, `spec-plan.md` adhering to `.agent/rules/ia.md` (`/vibe-proposal`).

## Phase 2: Execution of Parte 1 (UI Fix & Base Hub Connectors)
2. **Milestone 1 (M1: UI Layout Fix in agente.tsx)**:
   - Move "Oficina GPT" title to top of sidebar above "Nova Conversa".
   - Remove "Oficina GPT" from main header.
   - Fix "Configurações" and "Logs do Sistema" buttons anchored at the bottom (`mt-auto`) of sidebar without scroll overlap.
   - Worker implements -> Reviewer verifies -> Challenger & Auditor check integrity.
3. **Milestone 2 (M2: Hub Base Connectors - Graphify + Claritas)**:
   - Create connector modules for Graphify context engine and Claritas policy registry.
   - Expose connectors for dependency injection in Oficina GPT and AntiGravity bots.
   - Worker implements -> Reviewer verifies -> Auditor checks integrity.

## Phase 3: Execution of Parte 2 (Arquitetura Cognitiva)
4. **Milestone 3 (M3: Memória Dual & RAG Auditável com Grafos)**:
   - Implement dual memory separation in database (transactional vs structural).
   - Implement Graph RAG pipeline returning response + graph traversal path (`caminho do grafo`).
   - Worker implements -> Reviewer verifies -> Auditor checks integrity.
5. **Milestone 4 (M4: Camada de Reflexão & Testes Edge Function)**:
   - Implement reflection layer using Graphify reflect to validate LLM outputs against Claritas policies.
   - Enable controlled testing on Edge Function with real OS queries ("quais os detalhes da OS 22549 no rei do oleo").
   - Worker implements -> Reviewer verifies -> Challenger & Auditor check integrity.

## Phase 4: Final Verification & Human Reporting
6. Verify all acceptance criteria are met, verify build/tests, generate completion report.
