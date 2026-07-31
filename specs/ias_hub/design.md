# Design: Central de Agentes IAS & Sidebar UI Technical Design

## 1. Component Architecture & UI Layout

### 1.1 Sidebar Structure (`src/routes/agente.tsx`)

The sidebar component container has flex-direction `column` and fixed width (`w-full md:w-[260px]`):

```tsx
<div className="w-full md:w-[260px] bg-transparent border-r border-[var(--border-subtle)] flex flex-col overflow-hidden shrink-0 pt-4">
  
  {/* 1. Header Oficina GPT (Top of Sidebar) */}
  <div className="px-4 pb-3 border-b border-[var(--border-subtle)] mb-3 flex items-center gap-2.5 shrink-0">
    <div className="w-8 h-8 rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] shadow-sm">
      <Bot size={18} />
    </div>
    <div>
      <h3 className="font-semibold text-sm text-[var(--text-primary)] leading-none">Oficina GPT</h3>
      <p className="text-[10px] text-[var(--text-tertiary)] font-medium mt-1">Central IAS</p>
    </div>
  </div>

  {/* 2. Action Button: Nova Conversa */}
  <div className="px-4 pb-3 shrink-0">
    <button
      onClick={handleNewConversation}
      className="w-full bg-[var(--text-primary)] text-[var(--bg-canvas)] rounded-full py-2.5 px-4 flex items-center justify-between font-medium text-sm hover:bg-[var(--text-secondary)] transition-colors shadow-sm"
    >
      <span>Nova Conversa</span>
      <Plus size={16} />
    </button>
  </div>

  {/* 3. Section Divider Label */}
  <div className="px-4 pb-2 text-[11px] font-semibold tracking-wider text-[var(--text-tertiary)] uppercase shrink-0">
    Histórico
  </div>

  {/* 4. Scrollable History List */}
  <div className="flex-1 overflow-y-auto px-2 space-y-0.5 custom-scrollbar pb-2">
    {conversations.map(conv => (
      <div
        key={conv.id}
        onClick={() => {
          setActiveConversationId(conv.id);
          loadMessages(conv.id);
        }}
        className={`px-3 py-2.5 rounded-lg cursor-pointer flex justify-between items-center group transition-all duration-200 ${
          activeConversationId === conv.id
            ? 'bg-[var(--bg-surface-elevated)] font-medium text-[var(--text-primary)]'
            : 'hover:bg-black/5 text-[var(--text-secondary)]'
        }`}
      >
        <div className="truncate text-[13px] flex-1 mr-2">{conv.title || 'Nova Conversa'}</div>
        <button
          onClick={(e) => handleDeleteConversation(conv.id, e)}
          className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-tertiary)] hover:text-[var(--color-accent-danger)]"
        >
          <Trash2 size={13} />
        </button>
      </div>
    ))}
    {conversations.length === 0 && (
      <div className="text-center p-6 text-sm text-[var(--text-tertiary)]">Nenhuma conversa</div>
    )}
  </div>

  {/* 5. Bottom Anchored Section: Configurações & Logs */}
  <div className="mt-auto px-3 py-3 border-t border-[var(--border-subtle)] space-y-1 shrink-0 bg-[var(--bg-canvas)]">
    <Link
      to="/configuracoes"
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
    >
      <Settings size={15} />
      <span>Configurações</span>
    </Link>
    <Link
      to="/configuracoes"
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
    >
      <Terminal size={15} />
      <span>Logs do Sistema</span>
    </Link>
  </div>
</div>
```

### 1.2 Layout Isolation & Preventing Overlap
- The middle container (`Histórico`) has class `flex-1 overflow-y-auto`.
- The bottom container has `mt-auto shrink-0 border-t border-[var(--border-subtle)]`.
- The flex layout calculates available height as: `Total Sidebar Height - (Header Height + Action Button Height + Section Label Height + Bottom Section Height)`.
- When conversation history grows long, only the `Histórico` div scrolls internally. The bottom anchored buttons stay fixed at the bottom above the viewport edge without overlapping conversation items.

### 1.3 Main Chat Column Header Refactor
- Remove the duplicated `<h3 className="font-semibold text-sm text-white">Oficina GPT</h3>` header block from lines 198-208.
- Render a streamlined status / model bar in the main panel header:
```tsx
<div className="px-6 py-3 flex justify-between items-center z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
    <span className="w-2 h-2 rounded-full bg-[var(--color-accent-teal)] animate-pulse" />
    <span className="font-medium">Conectado ao ConciliaMec IAS</span>
  </div>
</div>
```

---

## 2. IAS Bot & Dual-Memory Backend Specification

### 2.1 Dual Memory Data Architecture

| Memory Layer | Storage Mechanism | Content | Tools & Access Paths |
|---|---|---|---|
| **Transactional Memory** | Supabase Postgres DB (`patio_os`, `transactions`, `reconciliations`, `receivables`, `conversations`, `messages`, `mcp_logs`) | Real-time financial entries, OS records, active user conversation context, tool executions | `toolsLocal`: `consulta_resumo_os`, `consulta_saldo_contas`, `consulta_conciliacao_periodo`, `consulta_contas_em_aberto` |
| **External Live Memory** | Remote Bot API (`bot.tork.services`) + Playwright Scraper | Real-time detailed OS checklists, live supplier accounts payable/receivable, live appointment slots | `toolsOficina`: `consulta_os_detalhe_completo`, `consulta_contas_pagar_oficina`, `consulta_contas_receber_oficina`, `consulta_agenda_oficina`, `consulta_config_oficina` |
| **Structural Knowledge Graph** | Supabase Storage (`knowledge_graph/graph.json`) generated by `graphifyy` CLI | Codebase AST, module dependencies, community clusters, domain concept graph | `supabase/functions/ias-hub/index.ts` tool `query_knowledge_graph` downloading `graph.json` from Storage |
| **Governance & Metacognition** | Supabase Postgres DB (`claritas_prompts`, `claritas_policies`, `agent_reflections`) | Active system prompts, severity rules (`low`..`critical`), reflection notes and policy evaluation logs | `supabase/functions/ias-hub/index.ts` system prompt injection and `onFinish` reflection hook |

### 2.2 Claritas Governance Pipeline

1. **System Prompt Injection**:
   - `ias-hub` Edge Function selects active prompt from `claritas_prompts` (`WHERE is_active = true`).
   - Appends policies from `claritas_policies` formatted by severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
2. **Reflection Loop (`onFinish`)**:
   - After streaming text response, `ias-hub` inspects tool invocations (`toolInvocations`).
   - Inserts record into `agent_reflections`:
     ```ts
     await adminClient.from('agent_reflections').insert([{
       conversation_id,
       tool_used: toolsCalled.map((t: any) => t?.toolName).join(','),
       outcome_success: true,
       reflection_notes: 'Automated post-stream reflection log.',
       policy_evaluations: { policies_applied: policies?.length || 0 }
     }]);
     ```

### 2.3 OS Query Routing Walkthrough: `"quais os detalhes da OS 22549 no rei do oleo"`

```
[ User Input: "quais os detalhes da OS 22549 no rei do oleo" ]
                           │
                           ▼
              [ Edge Function: ai-chat / ias-hub ]
                           │
                           ▼
          [ Step 1: Intent & Store Disambiguation ]
  Check prompt guidelines: "rei do oleo" -> Check store mapping.
  Maps "rei do oleo maua" -> slug 'mhe_maua' (or store_id '3a3dd7ce-...').
  If store is ambiguous, trigger Autonomia de Dados rule: Ask user to clarify store.
                           │
                           ▼
             [ Step 2: Primary DB Lookup (Local SQL) ]
  Executes `consulta_resumo_os`({ osNumber: '22549', loja: 'mhe_maua' })
  Queries `patio_os` table in Supabase.
                           │
                           ├──► [ Data Complete? ] ──► Yes ──► Stream Response to User
                           │
                           ▼ No / Deep Checklist Needed
           [ Step 3: Secondary Lookup (External API) ]
  Executes `consulta_os_detalhe_completo`({ osNumber: '22549', loja: 'mhe_maua' })
  Sends HTTP GET to `https://bot.tork.services/api/os/detalhe/22549?loja=mhe_maua`
  with header `x-api-key`.
                           │
                           ▼
         [ Step 4: Strict Hallucination Gate Check ]
  - If JSON returns `{ success: true, data: { ... } }`: Return exact data formatted in Markdown table.
  - If JSON returns 404 / error / empty: DO NOT INVENT DATA. State clearly: "OS 22549 não foi encontrada no sistema da loja Rei do Óleo (Mauá)."
                           │
                           ▼
          [ Step 5: Post-Stream Reflection Log ]
  Insert metadata record into `agent_reflections` table.
```

---

## 3. Database Schema Reference

Table definitions in `supabase/migrations/20260730000000_ias_claritas_graphify.sql`:

```sql
CREATE TABLE public.claritas_prompts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_role text NOT NULL,
  content text NOT NULL,
  version text NOT NULL DEFAULT '1.0',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.claritas_policies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_name text NOT NULL,
  rule_definition text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.agent_reflections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  tool_used text,
  outcome_success boolean NOT NULL,
  reflection_notes text NOT NULL,
  policy_evaluations jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

Storage bucket `knowledge_graph`:
- `storage.buckets`: `INSERT INTO storage.buckets (id, name, public) VALUES ('knowledge_graph', 'knowledge_graph', false)`
- Read access for `authenticated` role, full access for `service_role`.
