# Spec Plan: AutomaçÁo Cron e Interface de Telemetria Híbrida (060-oficina-sync-ui-cron)

## Tasks

- [x] [BACKEND] Criar nova migration `20260803000001_cron_sync.sql`.
- [x] [BACKEND] Inserir SQL para habilitar `pg_cron` e `pg_net` (se nÁo existirem) e criar o agendamento `cron.schedule('sync-oficina-hourly', '0 * * * *', ...)` enviando HTTP POST para a Edge Function.
- [x] [FRONTEND] Criar hook `useMcpLogs.ts` em `src/hooks/` para buscar os registros de `mcp_logs`.
- [x] [FRONTEND] Refatorar `LogsAgentePanel.tsx` para listar `mcp_logs` no lugar de `bot_logs`, exibindo a `action` (tool_name) e o `params.source` como destaque visual (Cache vs Bot).
- [x] [FRONTEND] Criar hook `useOsCache.ts` para buscar `oficina_os_cache`.
- [x] [FRONTEND] Criar componente `CacheAgentePanel.tsx` listando os caches atuais da oficina.
- [x] [FRONTEND] Adicionar nova aba "Cache Oficina" na rota `src/routes/agente.tsx`.
- [x] [TEST] Verificar cenário 1: Logs de MCP populam o Painel corretamente com formato JSON das invocações.
- [x] [TEST] Verificar cenário 2: Nova aba exibe os OSs cacheados corretamente e o Cron Job nÁo tem erro de permissÁo na Edge Function.
