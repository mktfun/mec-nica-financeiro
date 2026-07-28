# Proposal: Correções de Produção (CORS VPS e Schema Cache) (bot-production-fixes)

## Problema
1. O erro de CORS continua ocorrendo no frontend porque as alterações feitas no código fonte do bot (`mcp-oficina-standalone`) ainda estão apenas no seu computador local/workspace e **não foram implantadas na VPS** (`bot.tork.services`). O servidor remoto continua rodando a versão antiga sem o `@fastify/cors`.
2. O erro `404 (Not Found)` para a tabela `bot_audit_logs` indica que a tabela não existe no Supabase da nuvem ou o cache do PostgREST está desatualizado. A migration `20260714184300_bot_logs_and_goals.sql` já existe no código fonte, mas não foi totalmente refletida na cloud.

## Solução Proposta
1. **Infra (CORS):** Orientar/automatizar o deploy do bot atualizado para a VPS, ou forçar a configuração do Traefik/Cloudflare para injetar os headers de CORS caso você não queira dar deploy agora. O ideal é você puxar as mudanças (`git pull`) na VPS e reiniciar o container do bot.
2. **Banco de Dados (Schema):** Criar um script Node (headless) que injete a tabela `bot_audit_logs` forçadamente no Supabase Cloud (com políticas RLS liberadas) e chame `NOTIFY pgrst, 'reload schema'`, garantindo que o frontend pare de acusar `404 Not Found`.

## Contratos de Dados
- Tabela `bot_audit_logs` garantida na nuvem com RLS `USING (true)`.

## API / Interface
- Frontend `agente.tsx` vai conseguir ler `bot_audit_logs` sem erros.

## Features Existentes Impactadas
- Logs de Auditoria do Bot no Painel de IA.

## Risco Principal
Se a migration de goals (`20260714184300_bot_logs_and_goals.sql`) conflitasse com algo, mas vamos injetar apenas a criação condicional de `bot_audit_logs`.
