# Proposal: CorreçÁo de Crash do AI SDK (fix-ai-sdk-crash)

## Problema
O envio de mensagens falhava completamente com o erro `TypeError: append is not a function` bloqueando toda a execuçÁo. Isso acontecia porque a biblioteca `@ai-sdk/react` na versÁo 4.0 renomeou a funçÁo `append` para `sendMessage` e o estado `isLoading` para `status`. A chamada antiga estava crashando o componente assim que o usuário tentava enviar algo, o que interrompia todo o fluxo e nunca ativava a requisiçÁo para a Edge Function nem a atualizaçÁo otimista.

## SoluçÁo Proposta
Ajustar o destructuring do hook `useChat` no `src/routes/agente.tsx` para estar em conformidade com o Vercel AI SDK 4.0:
1. Extrair `sendMessage` e renomear internamente para `appendMessage` (para evitar conflito com nossa própria funçÁo `sendMessage`).
2. Extrair `status` e derivar o `isLoading` manualmente (`status === 'submitted' || status === 'streaming'`).

## Contratos de Dados
Nenhuma mudança de tabela ou RLS. Apenas correçÁo sintática no client-side SDK.

## API / Interface
- `agente.tsx`: O destructuring do `useChat` deve refletir `const { messages, setMessages, sendMessage: appendMessage, status } = useChat(...)`.

## Risco Principal
NÁo há grandes riscos pois a alteraçÁo é puramente para adequar-se à documentaçÁo atual do SDK.
