# Spec Plan: Correção de Erro Interno (s is not a function) no AI SDK (bugfix-ai-chat-2)

## Tasks

- [x] [FRONTEND] No arquivo `src/routes/agente.tsx`, reescrever o bloco `fetch` dentro das propriedades do `useChat` para construir um objeto `new Headers(options?.headers)` e preencher o token via `headers.set('Authorization', ...)` antes do `fetch`.
- [x] [FRONTEND] No arquivo `src/routes/agente.tsx`, alterar a chamada `append({ role: 'user', content: text })` para incluir um UUID gerado aleatoriamente: `append({ id: crypto.randomUUID(), role: 'user', content: text })`.
- [x] [TEST] Verificar envio de mensagem garantindo que o SDK se comunica com o backend e inicia o stream corretamente sem erros de runtime no JS.
