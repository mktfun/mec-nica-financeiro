# Design: Correção de Payload do Chat e Teste E2E Oficina GPT (fix-chat-payload-and-e2e)

## Arquitetura Técnica

```
[UI agente.tsx] 
  │
  ├── DefaultChatTransport (prepareSendMessagesRequest)
  │    └── Injeta: Authorization Header + messages array + conversation_id
  │
  ├──► POST /functions/v1/ai-chat
  │     │
  │     ├── 1. Auth Check (getUser)
  │     ├── 2. Sanitiza messages (extract text de parts ou content -> CoreMessages)
  │     ├── 3. Chama streamText({ model, system, messages: formattedMessages, tools })
  │     └── 4. Retorna result.toDataStreamResponse({ headers: corsHeaders })
  │
  └──◄ Stream JSON Events (v2 protocol)
        │
        ├── UI renderiza respostas em tempo real via MessageList.tsx
        └── onFinish salva resposta do assistente no banco Supabase
```

## Interfaces TypeScript

```ts
// Formatação de mensagens no backend (ai-chat/index.ts)
type CoreMessageFormatted = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};
```

## Componentes / Hooks / Funções Modificados

1. **`src/routes/agente.tsx`**:
   ```ts
   prepareSendMessagesRequest: async (request) => {
     const { data: sessionData } = await supabase.auth.getSession();
     const token = sessionData.session?.access_token;
     return {
       ...request,
       headers: {
         ...(request.headers || {}),
         'Authorization': `Bearer ${token}`
       },
       body: {
         messages: request.messages,
         conversation_id: activeConversationIdRef.current
       }
     };
   }
   ```

2. **`supabase/functions/ai-chat/index.ts`**:
   ```ts
   const formattedMessages = (messages || []).map((m: any) => {
     let content = '';
     if (typeof m.content === 'string' && m.content) {
       content = m.content;
     } else if (Array.isArray(m.parts)) {
       content = m.parts
         .filter((p: any) => p.type === 'text')
         .map((p: any) => p.text)
         .join('');
     }
     return { role: m.role || 'user', content };
   });
   ```

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1:** Envio de mensagem no frontend
  - Estado inicial: Usuário digita "Olá"
  - Ação: `appendMessage({ text: "Olá" })`
  - Resultado esperado: POST envia `{ messages: [...], conversation_id: '...' }`. Servidor responde HTTP 200 stream, sem o erro "Invalid prompt: prompt or messages must be defined".
- **Cenário 2:** Teste E2E de consulta sobre Rei do Óleo
  - Estado inicial: Servidor rodando em `http://localhost:8080`
  - Ação: Login com `mktfunil1@gmail.com` / `Mktfunil8563*`, enviar pergunta "qual o resumo da OS no rei do oleo maua?"
  - Resultado esperado: Oficina GPT responde usando a ferramenta `consulta_resumo_os` e formata em Markdown sem alucinações.
