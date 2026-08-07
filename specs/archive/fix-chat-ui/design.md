# Design: Fix Chat Reativity and Sidebar UI (fix-chat-ui)

## Arquitetura Técnica
- **Chat:** O fluxo `PromptInput` -> `sendMessage` -> `append(message)` deve forçar a atualização imediata da lista de mensagens (`MessageList`).
- **Sidebar:** Modificar o JSX da `Sidebar` em `agente.tsx` para incluir os dois links distintos: um para os logs da IA e outro para os logs do motor de conciliação, mapeados para suas respectivas sub-rotas ou abas isoladas (em contraposição a jogá-los em Configurações).

## Interfaces TypeScript
*Nenhuma nova interface crítica; reuso das existentes.*

## Componentes / Hooks / Funções
- `src/routes/agente.tsx` (Sidebar e hook `useChat`)
- Refatoração da tela de configurações para desfazer a "salada" (remover os logs aglutinados se foram colocados lá no último commit e restaurá-los como visualizações independentes).

## Fluxo de UI
1. O usuário entra na tela do Agente.
2. Vê no menu inferior do sidebar os botões: "Log do Agente de IA" e "Log do Motor de Conciliação".
3. Digita uma mensagem no input de chat e aperta Enviar.
4. A mensagem aparece INSTANTANEAMENTE na tela.
5. O bot "digita" e responde na sequência.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (Chat Reactivity):** Enviar mensagem -> Verifica se mensagem aparece no topo da lista instantaneamente -> Verifica se loading state ativa -> Resposta renderizada sem precisar de F5.
- **Cenário 2 (Log Navigation):** Clicar no botão "Log do Agente de IA" no menu lateral -> Verifica se a tela exibida mostra os registros metacognitivos da IA sem misturar com configurações de sistema.
