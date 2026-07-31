# Proposal: Ativação Automática do Motor de Conciliação por IA e Telemetria em Background (enable-auto-ai-reconciler-telemetry)

## Problema

Na tela de Telemetria & DevTools Inspector (`/agente`), o usuário notou que o contador de **Tokens Totais**, **Chamadas Auditadas**, **Custo Estimado** e **Matches Aplicados** exibia tudo zerado (`0`), e o inspetor dizia "Nenhum log registrado ainda".

### 🔍 Causas Raiz Identificadas:
1. **Verificação Rígida de API Key Vazia:** Em `useBackgroundAiReconciler.ts` (linha 19), havia uma trava `if (!aiSettings?.api_key || !aiSettings.provider) return;`. Se o usuário não tivesse digitado manualmente uma API Key em `/agente`, o reconciliador em background abortava silenciosamente e 0 chamadas à IA eram efetuadas.
2. **Falta de Fallback de Chave do Sistema:** A aplicação não possuía fallback para chaves de ambiente (`import.meta.env.VITE_GEMINI_API_KEY`), dependendo 100% de registros no banco Supabase.
3. **Escopo Restrito de Disparo:** O hook `useBackgroundAiReconciler` só estava presente em `conciliacao.$lojaId.tsx`, omitindo o disparo após o encerramento da importação de arquivos em `/importacoes` ou na visão global da conciliação `/conciliacao`.

## Solução Proposta

1. **Fallback de API Key & Provider Padrão:**
   - Atualizar `useAiSettings.ts` e `llm-matcher.ts` para utilizar `import.meta.env.VITE_GEMINI_API_KEY` (ou chave padrão configurada no ambiente) caso a chave na tabela `ai_settings` esteja vazia.
   - Garantir que se nenhuma chave for fornecida no frontend, o reconciliador utilize a chave configurada no sistema de forma transparente.

2. **Ativação Ampla do Reconciliador em Background:**
   - Invocar `useBackgroundAiReconciler` no fluxo global da conciliação (`conciliacao.index.tsx`) e ao finalizar qualquer lote de importação.

3. **Garantia de Gravação de Telemetria (`ai_execution_logs`):**
   - Garantir que toda execução (com sucesso ou falha) grave o log em `ai_execution_logs`, registrando tokens de entrada/saída, tempo em ms, payload JSON e raciocínio passo-a-passo.

## Contratos de Dados
- Tabela `ai_settings` (campos `provider`, `model`, `api_key`)
- Tabela `ai_execution_logs` (campos `prompt_tokens`, `completion_tokens`, `total_tokens`, `estimated_cost`, `execution_time_ms`, `raw_payload_json`, `raw_response_json`, `reasoning_steps_json`, `matches_applied_count`)

## Features Existentes Impactadas
- `src/hooks/useAiSettings.ts`
- `src/hooks/useBackgroundAiReconciler.ts`
- `src/lib/llm-matcher.ts`
- `src/routes/agente.tsx`
- `src/routes/conciliacao.index.tsx`

## Risco Principal
Gasto excessivo de API Key em re-renders do React.
*Mitigação:* Manter a trava de hash `storeId_targetDate_unmatchedCount` em `useBackgroundAiReconciler.ts` para disparar no máximo 1 vez por conjunto de dados sem match.
