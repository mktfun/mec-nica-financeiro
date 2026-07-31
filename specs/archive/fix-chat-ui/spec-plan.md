# Spec Plan: Fix Chat Reativity and Sidebar UI (fix-chat-ui)

## Tasks

- [ ] [FRONTEND] Diagnosticar por que `append` no `useChat` em `src/routes/agente.tsx` não atualiza o estado local reativamente.
- [ ] [FRONTEND] Corrigir o fluxo de estado do chat para que a mensagem do usuário e a resposta do bot apareçam instantaneamente.
- [ ] [FRONTEND] Alterar a parte inferior da Sidebar em `src/routes/agente.tsx` adicionando botões dedicados para "Log do Agente de IA" e "Log do Motor de Conciliação".
- [ ] [FRONTEND] Limpar a tela de Configurações removendo a aglutinação ("salada") ou apontando os links diretamente para as abas corretas sem confusão.
- [ ] [TEST] Verificar cenário 1: Enviar mensagem no chat e confirmar se ela surge instantaneamente sem F5.
- [ ] [TEST] Verificar cenário 2: Clicar nos botões de Log na Sidebar e confirmar redirecionamento correto.
