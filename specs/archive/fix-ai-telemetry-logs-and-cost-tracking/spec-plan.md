# Spec Plan: CorreçÁo da Telemetria de Consumo, Logs & Custos de IA (fix-ai-telemetry-logs-and-cost-tracking)

## Tasks

- [x] [BACKEND] Provisionar e confirmar tabela `public.ai_execution_logs` e `public.ai_settings` no Supabase com RLS `ALLOW ALL`
- [x] [FRONTEND] Atualizar `src/hooks/useAiSettings.ts` para carregar/salvar configurações com fallback `GLOBAL`
- [x] [FRONTEND] Atualizar `src/routes/agente.tsx`:
  - [x] Adicionar botÁo "Executar Teste de IA & Gerar Log" na aba Telemetria / DevTools Inspector
  - [x] Garantir formataçÁo amigável dos cards de telemetria (Tokens, Custo USD/BRL, Chamadas, Matches)
- [x] [TEST] Executar um teste de conciliaçÁo por IA e verificar se os logs aparecem instantaneamente na tela `/agente`
- [x] [TEST] Verificar build limpo com `npm run build`
