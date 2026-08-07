# Spec Plan: AtivaçÁo Automática do Motor de ConciliaçÁo por IA e Telemetria em Background (enable-auto-ai-reconciler-telemetry)

## Tasks

- [ ] [FRONTEND] Atualizar `src/hooks/useAiSettings.ts`:
  - [ ] Implementar fallback automático para `import.meta.env.VITE_GEMINI_API_KEY` (ou chave configurada no sistema) quando a chave da tabela `ai_settings` estiver vazia.
- [ ] [FRONTEND] Ajustar `src/hooks/useBackgroundAiReconciler.ts` e `src/lib/llm-matcher.ts`:
  - [ ] Permitir a execuçÁo quando a chave estiver disponível via fallback do sistema.
  - [ ] Garantir que o log de telemetria seja salvo em `ai_execution_logs` para alimentar a tela `/agente`.
- [ ] [FRONTEND] Conectar `useBackgroundAiReconciler` na visÁo global `/conciliacao`.
- [ ] [TEST] Verificar compilaçÁo limpa com `npm run build`.
