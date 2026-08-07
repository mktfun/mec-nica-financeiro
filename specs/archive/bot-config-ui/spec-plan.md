# Spec Plan: Bot Config UI & MCP Agent Integration (bot-config-ui)

## Tasks

- [x] [BACKEND] Criar nova migration Supabase (`20260728000000_add_bot_settings.sql`) — arquivo criado. **PENDENTE APLICAÇÁO MANUAL** no SQL Editor do Supabase (cola o ALTER TABLE abaixo).
- [x] [FRONTEND] Atualizar `src/hooks/useAiSettings.ts` para ler e salvar os campos `bot_url` e `bot_api_key`.
- [x] [FRONTEND] Criar/atualizar `src/hooks/useBotLogs.ts` com hook `useBotAuditLogs` para fazer select na tabela `bot_audit_logs`.
- [x] [FRONTEND] Em `src/routes/agente.tsx`, adicionar a opçÁo `'bot'` no estado `activeMainTab` ("Bot & MCP").
- [x] [FRONTEND] Em `src/routes/agente.tsx`, implementar a interface de configuraçÁo na aba 'bot': Inputs de URL/Key, botÁo Salvar, botÁo Testar (com fetch pro endpoint remoto) e lista/tabela para renderizar os `bot_audit_logs`.
- [x] [FRONTEND] Implementar interceptaçÁo de "MCP Tool Call" `[BOT_SYNC:service]` na funçÁo `sendMessage` do chat.
- [/] [TEST] Verificar cenário 1: URL/Key salvas corretamente e botÁo de teste retornando 200/Success.
- [ ] [TEST] Verificar cenário 3: Acionar a sincronizaçÁo pelo chat ("Ative o bot para puxar os dados de hoje") e ver a tool_call sendo interceptada com sucesso.
