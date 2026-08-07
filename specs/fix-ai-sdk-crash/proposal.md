# Proposal: Correção de Crash do AI SDK (fix-ai-sdk-crash)

## Problema
O envio de mensagens falhava completamente com o erro `TypeError: append is not a function` bloqueando toda a execução. Isso acontecia porque a biblioteca `@ai-sdk/react` na versão 4.0 renomeou a função `append` para `sendMessage` e o estado `isLoading` para `status`. A chamada antiga estava crashando o componente assim que o usuário tentava enviar algo, o que interrompia todo o fluxo e nunca ativava a requisição para a Edge Function nem a atualização otimista.

## Solução Proposta
Ajustar o destructuring do hook `useChat` no `src/routes/agente.tsx` para estar em conformidade com o Vercel AI SDK 4.0:
1. Extrair `sendMessage` e renomear internamente para `appendMessage` (para evitar conflito com nossa própria função `sendMessage`).
2. Extrair `status` e derivar o `isLoading` manualmente (`status === 'submitted' || status === 'streaming'`).

## Contratos de Dados
Nenhuma mudança de tabela ou RLS. Apenas correção sintática no client-side SDK.

## API / Interface
- `agente.tsx`: O destructuring do `useChat` deve refletir `const { messages, setMessages, sendMessage: appendMessage, status } = useChat(...)`.

## Risco Principal
Não há grandes riscos pois a alteração é puramente para adequar-se à documentação atual do SDK.
