# Proposal: Fix Chat Reativity and Sidebar UI (fix-chat-ui)

## Problema
1. O chat do Agente IA não exibe as mensagens do usuário e do bot em tempo real, exigindo que o usuário atualize a página (F5) para ver as respostas. Isso quebra o UX de uma interface de chat.
2. Os botões de "Log do Agente de IA" e "Log do Motor de Conciliação" foram indevidamente ocultados/movidos para a tela de Configurações, criando uma interface confusa.

## Solução Proposta
- Investigar e corrigir a integração do `useChat` (do Vercel AI SDK) com o React state no arquivo `src/routes/agente.tsx`. Garantir que mutações otimistas ocorram ou que o hook gerencie o estado adequadamente sem gargalos de re-renderização.
- Restaurar os botões individuais de Log no menu lateral (`Sidebar`) da tela do Agente, permitindo acesso direto aos logs do motor de conciliação e do agente, removendo a dependência da tela de configurações geral.

## Contratos de Dados
- Não há alterações de banco de dados esperadas.

## API / Interface
- `agente.tsx`: Componente de Sidebar interno precisa expor os botões novamente.
- `useChat`: Garantir que `append` não sofra race conditions com `setMessages`.

## Features Existentes Impactadas
- Tela de Configurações (a "salada" deverá ser limpa se os logs forem extraídos).
- Tela do Agente (Chat e Layout).

## Risco Principal
- Quebrar a sincronização entre o estado de mensagens do Supabase e o estado em memória do `useChat` ao corrigir o bug de reatividade.
