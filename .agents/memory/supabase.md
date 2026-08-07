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

## Delegação de Processamento (Specs 099, 109, 110)
- **Regra de Ouro:** O React nunca deve usar .reduce() ou .filter() em massa para cálculos financeiros ou pareamentos.
- **Null Contagion:** Em PL/pgSQL, ao fazer cálculos, SEMPRE use COALESCE(val, 0) para TODAS as variáveis de soma ou extração, evitando que falhas de linha resultem em aniquilação matemática (soma + NULL = NULL).
- **Matemática Inviolável do Dashboard (get_dashboard_metrics):** A lógica mestra financeira reside 100% no Supabase. O Frontend apenas consome os 10 passos pré-agregados (Caixa Atual, Fluxo CX, Fatura, Diferença, etc.).
- **O Pareador Inteligente (uto_match_transactions):** A conciliação OFX vs. Rede/PIX ocorre no backend via cursores, empilhando frações da maquininha até atingir o total do extrato. Isso atualiza matched_ofx_id e match_status = 'MATCHED', permitindo que o React exiba os dados pré-vinculados sem sobrecarga.

## [2026-08-07] — [Feature ID: 114]

**Contexto:** Correção de bugs sequenciais de typo (coluna fantasma parsed_pix_transfer e payment_methods no plural) na RPC calculate_daily_conciliation do Supabase.

**Regra aprendida:** O parser de funções PL/pgSQL do Supabase/PostgreSQL tem validações relaxadas no momento da criação para queries estáticas dependendo de como as tabelas são referenciadas. Erros de colunas inexistentes ou de digitação (payment_methods vs payment_method) muitas vezes só estouram durante a chamada da API (PostgREST), resultando em 400 Bad Request.

**Risco identificado:** Assumir que se o CREATE OR REPLACE FUNCTION passou, o schema está 100% correto. 

**Não fazer:** Nunca crie ou altere uma função RPC que referencie uma tabela sem olhar o schema exato real da tabela (através das migrations anteriores) em vez de apenas inferir o nome das colunas.
