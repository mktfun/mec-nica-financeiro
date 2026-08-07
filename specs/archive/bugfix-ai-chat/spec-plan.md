# Spec Plan: Corrigir UX do Agente e Stream Abort (bugfix-ai-chat)

## Tasks

- [x] [FRONTEND] No arquivo `src/routes/agente.tsx`, remover o estado `activeMainTab` e todo o código JSX das abas secundárias (`providers`, `telemetry`, `inspector`, `bot`), além do `renderSidebarNav()`.
- [x] [FRONTEND] No arquivo `src/routes/agente.tsx`, remover o `useEffect` problemático (por volta da linha 149) que tem `[activeConversationId]` como dependência e invoca `loadMessages(activeConversationId)`.
- [x] [FRONTEND] No arquivo `src/routes/agente.tsx`, atualizar a renderizaçÁo do histórico (a `div` com o `onClick`) para, ao clicar, fazer `setActiveConversationId(conv.id)` E invocar explicitamente `loadMessages(conv.id)`.
- [x] [FRONTEND] No arquivo `src/routes/agente.tsx`, atualizar `handleNewConversation` para limpar a conversa anterior (`setMessages([])`) antes de criar/setar a nova conversa.
- [x] [TEST] Verificar cenário de disparo de chat.
