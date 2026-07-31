# Spec Plan: Correção de Crash do AI SDK (fix-ai-sdk-crash)

## Tasks

- [x] [FRONTEND] Ajustar a desestruturação do hook `useChat` no arquivo `src/routes/agente.tsx`, extraindo `sendMessage: appendMessage` e `status` no lugar de `append` e `isLoading`.
- [x] [FRONTEND] Definir `const isLoading = status === 'submitted' || status === 'streaming'` logo abaixo do hook.
- [x] [FRONTEND] Alterar a chamada assíncrona `await append(...)` para `await appendMessage(...)` no bloco interno de submissão do chat.
