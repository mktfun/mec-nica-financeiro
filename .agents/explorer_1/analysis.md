# Diagnostic & Remediation Analysis Report

**Date:** 2026-07-31  
**Author:** Explorer 1  
**Project:** Central de Agentes IAS — ConciliaMec Financeiro (`c:/Users/admin/.gemini/antigravity/scratch/financeiro`)  

---

## Executive Summary

This investigation analyzed two critical regressions reported in the codebase:
1. **Track 1: Chat Realtime & Bot Processing (R1)** — Chat messages do not render immediately upon sending (requiring an F5 page refresh), and bot responses fail or freeze without reactive UI updates.
2. **Track 2: Sidebar Navigation Buttons for Logs (R2)** — "Log do Agente de IA" and "Log do Motor de Conciliação" buttons were removed from dedicated sidebar navigation and merged into a generic embedded section inside `/configuracoes`.

---

## Track 1: Chat Realtime & Bot Processing (R1)

### 1. Code Locations Examined
- `src/routes/agente.tsx`: Main chat page component utilizing `@ai-sdk/react`'s `useChat` hook, manual Supabase `messages` table mutations, and chat UI rendering.
- `src/components/chat/PromptInput.tsx`: Floating input component for message composition and submission.
- `src/components/chat/MessageList.tsx`: Markdown and tool-call rendering list for chat messages.
- `supabase/functions/ai-chat/index.ts`: Primary streaming Edge Function endpoint using Vercel AI SDK `streamText` with local & Oficina MCP tools.
- `supabase/functions/ias-hub/index.ts`: Advanced Edge Function endpoint for Claritas policy governance, prompt memory, Graphify RAG (`query_knowledge_graph`), and metacognitive reflections (`agent_reflections`).
- `supabase/migrations/20260718000000_ai_chat.sql` & `20260730000000_ias_claritas_graphify.sql`: Database schema definitions for `conversations`, `messages`, `mcp_logs`, and `agent_reflections`.

### 2. Root Cause Diagnosis

#### Issue 1A: Chat Message Not Displaying Immediately (Requires F5 Refresh)
- **Primary Root Cause — Absence of Supabase Realtime Subscription**: `agente.tsx` relies exclusively on local state managed by `@ai-sdk/react`'s `useChat` hook and a initial `loadMessages()` fetch upon mounting or conversation selection. There is **zero** Supabase Realtime channel subscription (`supabase.channel('messages').on('postgres_changes', ...)`).
- **Secondary Root Cause — Disconnected Dual Persistence Flow**: In `sendMessage()` (`agente.tsx:137`), the user message is manually written directly to the database via `await supabase.from('messages').insert(...)`. Immediately after, `append({ role: 'user', content: text })` is invoked to send the HTTP payload to the Edge Function. 
- **Failure Mode**: When the Edge Function call fails (due to missing API key, network timeout, or invalid token), `useChat` encounters an error. Because no `onError` handler is supplied to `useChat`, local state becomes desynchronized or frozen. Although the user message exists in the database (inserted by step 1), the UI does not update reactively without a Supabase Realtime listener. Hitting F5 forces `loadMessages()` to re-query Supabase, finally rendering the saved message.

#### Issue 1B: Bot Not Responding / Response Not Received or Rendered Reactively
- **Missing API Key / Unhandled Edge Function Errors**: `supabase/functions/ai-chat/index.ts:101` throws `API Key não configurada para o provedor selecionado.` if `GOOGLE_API_KEY` or `ai_settings.api_key` is not configured. When `ai-chat` returns an HTTP 400 response, `useChat` silently aborts without user feedback or error toasts.
- **Client-Side `onFinish` Persistence Risk**: In `agente.tsx:27-31`, assistant responses are written to the database solely inside the client-side `onFinish` callback (`await supabase.from('messages').insert(...)`). If the user closes the browser tab, navigates away, or loses network connection while the bot is streaming, the assistant response is never persisted to Supabase DB.
- **Endpoint Divergence (`ai-chat` vs `ias-hub`)**: `agente.tsx` hardcodes the endpoint to `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`. However, `ias-hub` is the endpoint built for Claritas governance and Graphify metacognitive reflection logging (`agent_reflections`). Calling `ai-chat` skips reflection logging and policy validation.

---

## Track 2: Sidebar Navigation Buttons for Logs (R2)

### 1. Code Locations Examined
- `src/components/layout/Sidebar.tsx`: Navigation menu component managing top items (`navItems`) and bottom-anchored actions.
- `src/routes/configuracoes.tsx`: Settings view containing embedded cards for store management, bot credentials, LLM settings, and an inline "Logs de Automação" card.
- `src/hooks/useBotLogs.ts` & `src/hooks/useBotRuns.ts`: Data fetching hooks for `ai_execution_logs` / `bot_audit_logs` / `bot_runs`.
- `.agent/memory/ui.md`: Memory guideline recording prior sidebar layout decisions.

### 2. Root Cause Diagnosis
- **UI Regression via Merging**: During layout consolidation, dedicated navigation buttons for "Log do Agente de IA" and "Log do Motor de Conciliação" were removed from `Sidebar.tsx`.
- **Embedded Logging Loss of Isolation**: Both log streams were merged into a small inline card inside `/configuracoes`. In `agente.tsx`, a link pointing to `/configuracoes#logs` was added as a temporary fallback. This violated UI clarity by combining two completely different log domains:
  1. **Log do Agente de IA**: AI agent telemetria, LLM tokens, prompt execution, tool calls, and Claritas reflections.
  2. **Log do Motor de Conciliação**: Scraper Playwright automation runs, store scraping statuses, screenshots, and reconciliation engine execution logs.

---

## Concrete Remediation Plan

### Remediation for Track 1 (Chat Realtime & Bot Processing)

1. **Implement Supabase Realtime Subscription in `agente.tsx`**:
   - Add a `useEffect` hook in `agente.tsx` that subscribes to `postgres_changes` on table `messages` for `conversation_id = activeConversationId`.
   - On `INSERT` events, update message state reactively, ensuring both user and assistant messages appear instantaneously regardless of stream success or page reloads.

2. **Add `onError` and Robust Error Handling to `useChat`**:
   - Supply `onError: (error) => toast.error(`Erro no Agente: ${error.message}`)` to `useChat`.
   - Display a visual inline alert in `MessageList` when an Edge Function error occurs.

3. **Align Edge Function Endpoints & Server-Side Persistence**:
   - Update `agente.tsx` to point to `/functions/v1/ias-hub` (or unify `ai-chat` and `ias-hub`) so that Claritas governance rules and `agent_reflections` are recorded automatically.
   - Pass `conversation_id` in the request body to allow the Edge Function to persist the assistant response server-side upon completion (preventing message loss on client tab closure).

---

### Remediation for Track 2 (Sidebar Log Navigation Buttons)

1. **Create Dedicated Isolated Log Routes / Views**:
   - Route `/logs/agente` (or `src/routes/logs.agente.tsx`): Dedicated view for AI Agent logs, token counts, tool execution traces, and Claritas reflections.
   - Route `/logs/motor` (or `src/routes/logs.motor.tsx`): Dedicated view for Scraper/Playwright Motor de Conciliação run history, error logs, and store capture metrics.

2. **Restore Dedicated Buttons in `Sidebar.tsx`**:
   - In `src/components/layout/Sidebar.tsx`, add two distinct navigation items in the bottom section (`mt-auto` container):
     - **"Log do Agente de IA"** (`/logs/agente`) with `BrainCircuit` / `Bot` / `Terminal` icon.
     - **"Log do Motor de Conciliação"** (`/logs/motor`) with `Cpu` / `Activity` / `Wrench` icon.
   - Apply active route detection (`location.pathname.startsWith(...)`) so each button highlights correctly when selected.
   - Respect layout memory rule (`.agent/memory/ui.md`): Ensure main sidebar menu retains `flex-1 overflow-y-auto` while bottom buttons use `mt-auto shrink-0`.
