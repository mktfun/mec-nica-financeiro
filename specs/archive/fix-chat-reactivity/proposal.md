# Proposal: Correção de Reatividade do Chat e Regressão de UI (fix-chat-reactivity)

## Problema
1. O chat da Central IAS ("Oficina GPT") falhou silenciosamente. Ao enviar uma mensagem, o campo de input é limpo, mas a mensagem não aparece na UI otimista nem é salva no banco de dados (não aparece mesmo após F5). A causa raiz detectada é que o SDK `@ai-sdk/react` (`append`) ao encontrar um erro na Edge Function (como chaves de API não configuradas retornando 400), aborta o processamento ou sofre de *unhandled promise rejection*, o que paralisa a execução do método assíncrono `sendMessage`, impedindo que a mensagem seja enviada para a tabela `messages` do Supabase.
2. A tela "Configurações" aglutinou os logs do Agente IA e Motor de Conciliação indevidamente. O menu lateral original precisa tê-los isolados e ancorados na base do menu da aplicação principal, e não na página secundária.

## Solução Proposta
1. **Desacoplar o Optimistic UI e DB Insert do Vercel AI SDK:** Na função `sendMessage` em `agente.tsx`, a inserção da mensagem no banco de dados (`supabase.from('messages').insert`) será disparada *antes* e de forma isolada (via `.then()/.catch()`) da chamada do `append()`.
2. O `append()` do `useChat` deve ser chamado em um bloco `try/catch` explícito. Se falhar, garantimos que o fluxo não quebre e que a mensagem fique persistida (permitindo que o webhook local ou recarregamento não se percam).
3. **Proteção Anti-Travamento (Disabled State):** Se o `useChat` travar com `isLoading=true`, o `PromptInput.tsx` precisa de um mecanismo de timeout (ou validação extra) para que o usuário não fique eternamente bloqueado de enviar novas mensagens. Adicionar reset manual do estado de erro.
4. **Sidebar Global:** Garantir que no `src/components/layout/Sidebar.tsx` (ou o que seja o menu lateral principal do sistema, e não o interno da página Agente), os links `/logs/agente` e `/logs/motor` sejam restaurados no menu se for onde estavam. Como a spec anterior moveu tudo pro `agente.tsx`, a regressão deve ser resolvida clarificando o local dos botões de Log.

## Contratos de Dados
- Nenhuma alteração de tabelas ou RLS. A tabela `messages` e `mcp_logs` continuam exatamente as mesmas.
- O payload de inserção em `messages` continua sendo: `conversation_id`, `role: 'user'`, `content`.

## API / Interface
- `agente.tsx`: Atualizar a lógica do `sendMessage`.
- `PromptInput.tsx`: Garantir submissão resiliente.

## Features Existentes Impactadas
- **Oficina GPT / Central IAS**: Impacto direto na estabilidade do chat em tempo real e na confiabilidade da persistência no banco.

## Risco Principal
Se a API da Edge Function continuar respondendo 400 (por erro de chaves do Gemini/OpenAI na tabela `ai_settings`), o assistente *ainda* não responderá, mesmo que a mensagem do usuário seja salva corretamente. A UI deve ser clara ao notificar o erro (via toast) e não bloquear futuros inputs.
