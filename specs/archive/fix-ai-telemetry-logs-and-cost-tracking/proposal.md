# Proposal: Correção da Telemetria de Consumo, Logs & Custos de IA (fix-ai-telemetry-logs-and-cost-tracking)

## Problema
Na tela `/agente` (Abas "Telemetria & Custos" e "DevTools Inspector"), a contagem de tokens, chamadas auditadas, custo em USD/BRL e a tabela de logs exibiam **0** e **"Nenhum log registrado ainda"**.
Root cause identificada:
1. A tabela `public.ai_execution_logs` não havia sido provisionada com as permissões de RLS no schema do Supabase REST API (erro `PGRST205 - Could not find table public.ai_execution_logs`).
2. A hook `useAiSettings` dependia estritamente de `supabase.auth.getUser()`. Se o usuário não estivesse logado em sessão JWT ativa, a salvaguarda falhava ou não gravava a chave no banco para a conciliação silenciosa.

## Solução Proposta
1. Confirmar e garantir o schema da tabela `public.ai_execution_logs` com políticas de RLS liberadas (`ALLOW ALL USING true`), além da tabela `public.ai_settings`.
2. Atualizar `useAiSettings.ts` para persistir e carregar `ai_settings` (usando fallback `GLOBAL` quando não logado).
3. Adicionar um botão de teste de disparo manual da IA ("Testar Conciliação & Gerar Telemetria") na aba de Telemetria/Inspector para permitir auditoria instantânea sem esperar a navegação da conciliação.
4. Garantir que `generateTripleMatchSuggestions` grave os tokens, custo estimado ($ USD e R$ BRL) e o log em `ai_execution_logs`.

## Contratos de Dados
### Tabela `public.ai_execution_logs`:
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `created_at` TIMESTAMPTZ DEFAULT now()
- `store_id` TEXT
- `provider` TEXT
- `model` TEXT
- `prompt_tokens` INT DEFAULT 0
- `completion_tokens` INT DEFAULT 0
- `total_tokens` INT DEFAULT 0
- `estimated_cost` NUMERIC(10, 6) DEFAULT 0
- `execution_time_ms` INT DEFAULT 0
- `raw_payload_json` JSONB
- `raw_response_json` JSONB
- `reasoning_steps_json` JSONB
- `matches_applied_count` INT DEFAULT 0

### Tabela `public.ai_settings`:
- `user_id` TEXT PRIMARY KEY
- `provider` TEXT DEFAULT 'google'
- `model` TEXT DEFAULT 'gemini-2.0-flash'
- `api_key` TEXT
- `updated_at` TIMESTAMPTZ DEFAULT now()

## API / Interface
- `useAiSettings()`: Lê de `ai_settings` (`user_id` logado ou `'GLOBAL'`) + fallback `VITE_GEMINI_API_KEY`.
- `useSaveAiSettings()`: Salva em `ai_settings` com `user_id` logado ou `'GLOBAL'`.
- `saveTelemetryLog(log)`: Insere registros em `public.ai_execution_logs`.
- `/agente`: Renderiza os 4 cards de telemetria (Tokens, Custo USD/BRL, Chamadas, Matches) e a lista do Inspector JSON.

## Features Existentes Impactadas
- `src/routes/agente.tsx`: Interface de gestão do agente, telemetria e inspector.
- `src/hooks/useAiSettings.ts`: Gerenciamento de credenciais do modelo LLM.
- `src/lib/llm-matcher.ts`: Chamada às APIs do Gemini/OpenAI/Claude e inserção de telemetria.

## Risco Principal
Chave de API em branco caso o usuário limpe as configurações.
*Mitigação:* `saveTelemetryLog` trata erros graciosamente e `useAiSettings` sempre faz fallback para `import.meta.env.VITE_GEMINI_API_KEY`.
