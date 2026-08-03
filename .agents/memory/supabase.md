## [2026-08-03] ‚Äî [Feature ID: 058-ai-agent-ux-costs]

**Contexto:** Inser√ß√£o de dados de custo estimado e tokens (`prompt_tokens`, `completion_tokens`) na tabela `ai_execution_logs` ao t√©rmino do streaming via Vercel AI SDK.

**Regra aprendida:** Utilize o callback `onFinish` da fun√ß√£o `streamText` no SDK da Vercel AI para extrair os `usage.promptTokens` e `usage.completionTokens`. √â mais eficiente e centralizado fazer o insert na tabela de logs diretamente pela Edge Function assim que a stream encerra, utilizando o `supabaseAdmin` para bypassar RLS se necess√°rio, ou pelo menos registrar de forma confi√°vel do lado do servidor.

**Risco identificado:** A inser√ß√£o pode falhar se n√£o houver um `try/catch` ao redor de `supabaseAdmin.from('ai_execution_logs').insert(...)`. Falhas nesse log n√£o devem quebrar a resposta que j√° foi enviada ao usu√°rio.

**N√£o fazer:** N√£o deixe o front-end calcular e salvar os custos de token (a menos que seja apenas c√°lculo de exibi√ß√£o), o backend (Edge Function) tem a contagem real ap√≥s a resposta.


## [2026-08-03] ó [Feature ID: 060-oficina-sync-ui-cron]

**Contexto:** Agendamento nativo no banco para disparo de background jobs e logs das tools de IA.
**Regra aprendida:** O Supabase possui as extensıes pg_cron e pg_net. VocÍ pode agendar requisiÁıes HTTP para Edge Functions locais usando cron.schedule em conjunto com 
et.http_post. No entanto, chamadas protegidas requerem passagem explÌcita do header Authorization: Bearer <Anon_ou_Service_Key> dentro do JSONB no PostgreSQL.
**Risco identificado:** Ambientes de desenvolvimento local e nuvem possuem URLs distintas. Nunca fixe 'http://localhost' na nuvem. Migrations com pg_net na nuvem requerem privilÈgios superuser ou roles especÌficos.
**N„o fazer:** N„o deixe o usu·rio descobrir que a sincronizaÁ„o autom·tica parou. Monitore a sa˙de dos crons via telemetria.
