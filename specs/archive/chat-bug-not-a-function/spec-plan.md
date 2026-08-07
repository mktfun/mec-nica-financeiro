# Spec Plan: Erro "s is not a function" no Vercel AI SDK (chat-bug-not-a-function)

## Tasks

- [x] [FRONTEND] Remover a chave `fetch` e sua funçÁo interceptadora da configuraçÁo do `useChat` no arquivo `src/routes/agente.tsx`.
- [x] [FRONTEND] Atualizar a funçÁo `sendMessage` no `src/routes/agente.tsx` para buscar a sessÁo via `supabase.auth.getSession()` antes do envio.
- [x] [FRONTEND] Modificar a chamada de `append()` para incluir o token no segundo argumento: `append({ role: 'user', content: text }, { headers: { Authorization: \`Bearer \${token}\` } })`.
- [x] [FRONTEND] Remover o `id: crypto.randomUUID()` da chamada do `append` e deixar o Vercel AI SDK cuidar do ID automaticamente.
- [x] [TEST] Verificar cenário 1: Enviar uma mensagem no chat, conferir que a mensagem é renderizada na hora na tela, sem o erro "s is not a function" no console do navegador, e que a resposta da IA funciona.
