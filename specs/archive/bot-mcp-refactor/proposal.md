# Proposal: Refatoração do Bot para API de Consulta MCP (bot-mcp-refactor)

## Problema
A implementação anterior assumiu incorretamente que o Bot do Playwright era apenas um acionador de sincronização em lote (`/api/sync`) disparado por uma string mágica no frontend (`[BOT_SYNC:...]`). O usuário esclareceu que o Bot atua como uma verdadeira **API de Consulta (MCP)**, permitindo que a IA extraia informações dinâmicas (como "status da OS X", "CMV da loja", etc.) em tempo real, usando a infraestrutura headless.

## Solução Proposta
1. **Remoção da Gambiarra no Frontend:** Remover a interceptação de `[BOT_SYNC]` em `agente.tsx`.
2. **Uso das Configurações do Banco no Backend:** A Edge Function `ai-chat` (ou `mcp-proxy`) deve utilizar os campos `bot_url` e `bot_api_key` recentemente adicionados em `ai_settings`, substituindo os `.env` hardcodados do servidor.
3. **Integração Vercel AI SDK ➔ Bot MCP:** O `ai-chat` já possui a estrutura `tool({ ... })`. Ele deve redirecionar corretamente os parâmetros de consulta para a URL do bot configurada pelo usuário. O Bot processará os *jobs* via `/v1/jobs` (com polling) ou a rota equivalente, retornando os dados consultados para que o LLM os interprete e responda ao usuário.

## Contratos de Dados
- **Tabela `ai_settings`:** Os campos `bot_url` e `bot_api_key` já existem e serão lidos no backend via `supabase.auth.getUser()`.
- **Payload do MCP Proxy:** O objeto `invokeMCP(action, params)` receberá os dados da chave e URL dinamicamente para não depender de `Deno.env.get('MCP_URL')`.

## API / Interface
- **Edge Function `ai-chat`:**
  - Extrairá `settings.bot_url` e `settings.bot_api_key`.
  - Injetará esses dados no payload da função `mcp-proxy` (ou fará o fetch do polling diretamente na `ai-chat` para reduzir latência de cold start entre functions).
- **Edge Function `mcp-proxy`:**
  - Se mantida, será alterada para receber `mcpUrl` e `workerKey` pelo *body* da requisição, caindo para `Deno.env` apenas como fallback.
- **Frontend `agente.tsx`:** O botão de "Acionar Sincronização" da aba Bot pode continuar disparando a sincronia por POST `/api/sync/all`, que é um atalho útil de painel de controle, mas o fluxo conversacional do Chat voltará a ser 100% via *Tool Calling* nativo da IA (vetor `toolResults` e inserção em `mcp_logs`).

## Features Existentes Impactadas
- **`src/routes/agente.tsx`**: Alterado para limpar a lógica de string magic.
- **`supabase/functions/ai-chat` e `mcp-proxy`**: Central de requisições de IA.

## Risco Principal
Como o `mcp-proxy` utiliza um sistema de polling assíncrono longo (até 60s) para aguardar o scraping do Playwright, as requisições podem dar timeout no lado do frontend se passarem de 30-60 segundos. É preciso garantir que o Vercel AI SDK mantenha a stream viva.
