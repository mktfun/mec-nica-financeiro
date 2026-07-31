# Handoff Report — explorer_1 (Central de Agentes IAS Exploration)

## 1. Observation

### UI Layout Code (`src/routes/agente.tsx`)
1. **Sidebar Container (`src/routes/agente.tsx:156-193`)**:
   - Currently, the sidebar div starts at line 157:
     ```tsx
     <div className="w-full md:w-[260px] bg-transparent border-r border-[var(--border-subtle)] flex flex-col overflow-hidden shrink-0 pt-4">
       <div className="px-4 pb-4">
         <button onClick={handleNewConversation} className="...">
           <span>Nova Conversa</span>
           <Plus size={16} />
         </button>
       </div>
       <div className="px-4 pb-2 text-[11px] font-semibold tracking-wider text-[var(--text-tertiary)] uppercase">Histórico</div>
       <div className="flex-1 overflow-y-auto px-2 space-y-0.5 custom-scrollbar pb-4">
         {conversations.map(...)}
       </div>
     </div>
     ```
   - Observed that "Oficina GPT" title is missing from the sidebar top, and starts directly with the "Nova Conversa" button.
   - Observed that "Configurações" and "Logs do Sistema" links/buttons are completely absent from the bottom of the sidebar.

2. **Main Chat Header (`src/routes/agente.tsx:198-208`)**:
   - Currently, line 199-207 renders:
     ```tsx
     <div className="px-6 py-4 flex justify-between items-center z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
       <div className="flex items-center gap-2">
         <div className="w-8 h-8 rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)]">
           <Bot size={16} />
         </div>
         <div>
           <h3 className="font-semibold text-sm text-white">Oficina GPT</h3>
         </div>
       </div>
     </div>
     ```
   - Rendered "Oficina GPT" title in the top right main chat panel header instead of the sidebar.

### IAS Bot, Edge Functions & RAG Setup
1. **Edge Function `ai-chat` (`supabase/functions/ai-chat/index.ts`)**:
   - System prompt (lines 16-58) sets identity to **Oficina GPT** with Gold Autonomy rule, metacognition reasoning, dual operation modes (Fonte Primária local DB vs Fonte Secundária external Playwright bot API at `bot.tork.services`), store slug mapping (`mhe_maua`, `jab_jabaquara`, `dp_dom_pedro`, etc.).
   - Includes local tools (`tools-local.ts`: `consulta_resumo_os`, `consulta_saldo_contas`, `consulta_conciliacao_periodo`, `consulta_contas_em_aberto`) querying Supabase tables `patio_os`, `transactions`, `reconciliations`, `receivables`.
   - Includes external bot tools (`tools-oficina.ts`: `consulta_os_detalhe_completo`, `consulta_contas_pagar_oficina`, `consulta_contas_receber_oficina`, `consulta_agenda_oficina`, `consulta_config_oficina`) fetching data from `https://bot.tork.services/api/os/detalhe/:id?loja=<slug>`.

2. **Edge Function `ias-hub` (`supabase/functions/ias-hub/index.ts`)**:
   - Connects to Claritas tables: `claritas_prompts` (`WHERE is_active = true`) and `claritas_policies` (`severity IN ('low', 'medium', 'high', 'critical')`).
   - Implements `query_knowledge_graph` tool downloading `graph.json` from Supabase Storage bucket `knowledge_graph`.
   - Implements post-generation reflection logging to `agent_reflections` (`conversation_id`, `tool_used`, `outcome_success`, `reflection_notes`, `policy_evaluations`).

3. **Database Schema (`supabase/migrations/20260730000000_ias_claritas_graphify.sql`)**:
   - Tables: `claritas_prompts`, `claritas_policies`, `agent_reflections`.
   - Storage bucket: `knowledge_graph` (private, authenticated read policy).

4. **Graphify Setup (`graphify-out/`)**:
   - Graph output directory `graphify-out/2026-07-30/` contains `graph.json`, `manifest.json`, and `GRAPH_REPORT.md`.
   - CLI tool used: `graphifyy` (installed via `uv tool install graphifyy`).

5. **Playwright Bot API (`bot/src/server.ts`)**:
   - Express server on port 3001 with endpoint `GET /api/os/detalhe/:id?loja=<slug>` invoking Playwright scraper `fetchOSDetailedView` with store resolution via `resolveEmpresa` in `bot/src/config/empresas.ts`.

---

## 2. Logic Chain

1. **Observation 1.1 & 1.2** show that in `src/routes/agente.tsx`, "Oficina GPT" title is located in the main header while the sidebar top starts directly with "Nova Conversa", and bottom links ("Configurações", "Logs do Sistema") are absent.
   - *Deduction*: Placing an `Oficina GPT` brand block at the top of the sidebar (`px-4 pb-3 border-b border-[var(--border-subtle)]`), removing `<h3 className="font-semibold text-sm text-white">Oficina GPT</h3>` from the main header, and adding a bottom section with `mt-auto shrink-0 border-t border-[var(--border-subtle)] space-y-1` containing "Configurações" (`<Settings />`) and "Logs do Sistema" (`<Terminal />`) fulfills the UI requirements.
   - *Layout Physics*: Since the chat history container is wrapped in `flex-1 overflow-y-auto custom-scrollbar`, the middle history list naturally flexes and scrolls independently between the top buttons and the bottom anchored section, eliminating any possibility of layout overlap.

2. **Observation 2.1 - 2.5** reveal the complete architecture of the Central de Agentes IAS:
   - **Dual Memory Model**:
     - *Transactional RAG*: Local Supabase tables (`patio_os`, `transactions`, `reconciliations`, `receivables`) queried via `tools-local.ts`.
     - *Live External RAG*: External Playwright API (`bot.tork.services/api/os/detalhe/:id?loja=<slug>`) queried via `tools-oficina.ts`.
     - *Structural Knowledge RAG*: Supabase Storage bucket `knowledge_graph` (`graph.json` generated by `graphifyy`) queried via `query_knowledge_graph` in `ias-hub`.
   - **Claritas Governance**:
     - Prompts and policies loaded dynamically from `claritas_prompts` and `claritas_policies`.
     - Reflections logged to `agent_reflections`.
   - **OS Query Processing (`"quais os detalhes da OS 22549 no rei do oleo"`)**:
     1. Disambiguate store name ("rei do oleo maua" -> `mhe_maua`). If ambiguous, ask user per Autonomia rule.
     2. Query local DB via `consulta_resumo_os`.
     3. If detailed view / checklist requested, query `consulta_os_detalhe_completo` targeting `bot.tork.services/api/os/detalhe/22549?loja=mhe_maua`.
     4. Enforce strict anti-hallucination check: if response is empty/404, report factually without inventing data.
     5. Record execution reflection log in `agent_reflections`.

---

## 3. Caveats

- **Network Constraints**: Remote API `bot.tork.services` depends on live credentials and Playwright execution on the bot server. In offline or mock environments, `tools-oficina.ts` gracefully handles connection failures by informing the user without breaking the conversation flow.
- **Store Selection Ambiguity**: The store name "Rei do Óleo" can refer to multiple store franchises (e.g. Mauá, Jabaquara, Dom Pedro). The system prompt autonomy rule strictly directs the agent to ask the user for store confirmation if the store slug cannot be uniquely determined from context.

---

## 4. Conclusion

- **UI Refactoring Plan**: The exact modifications for `src/routes/agente.tsx` have been fully designed and specified in `specs/ias_hub/proposal.md`, `specs/ias_hub/design.md`, and `specs/ias_hub/spec-plan.md`.
- **Backend Architecture Formalized**: Central de Agentes IAS dual-memory paradigm, Claritas policy governance, Graphify graph storage, and OS query routing are fully documented and ready for execution.

---

## 5. Verification Method

To independently verify the implementation:

1. **Inspect Specification Files**:
   - Check `specs/ias_hub/proposal.md`
   - Check `specs/ias_hub/design.md`
   - Check `specs/ias_hub/spec-plan.md`
2. **Verify Code Structure in `src/routes/agente.tsx`**:
   - Verify sidebar layout: Header ("Oficina GPT") at top -> "Nova Conversa" button -> "Histórico" list (`flex-1 overflow-y-auto`) -> Bottom anchored links ("Configurações", "Logs do Sistema" with `mt-auto shrink-0 border-t`).
   - Verify main header: Title removed from top right, replaced with clean status bar.
3. **Verify Edge Function & DB Components**:
   - Inspect `supabase/functions/ai-chat/index.ts` and `supabase/functions/ias-hub/index.ts`.
   - Verify migration `supabase/migrations/20260730000000_ias_claritas_graphify.sql`.
   - Verify graph output in `graphify-out/2026-07-30/graph.json`.
