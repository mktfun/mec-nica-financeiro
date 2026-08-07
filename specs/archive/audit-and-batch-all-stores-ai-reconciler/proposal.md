# Proposal: ConciliaçÁo em Lote Multi-Loja Completa & Auditoria de Payloads de IA (audit-and-batch-all-stores-ai-reconciler)

## Problema
1. **Divergência nos Nomes das Colunas de Telemetria (`ai_execution_logs`):**
   - Ao inspecionar a tabela `public.ai_execution_logs` no Supabase e no DevTools Inspector da tela `/agente`, os campos `input_payload`, `output_payload` e `reasoning_steps` vinham com valor `null` ou `undefined`.
   - **Causa Raiz:** A funçÁo `generateTripleMatchSuggestions` enviava as chaves `raw_payload_json`, `raw_response_json` e `reasoning_steps_json`, enquanto a tabela no banco espera `input_payload`, `output_payload` e `reasoning_steps`.
2. **Processamento Limitado Apenas à Primeira Loja (`stores[0]`):**
   - Na rota `conciliacao.index.tsx`, o reconciliador de IA era ativado apenas com `firstStoreId` (`stores[0]`), ignorando totalmente as demais lojas da rede (ex: Loja 2, Loja 3).
   - Além disso, a busca no Supabase continha um limite fixo de 20 registros por chamada, deixando pendências excedentes sem análise.

## SoluçÁo Proposta

1. **CorreçÁo do Mapeamento do Log de Telemetria (`src/lib/llm-matcher.ts`):**
   - Mapear corretamente as chaves `input_payload`, `output_payload` e `reasoning_steps` para persistência no banco de dados e compatibilidade total com o Inspector JSON da tela `/agente`.
2. **Reconciliador Silencioso Multi-Loja Completo (`src/hooks/useBackgroundAiReconciler.ts`):**
   - Atualizar o hook `useBackgroundAiReconciler` para iterar sequencialmente sobre **todas as lojas da rede** (`stores`).
   - Para cada loja, buscar todas as OSs pendentes (`status != 'ENTROU'`), vendas da Rede e lançamentos bancários do extrato OFX da data.
   - Paginar/fatiar lançamentos em lotes otimizados (ex: 15-20 itens por requisiçÁo) e disparar chamadas sucessivas à LLM até que 100% das pendências de todas as lojas sejam analisadas e pareadas.
3. **Melhoria Visual do DevTools Inspector (`src/routes/agente.tsx`):**
   - Exibir no Inspector da tela `/agente` os blocos formatados de `Input JSON` (com OSs, Rede e OFX enviados) e `Output JSON` (com a lista de matches e percentual de confiança), além das etapas de raciocínio da IA.

## Contratos de Dados
- Tabela `public.ai_execution_logs`:
  - `store_id` (TEXT)
  - `provider` (TEXT)
  - `model` (TEXT)
  - `prompt_tokens` (INT)
  - `completion_tokens` (INT)
  - `total_tokens` (INT)
  - `estimated_cost` (NUMERIC)
  - `execution_time_ms` (INT)
  - `input_payload` (JSONB / TEXT)
  - `output_payload` (JSONB / TEXT)
  - `reasoning_steps` (JSONB / TEXT)
  - `matches_applied_count` (INT)

## API / Interface
- `useBackgroundAiReconciler(stores, targetDate)`: Itera por todas as lojas e processa 100% dos lançamentos pendentes.
- `generateTripleMatchSuggestions`: Mapeamento das colunas de telemetria `input_payload`, `output_payload`, `reasoning_steps`.

## Features Existentes Impactadas
- `src/lib/llm-matcher.ts`: Telemetria e envio de payload.
- `src/hooks/useBackgroundAiReconciler.ts`: Motor de conciliaçÁo silenciosa.
- `src/routes/conciliacao.index.tsx`: InvocaçÁo multi-loja.
- `src/routes/agente.tsx`: DevTools Inspector JSON.

## Risco Principal
Custo de tokens elevado se muitas chamadas forem disparadas simultaneamente sem trava de hash.
*MitigaçÁo:* Manter `processedHashRef` por `storeId_date_count` e executar requisições por loja sequencialmente para evitar estouro de rate-limit da API.
