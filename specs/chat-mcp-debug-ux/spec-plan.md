# Spec Plan: Streaming de Raciocínio, Logs MCP e Correção Lógica (chat-mcp-debug-ux)

## Tasks

- [ ] [INFRA] Instalar bibliotecas de IA da Vercel no Frontend: `npm install @ai-sdk/react ai`
- [ ] [BACKEND] Refatorar `supabase/functions/ai-chat/index.ts` para usar `streamText` no lugar de `generateText` e retornar `toDataStreamResponse()`.
- [ ] [BACKEND] Atualizar `SYSTEM_PROMPT` em `index.ts` e descrições em `tools-oficina.ts` para mapear "Rei do Óleo" e filtrar as contas com status "PAG".
- [ ] [FRONTEND] Refatorar `src/routes/agente.tsx` para usar o hook `useChat` do `@ai-sdk/react`, lidando com a autenticação JWT do Supabase via headers do hook.
- [ ] [FRONTEND] Atualizar `src/components/chat/MessageList.tsx` para renderizar visualmente os blocos de `toolInvocations` da interface padrão do `@ai-sdk/react` (mostrando loading de ferramenta e logs finalizados).
- [ ] [TEST] Rodar build no frontend (`npm run build`) e dar deploy na edge function (`npx supabase functions deploy ai-chat`).
