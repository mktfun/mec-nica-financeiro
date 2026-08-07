# Design: AutomaçÁo Cron e Interface de Telemetria Híbrida (060-oficina-sync-ui-cron)

## Arquitetura Técnica
1. **Agendador em Nuvem (Cron)**:
   Supabase pg_cron → `net.http_post` → Edge Function (`sync-oficina`).
   Isso permite que a infraestrutura se auto-sustente sem clientes ativos.
2. **Telemetria de Ferramentas (MCP Logs)**:
   A Edge Function AI grava o uso de ferramentas (Cache hit vs API call) em `mcp_logs`. A UI vai ler dessa tabela para alimentar o `LogsAgentePanel`, deixando claro quando a IA alucinou ou quando usou o Cache.

## Componentes / Hooks / Funções
- **Migration SQL**: `20260803000001_cron_sync.sql`
  Habilita extensões `pg_cron` e `pg_net`. Agenda uma tarefa para rodar `sync-oficina` a cada 2 horas (ou por loja, se necessário).
- **Hook `useMcpLogs.ts`** (Novo): Fetch reativo da tabela `mcp_logs`.
- **Componente `LogsAgentePanel.tsx`** (Atualizado): Substitui o fetch de `bot_logs` por `useMcpLogs`, formatando o `payload` para exibiçÁo de JSON formatado e `source` (cache/db/bot).
- **Componente `CacheAgentePanel.tsx`** (Novo): UI para inspecionar `oficina_os_cache`, com badge de status (Em andamento / Finalizado).
- **Rota `agente.tsx`**: InclusÁo de nova tab `cache` ligada ao `CacheAgentePanel`.

## Infra / Deploy
- O Job Cron do Supabase requer que as chaves de segurança (Anon Key ou Service Role) sejam passadas nos headers HTTP se a Edge Function for protegida. Como `sync-oficina` (no momento) é invocada publicamente ou com auth, passaremos o header Authorization configurado na query do net.http_post.
- **Topologia**: Supabase DB Cron -> Edge Function.

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)
- Cenário 1: Rodar o Cron SQL. Verificar no Supabase Dashboard se a chamada HTTP post ocorreu com sucesso e nÁo deu 403.
- Cenário 2: Acessar a tela "Agente IA", ir em Logs e validar se a chamada da ferramenta (ex: `consulta_os_detalhe_completo`) aparece com `source: "bot"` ou `source: "cache"`.
