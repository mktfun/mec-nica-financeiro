# Design: Alinhamento de Endpoint e Protocolo AI SDK (fix-endpoint-alignment)

## Arquitetura Técnica

**Fluxo atual (quebrado):**
```
agente.tsx (SDK v4) → DefaultChatTransport → POST /functions/v1/ias-hub (DELETADO)
                       ↓
              Resposta 404 HTML do app = crash
```

**Fluxo corrigido:**
```
agente.tsx (SDK v4) → DefaultChatTransport → POST /functions/v1/ai-chat (ai@7, protocolo v2)
                       ↓
              streamText → toDataStreamResponse() → protocolo v2 JSON events
                       ↓
              useChat parseia JSON events → messages atualizam na UI
                       ↓
              onFinish salva resposta no Supabase via messages INSERT
```

## Interfaces TypeScript
Nenhuma interface nova. O `useChat` continua usando os tipos do SDK v4.

## Componentes / Hooks / Funções Afetados

| Artefato | Mudança |
|---|---|
| `supabase/functions/ai-chat/index.ts` | Trocar `npm:ai@3` → `npm:ai@7`, ajustar imports se necessário |
| `supabase/functions/ias-hub/` (diretório local) | DELETAR localmente |
| `src/routes/agente.tsx` | Trocar URL de `ias-hub` para `ai-chat` no `DefaultChatTransport` |

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)

**Cenário 1:** Usuário envia mensagem
- Estado inicial: `activeConversationId` existe, `appendMessage({ text })` é chamado
- AçÁo: POST para `/functions/v1/ai-chat` com `Authorization: Bearer <token>` e `messages: [...]`
- Resultado esperado: Stream de texto começa a aparecer na UI progressivamente, sem necessidade de F5

**Cenário 2:** Edge Function retorna erro (ex: Google API Key nÁo configurada)
- Estado inicial: `ai_settings` sem chave configurada
- AçÁo: Edge Function retorna JSON `{ error: "API Key nÁo configurada" }` com status 400
- Resultado esperado: `onError` do `useChat` é chamado → toast de erro aparece, campo de input desbloqueia

**Cenário 3 (ai@3 → ai@7 compat):** `toDataStreamResponse()` na ai@7
- Verificar que o import `streamText` da `npm:ai@7` ainda exporta `.toDataStreamResponse()`
- Se a API mudou, usar `pipeDataStreamToResponse()` ou o equivalente da v7

## Nota sobre o `conversation_id`
A funçÁo `ai-chat` nÁo precisa receber `conversation_id` — isso é só relevante para o frontend no `onFinish` (via `activeConversationIdRef`). O body do POST só precisa de `messages`.
