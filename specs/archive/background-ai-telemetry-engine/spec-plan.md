# Spec Plan: Auditor de ConciliaçÁo Silenciosa em Background & Central de Telemetria (background-ai-telemetry-engine)

## Tasks

- [ ] [BACKEND] Criar migraçÁo SQL / tabela `ai_execution_logs` no Supabase:
  - [ ] Criar a tabela `ai_execution_logs` com os campos `id`, `created_at`, `store_id`, `provider`, `model`, `prompt_tokens`, `completion_tokens`, `total_tokens`, `estimated_cost`, `execution_time_ms`, `raw_payload_json`, `raw_response_json`, `reasoning_steps_json`, `matches_applied_count`.
  - [ ] Habilitar políticas RLS para leitura e inserçÁo.
- [ ] [FRONTEND] Limpar 100% dos elementos visuais de IA na conciliaçÁo (`src/routes/conciliacao.$lojaId.tsx`):
  - [ ] Remover o botÁo "✨ Conciliar com IA" e importações associadas.
  - [ ] Remover o arquivo `src/components/conciliacao/AiConciliationAssistant.tsx`.
- [ ] [FRONTEND] Reformular `src/lib/llm-matcher.ts` para execuçÁo silenciosa em background com telemetria:
  - [ ] Aplicar automaticamente matches com confiança >= 90% na tabela `conciliation_matches`.
  - [ ] Gravar a telemetria (tokens, custo estimado, tempo de execuçÁo ms, payload JSON e resposta JSON) na tabela `ai_execution_logs`.
- [ ] [FRONTEND] Criar Dashboard de Telemetria e Inspector de Logs JSON em `src/routes/configuracoes.tsx`:
  - [ ] Adicionar estatísticas de consumo de tokens (Prompt, Completion e Total).
  - [ ] Adicionar cálculo de custo estimado acumulado em USD e BRL.
  - [ ] Adicionar o Inspector DevTools de JSON (Payload de Entrada, Resposta da LLM e Raciocínio da IA).
- [ ] [TEST] Verificar compilaçÁo limpa com `npm run build`.
