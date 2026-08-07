# Design: Streaming de Raciocínio, Logs MCP e CorreçÁo Lógica (chat-mcp-debug-ux)

## Arquitetura Técnica
A arquitetura de Chat evoluirá de um modelo Síncrono-Bloqueante para um modelo Reativo-Streaming suportado pela Vercel AI SDK.

**Back-end (`index.ts`)**:
De:
```typescript
const { text, toolCalls, toolResults } = await generateText({...})
return new Response(JSON.stringify({ text, toolCalls, toolResults }), ...)
```
Para:
```typescript
const result = streamText({
  model: llmModel,
  system: SYSTEM_PROMPT,
  messages,
  tools: mcpTools,
  maxSteps: 5,
})
return result.toDataStreamResponse({ headers: corsHeaders })
```

**Front-end (`agente.tsx`)**:
InstalaçÁo via NPM: `npm install @ai-sdk/react ai`
Uso:
```typescript
const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
  api: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`,
  headers: { Authorization: `Bearer ${session.access_token}` },
  // ... callbacks de salvamento de log
})
```

## Componentes / Hooks / Funções
1. **`src/routes/agente.tsx`**: Vai delegar o gerenciamento do estado `messages` para o `useChat`, mas vai continuar sincronizando o carregamento de conversas via Supabase no carregamento inicial.
2. **`src/components/chat/MessageList.tsx`**: Será ajustado para renderizar `toolInvocations`. Quando um `toolInvocation` estiver com `state === 'call'`, exibirá um loading pulsante: "Consultando Oficina Inteligente...".

## Fluxo de UI
Quando o usuário pede: "consulte OS 22549 no Rei do Óleo Mauá", a UI imediatamente cria um balÁo da IA e acende uma pílula: `⚙️ Buscando detalhes (consulta_os_detalhe_completo)...`. Assim que a API externa responde, a pílula vira verde, o JSON fica disponível e a IA começa a digitar a resposta na tela. Zero cegueira, transparência total.

## Infra / Deploy
`npm install @ai-sdk/react ai` no frontend.
`npx supabase functions deploy ai-chat` no backend.

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)
- Cenário 1: [Usuário envia mensagem pesada] → [A UI nÁo trava; mostra um loading da ferramenta em tempo real, provando que nÁo está pendurada]
- Cenário 2: [Busca de Rei do Óleo Mauá] → [O LLM mapeia "Maua", a API externa acha a OS com valores corretos, a IA digita a tabela]
- Cenário 3: [Busca de contas a pagar] → [LLM recebe a lista do bot e omite todas as PAG]
