# Proposal: Bot Config UI & MCP Agent Integration (bot-config-ui)

## Problema
O ConciliaMec Bot (Playwright) agora está hospedado na VPS e acessível via Traefik (`bot.tork.services`), mas não há como configurá-lo pelo painel, nem testar a conexão, nem acompanhar seus logs de execução (separados dos logs de IA). Além disso, a IA atual não possui conhecimento sobre o bot nem pode acioná-lo de forma autônoma (ausência de um MCP - Model Context Protocol).

## Solução Proposta
1. **Agente UI - Nova Aba "Bot & MCP"**: 
   - Campos de configuração: `Bot URL` e `API Key`.
   - Botão "Testar Conexão" que faz um ping em `/health` e `/api/sync` (com key) e exibe toasts de sucesso/erro.
   - Listagem dos logs específicos do bot (consumindo a tabela `bot_audit_logs`).
2. **Supabase Schema**:
   - Adicionar as colunas `bot_url` e `bot_api_key` na tabela `ai_settings` existente, permitindo que a configuração seja salva globalmente.
3. **MCP (Integração IA)**:
   - Fornecer ao Agente (via system prompt ou function calling no `llm-matcher`) a habilidade de invocar o bot, passando os parâmetros necessários. Quando o usuário disser "Sincronize as maquininhas", o agente pode fazer uma chamada HTTP pro bot, acionando o scraping de forma autônoma.

## Contratos de Dados
- **Tabela:** `ai_settings`
  - **Novas colunas:** `bot_url TEXT`, `bot_api_key TEXT`
- **Tabela Existente:** `bot_audit_logs`
  - Utilizada para buscar logs exclusivos da execução do Playwright Bot.

## API / Interface
- Modificação no `useAiSettings` para retornar e salvar as novas propriedades.
- Criação de um utilitário `testBotConnection(url, key)` no frontend.
- Modificação na tela `src/routes/agente.tsx` para acomodar a aba "Bot & MCP".

## Features Existentes Impactadas
- Tela de `AgentePage` (adiciona novas abas e views).
- Migration Supabase (adiciona campos de configuração).

## Risco Principal
- A UI de chat no `agente.tsx` talvez precise de suporte a "Tool Calls" para que o LLM chame o endpoint do bot dinamicamente, o que exige parse da resposta do modelo e acionamento programático no client-side.
