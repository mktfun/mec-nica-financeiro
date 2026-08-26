# Proposal: Resolução de PGRST303 (JWT issued at future) e Blindagem de AI Settings (296)

## Problema
1. **Erro PGRST303 (`JWT issued at future`) em `useStores`:**
   - O PostgREST rejeita requisições autenticadas com código `PGRST303: JWT issued at future` quando o timestamp (`iat`) do token de sessão no navegador do usuário apresenta divergência de relógio (*clock skew*) em relação ao servidor do banco de dados.
   - Como a policy de `SELECT` em `stores` exigia autenticação restrita (`auth.uid() IS NOT NULL`), a falha de JWT bloqueava a listagem das 10 filiais, deixando a aplicação sem carregar as lojas.
2. **Erro 400 em `ai_settings`:**
   - O hook `useAiSettings` executava `.select('provider, model, api_key, bot_url, bot_api_key').eq('user_id', userId)`.
   - A tabela `ai_settings` no PostgreSQL só possuía as colunas `id`, `bot_url`, `bot_api_key`, faltando as colunas `provider`, `model`, `api_key` e `user_id`, gerando erro HTTP 400 no console em todas as páginas.

## Solução Proposta
1. **Blindagem de Acesso a `stores` e Recuperação Automática de JWT:**
   - Ajustar a policy de leitura da tabela `stores` para `FOR SELECT USING (true)` (permitindo leitura irrestrita das lojas de referência do sistema).
   - No hook `useStores.ts`, interceptar erro de JWT (`PGRST303` ou `JWT issued at future`) e fazer recuperação automática com `supabase.auth.refreshSession()` ou fallback seguro, garantindo que o painel de lojas nunca trave.
2. **Atualização do Schema de `ai_settings`:**
   - Adicionar as colunas que faltam na tabela `ai_settings`: `provider text DEFAULT 'google'`, `model text DEFAULT 'gemini-3.5-flash-lite'`, `api_key text`, `user_id text`.
   - Criar policy de RLS em `ai_settings` para leitura e gravação segura.

## Contratos de Dados & Backend
- **Tabelas:** `stores`, `ai_settings`.
- **Hooks:** `src/hooks/useStores.ts`, `src/hooks/useAiSettings.ts`.

## Risco Principal
- **Risco:** Usuário com token JWT expirado ou relógio dessincronizado continuar em loop.
- **Mitigação:** Tratamento catch no React Query com fallback gracioso.
