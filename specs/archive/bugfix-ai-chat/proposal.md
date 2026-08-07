# Proposal: Corrigir UX do Agente e Stream Abort (bugfix-ai-chat)

## Problema
1. O usuário relata que as mensagens enviadas no chat nÁo aparecem imediatamente e a inteligência artificial nÁo responde.
2. A tela do agente está poluída com abas de configurações avançadas (Telemetria, Inspector de Payloads, ConfiguraçÁo de Bot) que o usuário achou desnecessárias e confusas.

A causa raiz do problema 1 é um erro de State Management / Race Condition no frontend (`agente.tsx`). 
Quando o usuário digita uma mensagem na primeira vez, o hook `useChat` chama o `append()`. Porém, ao mesmo tempo, a aplicaçÁo atualiza o ID da conversa no estado. Um `useEffect` estava escutando essa mudança de ID e invocando a funçÁo `loadMessages`, que buscava as mensagens do banco de dados (que estavam vazias ou só continham o registro recém-criado) e chamava `setMessages([...])`.
Ao chamar `setMessages`, o Vercel AI SDK aborta automaticamente qualquer _stream_ ou requisiçÁo em andamento de geraçÁo. O resultado: a mensagem pode sumir da tela dependendo do timing e a IA "nÁo responde" porque a requisiçÁo foi abortada pelo próprio frontend (causando o log com 75s ou menos no Supabase, mas ignorado no UI).

## SoluçÁo Proposta
1. Refatorar o controle de conversas no `agente.tsx`, removendo o `useEffect` acoplado ao `activeConversationId` e tornando o carregamento do histórico explícito apenas ao **clicar** em uma conversa existente na sidebar.
2. Limpar a UI do `agente.tsx`, removendo o sistema de "abas principais" (Provedores, Telemetria, Inspector, Bot) e voltando a página ao seu estado focado (apenas a barra lateral de histórico e a área de chat).

## Contratos de Dados
- Nenhuma alteraçÁo em tabelas, Edge Functions ou Supabase RPC. Tudo é estritamente estado de React.

## API / Interface
- Nenhuma quebra de interface.

## Features Existentes Impactadas
- Tela de IA (`/agente`).

## Risco Principal
- Garantir que a criaçÁo de uma nova conversa nÁo cruze as mensagens em andamento e limpe o array do `useChat` corretamente.
