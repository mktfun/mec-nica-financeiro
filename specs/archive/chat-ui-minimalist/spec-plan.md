# Spec Plan: Nova Interface do Chat e ResoluçÁo de Ferramentas (chat-ui-minimalist)

## Tasks

- [ ] [FRONTEND] Criar o arquivo `src/components/chat/PromptInput.tsx` colando o código de alto nível fornecido pelo usuário.
- [ ] [FRONTEND] Alterar `agente.tsx` para importar e utilizar o `PromptInput` no lugar de `PromptBox`, conectando a funçÁo `onSubmit`.
- [ ] [FRONTEND] Atualizar `MessageList.tsx` para exibir iterativamente chamadas de ferramentas de forma "minimalista" (bloco de pensamento recolhível) antes do conteúdo de texto puro.
- [ ] [BACKEND] Modificar `supabase/functions/ai-chat/index.ts` para introduzir a tool `consulta_detalhes_os`, executando um `.select()` direto na tabela `os` no Supabase.
- [ ] [TEST] Verificar renderizaçÁo animada do Prompt (cenário 2) e enviar um comando para testar OS #1763 (cenário 1).
