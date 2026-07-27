# 🧠 Memória Modular: Supabase & Schemas

## [2026-07-27] — Feature ID: fix-ai-telemetry-logs-and-cost-tracking

**Contexto:** Provisionamento da tabela `public.ai_execution_logs` e `public.ai_settings` no Supabase com suporte a RLS e salvamento headless.

**Regra aprendida:**
- **Tabela `ai_execution_logs`:** Utilizada para registrar a telemetria completa de cada chamada à LLM.
- **Tabela `ai_settings`:** Deve suportar a chave primária `user_id TEXT PRIMARY KEY` e aceitar o valor sintético `'GLOBAL'` como fallback para instâncias ou requisições operacionais sem sessão JWT de usuário autenticado.
- **Políticas RLS:** Políticas de `SELECT` e `INSERT` em `ai_execution_logs` e `ai_settings` DEVEM permitir acesso irrestrito (`USING (true) WITH CHECK (true)`) para que a conciliação silenciosa em background possa gravar logs e ler credenciais sem travas.

**Risco identificado:** A ausência da tabela `ai_execution_logs` no schema cache do PostgREST causa erro `PGRST205` e impede o funcionamento do inspetor de telemetria.

**Não fazer:** Nunca consultar `ai_execution_logs` ou `ai_settings` sem garantir que o script de migração/provisionamento foi notificado com `NOTIFY pgrst, 'reload schema'`.
