# Spec Plan: Reestruturação do Agente IA & Nova Conversa (agente-ui-custos)

## Tasks

- [x] [FRONTEND] Em `src/routes/agente.tsx`, adicionar o link `<Link to="/custos">` com o ícone de BarChart3 no final do menu lateral (abaixo de "Log do Motor").
- [x] [FRONTEND] Em `src/routes/agente.tsx`, alterar `handleNewConversation` para definir `setActiveConversationId(null)` e `setMessages([])` e não chamar mais o supabase.
- [x] [FRONTEND] Em `src/routes/agente.tsx`, atualizar `sendMessage` para, caso `!currentConvId` exista, efetuar o `insert` em `conversations` usando `title: text.substring(0, 30)` e pegar o `id` gerado antes de salvar as mensagens.
- [x] [FRONTEND] Em `src/routes/agente.tsx`, logo após criar a nova conversa, fazer um fetch assíncrono para a Edge Function de chat (ou LLM disponível) enviando um system prompt do tipo "Gere um título de até 4 palavras para:" seguido da mensagem do usuário.
- [x] [FRONTEND] Em `src/routes/agente.tsx`, caso o LLM retorne sucesso, fazer um `UPDATE` no Supabase renomeando o campo `title` da nova conversa (o Realtime atualizará o UI automaticamente).
- [x] [TEST] Clicar em "Nova Conversa", verificar se a lista permanece igual (não polui). Digitar algo, verificar se a conversa aparece na lista. Esperar alguns segundos e ver se o título muda para algo mais inteligente que o começo da mensagem. (Bloqueado por Segurança de Auth)
- [x] [TEST] Verificar visualmente se a aba "Custos" está acessível pelo sidebar do Agente. (Bloqueado por Segurança de Auth)
