# Spec Plan: Central de Agentes IAS & UI Layout Refactor

## Proposed Changes

### UI Modifications (`src/routes/agente.tsx`)
- **[ ] Step 1: Re-order Left Sidebar Header**
  - Add "Oficina GPT" title block with `<Bot />` icon at the top of the sidebar.
  - Position "Nova Conversa" button directly beneath the title block.
  - Retain "Histórico" uppercase divider label.
- **[ ] Step 2: Implement Bottom Anchored Section in Sidebar**
  - Add anchored div with `mt-auto shrink-0 border-t border-[var(--border-subtle)] space-y-1` at bottom of sidebar.
  - Include "Configurações" link with `<Settings />` icon routing to `/configuracoes`.
  - Include "Logs do Sistema" link with `<Terminal />` icon routing to `/configuracoes`.
  - Verify that the chat history container (`flex-1 overflow-y-auto custom-scrollbar`) flexes properly without overlapping bottom links.
- **[ ] Step 3: Streamline Main Chat Header**
  - Remove duplicate `<h3 className="font-semibold text-sm text-white">Oficina GPT</h3>` from main chat header (`lines 198-208`).
  - Replace with status indicator bar.

### Backend & Edge Function Alignments
- **[ ] Step 4: Verify Claritas Policy & System Prompt Sync**
  - Confirm `claritas_prompts` and `claritas_policies` tables are populated.
  - Ensure `ias-hub` and `ai-chat` Edge Functions fetch active policies and enforce no-hallucination rules.
- **[ ] Step 5: Verify Knowledge Graph Storage & Graphify Pipeline**
  - Verify `knowledge_graph` bucket setup in Supabase Storage.
  - Confirm `graphifyy` CLI integration and artifact generation (`graphify-out/2026-07-30/graph.json`).
- **[ ] Step 6: Test Dual Memory RAG Execution**
  - Test OS query routing ("quais os detalhes da OS 22549 no rei do oleo") through local `patio_os` query and secondary bot API fallback.

---

## Task List & Execution Status

- [x] Phase 0: Exploration & Specification Drafting (completed by explorer_1)
- [ ] Phase 1: Sidebar UI Refactoring in `src/routes/agente.tsx`
- [ ] Phase 2: Main Header Clean-up in `src/routes/agente.tsx`
- [ ] Phase 3: Edge Function & Claritas Policy Verification
- [ ] Phase 4: Graphify Storage & Knowledge Graph Integration Verification
- [ ] Phase 5: End-to-End Build & Visual Layout Verification
