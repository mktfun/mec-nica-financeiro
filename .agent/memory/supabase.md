# 🧠 Memória Modular: Supabase & Schemas

## [2026-07-28] — Feature ID: bot-mcp-refactor

**Contexto:** Refatoração da integração do Bot Playwright para operar como uma API de Consulta MCP verdadeira (Model Context Protocol) via Vercel AI SDK na Edge Function `ai-chat`, substituindo strings mágicas no frontend.

**Regra aprendida:**
- **Injeção Dinâmica em Edge Functions:** Em orquestrações de IA onde serviços externos (como Bots/Crawlers headless) são consumidos, as chaves (ex: `bot_url` e `bot_api_key`) devem ser lidas da tabela `ai_settings` do banco e repassadas no *body* das chamadas internas (ex: `supabase.functions.invoke('mcp-proxy', { body: { config: ... } })`).
- **Tool Calling Nativo:** Nunca usar regex no frontend (ex: `[BOT_SYNC:...]`) para simular tools do LLM se o backend já estiver usando Vercel AI SDK (`ai@3`). Declare a `tool` no backend, execute o proxy e deixe o LLM formular a resposta nativamente baseada no `toolResult`.

**Risco identificado:** A dependência exclusiva de variáveis de ambiente (`Deno.env`) para rotas de proxy engessa a aplicação e impede que cada usuário/tenant conecte seu próprio bot.

**Não fazer:** Nunca interceptar intents do modelo via RegExp no frontend se o ecossistema for compatível com chamadas de função (Function Calling/Tools) do lado do servidor.

## [2026-07-27] — Feature ID: fix-ai-telemetry-logs-and-cost-tracking

**Contexto:** Provisionamento da tabela `public.ai_execution_logs` e `public.ai_settings` no Supabase com suporte a RLS e salvamento headless.

**Regra aprendida:**
- **Tabela `ai_execution_logs`:** Utilizada para registrar a telemetria completa de cada chamada à LLM.
- **Tabela `ai_settings`:** Deve suportar a chave primária `user_id TEXT PRIMARY KEY` e aceitar o valor sintético `'GLOBAL'` como fallback para instâncias ou requisições operacionais sem sessão JWT de usuário autenticado.
- **Políticas RLS:** Políticas de `SELECT` e `INSERT` em `ai_execution_logs` e `ai_settings` DEVEM permitir acesso irrestrito (`USING (true) WITH CHECK (true)`) para que a conciliação silenciosa em background possa gravar logs e ler credenciais sem travas.

**Risco identificado:** A ausência da tabela `ai_execution_logs` no schema cache do PostgREST causa erro `PGRST205` e impede o funcionamento do inspetor de telemetria.

**Não fazer:** Nunca consultar `ai_execution_logs` ou `ai_settings` sem garantir que o script de migração/provisionamento foi notificado com `NOTIFY pgrst, 'reload schema'`.

## [2026-07-28] — Feature ID: bot-traefik-routing

**Contexto:** Correção do mapeamento de transações de adquirência (Rede) para as lojas (`stores`).

**Regra aprendida:**
- A tabela `stores` no schema atual **não possui coluna `cnpj`**, apenas `name`. Mapeamentos de dados externos (como Cielo/Rede) que trazem o CNPJ precisam buscar correspondência fazendo parsing do nome (ex: `estabelecimento`) contra o `name` da tabela ou ser armazenados em uma tabela auxiliar de vínculos.

**Risco identificado:** Assumir esquemas legados (com `cnpj`) ao gerar scripts de integração backend causa erro de SQL no upload de lotes.

**Não fazer:** Nunca tentar usar colunas não validadas em ferramentas de inserção em massa sem antes consultar o type de interface (ex: `StoreRow` em `src/lib/supabase.ts`).
