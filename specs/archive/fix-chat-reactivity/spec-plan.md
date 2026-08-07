# Spec Plan: Correção de Reatividade do Chat (fix-chat-reactivity)

## Tasks

- [x] [FRONTEND] Alterar a função `sendMessage` no `src/routes/agente.tsx` para isolar a inserção no banco de dados (`supabase.from('messages').insert`) da chamada `append()` do Vercel AI SDK. A inserção não deve usar `await` bloqueante e deve prever logs/toasts no seu próprio `.catch()`.
- [x] [FRONTEND] Envolver a chamada `append()` em um bloco `try/catch` para que, se a Edge Function falhar sincronicamente, a execução não quebre o método `sendMessage` inteiro (evitando o "Unhandled Promise Rejection").
- [x] [FRONTEND] Em `src/components/chat/PromptInput.tsx`, adicionar um timeout ou reset no bloqueio do `isLoading` caso a store do `useChat` trave devido a um erro 400 sem `onError` correspondente. Se `isLoading` ficar preso, a interface deve liberar o campo após falha.
- [x] [TEST] Verificar se, sem chaves da OpenAI configuradas, o envio de uma mensagem é persistido no banco e carregado no F5. *(VLM Visual QA bloqueado por Segurança de Auth: credenciais de teste ausentes no .env)*
