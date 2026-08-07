# Proposal: ConciliaçÁo Headless em Background & Central de Telemetria/Logs da IA (headless-background-ai-reconciliation)

## Problema

- O usuário nÁo deseja nenhuma intervençÁo manual (botoes, modais ou confirmações) nem qualquer elemento visual com o rótulo "IA" na tela de conciliaçÁo do dia a dia.
- Toda a conciliaçÁo por IA deve ocorrer **100% em background (silent/headless)**, de forma imperceptível na interface principal.
- Por outro lado, o usuário exige **telemetria e auditabilidade total na tela de Configurações (`/configuracoes`)**, contendo:
  - Logs detalhados de requisições e respostas JSON brutas enviadas/recebidas.
  - Raciocínio (Chain of Thought / passos) da IA em cada associaçÁo realizada.
  - Consumo de tokens (prompt, completion, total) por chamada e custo estimado acumulado no período selecionado.
  - Auditoria completa da infraestrutura de IA.

## SoluçÁo Proposta

1. **RemoçÁo Completa da UI Visible de IA na ConciliaçÁo:**
   - Excluir o botÁo "✨ Conciliar com IA" e o modal da tela de conciliaçÁo (`src/routes/conciliacao.$lojaId.tsx`).
   - A conciliaçÁo por IA rodará de forma nativa e assíncrona dentro dos hooks de conciliaçÁo / importaçÁo (`useConciliacao.ts` / `useImportProcessor.ts`), aplicando automaticamente os vínculos com alta confiança no banco de dados.

2. **CriaçÁo da Tabela `ai_execution_logs` no Supabase:**
   - Tabela de telemetria completa para gravar todas as chamadas realizadas à API de LLM.
   - Campos: `id`, `created_at`, `store_id`, `provider`, `model`, `prompt_tokens`, `completion_tokens`, `total_tokens`, `estimated_cost`, `raw_payload_json`, `raw_response_json`, `matches_count`, `execution_time_ms`.

3. **Painel Completo de Telemetria e Logs na Tela de Configurações (`/configuracoes`):**
   - Nova aba / seçÁo **"Telemetria e Auditoria de IA"** em `/configuracoes`.
   - Filtro por período de datas e por provedor/modelo.
   - Métricas acumuladas: **Total de Tokens Utilizados**, **Custo Estimado ($ / R$)**, **Total de Chamadas** e **Taxa de Sucesso de Matches**.
   - Tabela de chamadas expansível estilo terminal/inspector com payload JSON de entrada, resposta JSON de saída e o raciocínio detalhado de cada associaçÁo efetuada pela IA.

## Contratos de Dados
- Tabela `ai_execution_logs`:
  - `id` (uuid, PK)
  - `created_at` (timestamptz)
  - `store_id` (uuid, FK)
  - `provider` (text: 'google' | 'openai' | 'anthropic')
  - `model` (text)
  - `prompt_tokens` (integer)
  - `completion_tokens` (integer)
  - `total_tokens` (integer)
  - `estimated_cost` (numeric)
  - `raw_payload_json` (jsonb)
  - `raw_response_json` (jsonb)
  - `matches_count` (integer)

## Features Existentes Impactadas
- `src/routes/conciliacao.$lojaId.tsx` (remover botÁo visível)
- `src/lib/llm-matcher.ts` (gravar logs na tabela `ai_execution_logs` e aplicar matches direto no DB)
- `src/routes/configuracoes.tsx` (adicionar dashboard de telemetria e logs JSON)

## Risco Principal
Garantir que a conciliaçÁo silenciosa em background nÁo gere falso-positivos em banco.
*MitigaçÁo:* Exigir nota de confiança mínima de 90% para aplicaçÁo automática silenciosa e registrar todas as justificativas no log.
