# Spec Plan: RefatoraçÁo do Bot para API de Consulta MCP (bot-mcp-refactor)

## Tasks

- [ ] [BACKEND] Atualizar `supabase/functions/mcp-proxy/index.ts` para extrair `mcpUrl` e `workerKey` (opcional) a partir do `req.json()` ou de cabeçalhos customizados enviados na requisiçÁo, utilizando `Deno.env` apenas como fallback caso nÁo venham.
- [ ] [BACKEND] Atualizar `supabase/functions/ai-chat/index.ts` para ler `bot_url` e `bot_api_key` da consulta já existente em `ai_settings` e passar para a funçÁo helper `invokeMCP`.
- [ ] [FRONTEND] Em `src/routes/agente.tsx`, no método `sendMessage`, remover completamente o bloco de interceptaçÁo via regex `botSyncMatch` e as chamadas via `fetch` direto (já que as ferramentas voltarÁo a rodar no backend e os logs MCP nativos lidarÁo com o registro da açÁo).
- [ ] [TEST] Verificar cenário 1: Realizar pergunta no chat da UI: "Verifique o status das Ordens de Serviço da semana". Observar se o log MCP e a resposta da IA fluem perfeitamente usando as configurações de bot inseridas no DB.
