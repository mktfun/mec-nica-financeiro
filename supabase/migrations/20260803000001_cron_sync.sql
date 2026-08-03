-- Habilita as extensões necessárias (se não estiverem habilitadas)
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- OBSERVAÇÃO IMPORTANTÍSSIMA:
-- Substitua 'SUA_SUPABASE_PROJECT_URL' pela URL real do seu projeto (ex: https://xxx.supabase.co)
-- Substitua 'SEU_ANON_KEY' pela sua chave anônima ou service role.
-- No ambiente local, o pg_cron e pg_net requerem configurações extras.

SELECT cron.schedule(
  'sync-oficina-hourly',
  '0 * * * *',
  $$
    SELECT net.http_post(
      url:='https://SUA_SUPABASE_PROJECT_URL/functions/v1/sync-oficina',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer SEU_ANON_KEY"}'::jsonb,
      body:='{"source": "cron"}'::jsonb
    );
  $$
);
