## [2026-08-03] — [Feature ID: 058-ai-agent-ux-costs]

**Contexto:** Inserção de dados de custo estimado e tokens (`prompt_tokens`, `completion_tokens`) na tabela `ai_execution_logs` ao término do streaming via Vercel AI SDK.

**Regra aprendida:** Utilize o callback `onFinish` da função `streamText` no SDK da Vercel AI para extrair os `usage.promptTokens` e `usage.completionTokens`. É mais eficiente e centralizado fazer o insert na tabela de logs diretamente pela Edge Function assim que a stream encerra, utilizando o `supabaseAdmin` para bypassar RLS se necessário, ou pelo menos registrar de forma confiável do lado do servidor.

**Risco identificado:** A inserção pode falhar se não houver um `try/catch` ao redor de `supabaseAdmin.from('ai_execution_logs').insert(...)`. Falhas nesse log não devem quebrar a resposta que já foi enviada ao usuário.

**Não fazer:** Não deixe o front-end calcular e salvar os custos de token (a menos que seja apenas cálculo de exibição), o backend (Edge Function) tem a contagem real após a resposta.
