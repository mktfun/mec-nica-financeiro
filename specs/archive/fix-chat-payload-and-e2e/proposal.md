# Proposal: Correção de Payload do Chat e Teste E2E Oficina GPT (fix-chat-payload-and-e2e)

## Problema
1. Ao enviar mensagem no chat, o servidor da Edge Function `ai-chat` responde com HTTP 400: `{"error":"Invalid prompt: prompt or messages must be defined"}`.
   - **Causa raiz:** O `prepareSendMessagesRequest` no `DefaultChatTransport` em `agente.tsx` estava sobrescrevendo a propriedade `body` do objeto `request` sem incluir a propriedade `messages: request.messages`. Por conta disso, o corpo JSON enviado ao backend perdia o array de mensagens.
2. Formatação da mensagem enviada no chat:
   - **Causa raiz:** No Vercel AI SDK v4, as mensagens da UI utilizam `parts: [{ type: 'text', text }]` em vez de preencher diretamente `content`. O backend precisa mapear e higienizar essas mensagens para garantir que `streamText` as receba no formato `CoreMessage` (`{ role, content }`).
3. Teste Visual / E2E pendente em `http://localhost:8080/agente` com credenciais enviadas pelo usuário.

## Solução Proposta
1. **`src/routes/agente.tsx`**: Ajustar `prepareSendMessagesRequest` no `DefaultChatTransport` para preservar `request.messages` no payload JSON do body enviando:
   ```ts
   body: {
     messages: request.messages,
     conversation_id: activeConversationIdRef.current
   }
   ```
2. **`supabase/functions/ai-chat/index.ts`**: Adicionar sanitização de mensagens no backend convertendo objetos `UIMessage` (com `parts` ou `content`) para `CoreMessage` limpos (`{ role, content }`) antes de passar ao `streamText`.
3. **`supabase/functions/ai-chat/index.ts`**: Fazer redeploy da Edge Function `ai-chat`.
4. **Validação E2E (Playwright / Visual QA)**: Autenticar em `http://localhost:8080/` usando as credenciais do usuário (`mktfunil1@gmail.com` / `Mktfunil8563*`), navegar até `http://localhost:8080/agente`, enviar uma pergunta sobre a OS do Rei do Óleo (ex: "quais os detalhes da OS no rei do oleo maua?"), capturar screenshot e validar que a resposta do Oficina GPT streaming funciona perfeitamente.

## Contratos de Dados
- Credenciais de teste: `TEST_USER_EMAIL=mktfunil1@gmail.com`, `TEST_USER_PASSWORD=Mktfunil8563*`
- Payload POST para `ai-chat`: `{ messages: Array<{ role: string, content?: string, parts?: Array<{ type: 'text', text: string }> }>, conversation_id?: string }`

## Risco Principal
Garantir que a resposta da Edge Function flua em tempo real sem deadlocks de WebSocket ou Realtime, e que as ferramentas MCP de consulta a Ordens de Serviço (loja Rei do Óleo / mhe_maua) funcionem corretamente sem alucinações.
