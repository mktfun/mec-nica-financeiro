# Design: Corrigir UX do Agente e Stream Abort (bugfix-ai-chat)

## Arquitetura Técnica
A alteração ocorre exclusivamente no componente React `src/routes/agente.tsx`.
A lógica passa a ser reativa por **ações explícitas** em vez de por **observação de estado cega**.

**Fluxo Corrigido:**
- Usuário clica "Nova Conversa" -> Chama `setMessages([])` -> Cria conversa no banco.
- Usuário escreve na caixa e pressiona Enter -> Se não houver `activeConversationId`, cria no banco e seta o ID -> `append({ role: 'user', content })` dispara o LLM (NENHUM recarregamento extra é disparado por causa da criação).
- Usuário clica em Conversa Antiga na Sidebar -> Chama `setActiveConversationId(id)` E `loadMessages(id)` explícitamente.

## Interfaces TypeScript
Não há novas interfaces necessárias.

## Componentes / Hooks / Funções
**`src/routes/agente.tsx`**:
- Remoção total do estado `activeMainTab` e dos sub-painéis (`providers`, `telemetry`, `inspector`, `bot`).
- Remoção do bloco `useEffect` que ouve o array `[activeConversationId]`.
- Modificação no `onClick` da lista de histórico para chamar `loadMessages(conv.id)`.

## Fluxo de UI
A UI será restaurada ao layout de chat limpo:
- Sidebar (Esquerda): Nova Conversa + Histórico de chats.
- Central: `MessageList` + `PromptInput`.

## Infra / Deploy
Sem alterações de deploy.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- Cenário 1: [Criar Nova Conversa] → Clicar no input e enviar "Oi" → A mensagem tem que aparecer no exato milissegundo em que Enter for pressionado. O loading de gerar reposta ("Oficina GPT ...") tem que aparecer sem a conversa ser resetada ou ficar travada.
- Cenário 2: [Trocar Conversas] → Clicar na conversa B, em seguida clicar na conversa A → As mensagens são trocadas corretamente refletindo o banco de dados.
