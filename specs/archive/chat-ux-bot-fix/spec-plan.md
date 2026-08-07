# Spec Plan: UX do Chat e IntegraçÁo com VPS Bot (chat-ux-bot-fix)

## Tasks

- [ ] [BACKEND] Atualizar `supabase/functions/ai-chat/tools-oficina.ts` criando as constantes unificadas para `BOT_URL` e `BOT_API_KEY` com fallbacks robustos, e substituir as literais de interpolaçÁo em todas as tools.
- [ ] [BACKEND] Adicionar tratamento explícito do `!response.ok` no fetch de cada tool para retornar payloads informativos do tipo `{ error: "Falha HTTP X: motivo" }`.
- [ ] [FRONTEND] Refatorar os blocos de balÁo da `MessageList.tsx`. Diferenciar visualmente User (fundo sólido, right-aligned) de Assistant (border/stroke sutil, tipografia primária, left-aligned).
- [ ] [FRONTEND] Criar componente interno ou refatorar as marcações do *Loading State* (os 3 pontos pulsantes) na `MessageList.tsx` para um visual high-end com `framer-motion`, utilizando as mesmas constantes de curvatura e timing do `PromptInput`.
- [ ] [FRONTEND] Atualizar o Avatar do `Assistant` na UI (atualmente azul genérico) para seguir o estilo monocromático dark ou tech moderno adotado pelo resto do projeto, mantendo os ícones `lucide-react`.
