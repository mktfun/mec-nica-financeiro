# Spec Plan: Bot Config UI & MCP Agent Integration (bot-config-ui)

## Tasks

- [x] [BACKEND] Criar nova migration Supabase (`20260728000000_add_bot_settings.sql`) — arquivo criado. **PENDENTE APLICAÇÃO MANUAL** no SQL Editor do Supabase (cola o ALTER TABLE abaixo).
- [x] [FRONTEND] Atualizar `src/hooks/useAiSettings.ts` para ler e salvar os campos `bot_url` e `bot_api_key`.
- [x] [FRONTEND] Criar/atualizar `src/hooks/useBotLogs.ts` com hook `useBotAuditLogs` para fazer select na tabela `bot_audit_logs`.
- [x] [FRONTEND] Em `src/routes/agente.tsx`, adicionar a opção `'bot'` no estado `activeMainTab` ("Bot & MCP").
- [x] [FRONTEND] Em `src/routes/agente.tsx`, implementar a interface de configuração na aba 'bot': Inputs de URL/Key, botão Salvar, botão Testar (com fetch pro endpoint remoto) e lista/tabela para renderizar os `bot_audit_logs`.
- [x] [FRONTEND] Implementar interceptação de "MCP Tool Call" `[BOT_SYNC:service]` na função `sendMessage` do chat.
- [/] [TEST] Verificar cenário 1: URL/Key salvas corretamente e botão de teste retornando 200/Success.
- [ ] [TEST] Verificar cenário 3: Acionar a sincronização pelo chat ("Ative o bot para puxar os dados de hoje") e ver a tool_call sendo interceptada com sucesso.
