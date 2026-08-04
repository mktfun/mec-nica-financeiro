## [2026-08-03] â€” [Feature ID: 058-ai-agent-ux-costs]

**Contexto:** InserÃ§Ã£o de dados de custo estimado e tokens (`prompt_tokens`, `completion_tokens`) na tabela `ai_execution_logs` ao tÃ©rmino do streaming via Vercel AI SDK.

**Regra aprendida:** Utilize o callback `onFinish` da funÃ§Ã£o `streamText` no SDK da Vercel AI para extrair os `usage.promptTokens` e `usage.completionTokens`. Ã‰ mais eficiente e centralizado fazer o insert na tabela de logs diretamente pela Edge Function assim que a stream encerra, utilizando o `supabaseAdmin` para bypassar RLS se necessÃ¡rio, ou pelo menos registrar de forma confiÃ¡vel do lado do servidor.

**Risco identificado:** A inserÃ§Ã£o pode falhar se nÃ£o houver um `try/catch` ao redor de `supabaseAdmin.from('ai_execution_logs').insert(...)`. Falhas nesse log nÃ£o devem quebrar a resposta que jÃ¡ foi enviada ao usuÃ¡rio.

**NÃ£o fazer:** NÃ£o deixe o front-end calcular e salvar os custos de token (a menos que seja apenas cÃ¡lculo de exibiÃ§Ã£o), o backend (Edge Function) tem a contagem real apÃ³s a resposta.


## [2026-08-03] — [Feature ID: 060-oficina-sync-ui-cron]

**Contexto:** Agendamento nativo no banco para disparo de background jobs e logs das tools de IA.
**Regra aprendida:** O Supabase possui as extensões pg_cron e pg_net. Você pode agendar requisições HTTP para Edge Functions locais usando cron.schedule em conjunto com 
et.http_post. No entanto, chamadas protegidas requerem passagem explícita do header Authorization: Bearer <Anon_ou_Service_Key> dentro do JSONB no PostgreSQL.
**Risco identificado:** Ambientes de desenvolvimento local e nuvem possuem URLs distintas. Nunca fixe 'http://localhost' na nuvem. Migrations com pg_net na nuvem requerem privilégios superuser ou roles específicos.
**Não fazer:** Não deixe o usuário descobrir que a sincronização automática parou. Monitore a saúde dos crons via telemetria.

## [2026-08-04] — [Feature ID: 074-fix-bootstrap]

**Contexto:** Ocorreu um erro 400 Bad Request ao fazer o UPSERT em `daily_snapshots` durante o Bootstrap porque a UI tentava iterar pelas lojas e enviar `store_id`, enquanto a tabela é global.

**Regra aprendida:** A tabela `daily_snapshots` é estritamente **Global (da rede inteira)** e tem sua unique constraint apenas em `date`. A tabela `reconciliations` é que é **por loja** (com constraint `store_id, date`). Ao persistir formulários financeiros por loja (ex: fluxo de caixa), deve-se acumular as métricas globais no código (`total_faturamento`, etc) antes de realizar um único upsert na tabela `daily_snapshots`.

**Risco identificado:** Tentar usar propriedades inexistentes num UPSERT ou no `onConflict` (ex: enviar `store_id` para uma tabela global) faz a API Rest do Supabase rejeitar a query com erro 400.

**Não fazer:** Nunca crie lógicas de upsert presumindo que todas as tabelas usam `store_id`. Sempre verifique a constraint UNIQUE no arquivo original de migration SQL para saber a verdadeira chave composta.
