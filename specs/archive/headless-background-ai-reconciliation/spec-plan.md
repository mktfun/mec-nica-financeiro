# Spec Plan: ConciliaçÁo Headless em Background & Central de Telemetria/Logs da IA (headless-background-ai-reconciliation)

## Tasks

- [ ] [BACKEND] Criar migraçÁo SQL / tabela `ai_execution_logs` no Supabase:
  - [ ] Tabela `ai_execution_logs` com campos `id`, `created_at`, `store_id`, `provider`, `model`, `prompt_tokens`, `completion_tokens`, `total_tokens`, `estimated_cost`, `raw_payload_json`, `raw_response_json`, `matches_count`, `execution_time_ms`.
  - [ ] Políticas de RLS habilitadas.
- [ ] [FRONTEND] Remover UI visível de IA em `src/routes/conciliacao.$lojaId.tsx`:
  - [ ] Remover botÁo "✨ Conciliar com IA" e importações do componente modal.
  - [ ] Excluir o arquivo `src/components/conciliacao/AiConciliationAssistant.tsx`.
- [ ] [FRONTEND] Ajustar `src/lib/llm-matcher.ts` para execuçÁo de background silenciosa:
  - [ ] Gravar matches com confiança >= 90% automaticamente na tabela `conciliation_matches`.
  - [ ] Gravar a telemetria e o histórico JSON completo na tabela `ai_execution_logs`.
- [ ] [FRONTEND] Criar Dashboard de Telemetria e Logs JSON em `src/routes/configuracoes.tsx`:
  - [ ] Adicionar visualizador de consumo de tokens (prompt, completion, total).
  - [ ] Adicionar cálculo de custo acumulado no período selecionado.
  - [ ] Adicionar Inspector de JSON (Payload de Envio, Resposta da LLM, Raciocínio Passo-a-Passo).
- [ ] [TEST] Verificar compilaçÁo limpa com `npm run build`.
