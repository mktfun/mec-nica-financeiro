# Proposal: Central Dedicada de Inteligência, Telemetria & Gestão da IA (`/agente`) (dedicated-ai-telemetry-hub)

## Problema

1. O usuário solicitou explicitamente que a gestão, telemetria e logs da IA não fiquem "jogados" na tela de configurações comuns (`/configuracoes`), exigindo uma **tela dedicada e profissional**.
2. Erro no console `Could not find the table 'public.bot_audit_logs' in the schema cache` disparado pelo hook `useBotLogs.ts` tentando consultar uma tabela inexistente.

## Solução Proposta

1. **Correção do Hook `useBotLogs.ts`:**
   - Redirecionar a consulta para `ai_execution_logs` ou `import_logs`, tratando erros com fallback gracioso sem emitir exceções no console.

2. **Criação da Central Dedicada de Inteligência IA em `/agente`:**
   - Transformar a rota `/agente` em um **Centro de Comando Dedicado da IA** com 4 abas profissionais:
     - **Aba 1: `💬 Chat do Agente`** — Assistente conversacional com histórico de conversas.
     - **Aba 2: `⚙️ Provedores & API Keys`** — Configuração de modelos (Gemini 2.0, GPT-4o, Claude 3.5 Sonnet) e chaves de API.
     - **Aba 3: `📊 Telemetria & Custos`** — Dashboard financeiro com contagem de Tokens (Prompt/Completion), Custo Estimado ($ USD e R$ BRL), Tempo de Execução (ms) e Taxa de Sucesso.
     - **Aba 4: `🔍 Inspector de JSON & Raciocínio`** — Inspector estilo DevTools para analisar o Input Payload JSON, Output Response JSON e o Raciocínio (Chain of Thought) de cada chamada silenciosa efetuada.

3. **Limpeza da Tela de Configurações (`/configuracoes`):**
   - Manter em `/configuracoes` apenas configurações gerais (Lojas, Credenciais de Acesso de Automação).
   - Adicionar um atalho elegante para a nova **Central de Inteligência (`/agente`)**.

## Contratos de Dados
- Tabela `ai_execution_logs` (existente no Supabase):
  - `id`, `created_at`, `store_id`, `provider`, `model`, `prompt_tokens`, `completion_tokens`, `total_tokens`, `estimated_cost`, `execution_time_ms`, `raw_payload_json`, `raw_response_json`, `reasoning_steps_json`, `matches_applied_count`

## Features Existentes Impactadas
- `src/routes/agente.tsx` (estruturada em 4 abas dedicadas)
- `src/routes/configuracoes.tsx` (removido bloco empilhado e adicionado redirecionamento elegante para `/agente`)
- `src/hooks/useBotLogs.ts` (corrigida busca para não disparar aviso no console)

## Risco Principal
Quebra de compatibilidade nas conversas ativas do chat do agente ao migrar para abas.
*Mitigação:* Isolar a lógica de chat na primeira aba (`💬 Chat do Agente`) preservando integralmente o estado e os hooks de conversação.
