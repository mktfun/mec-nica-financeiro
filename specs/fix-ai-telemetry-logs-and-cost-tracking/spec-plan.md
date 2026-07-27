# Spec Plan: Correção da Telemetria de Consumo, Logs & Custos de IA (fix-ai-telemetry-logs-and-cost-tracking)

## Tasks

- [ ] [BACKEND] Provisionar e confirmar tabela `public.ai_execution_logs` e `public.ai_settings` no Supabase com RLS `ALLOW ALL`
- [ ] [FRONTEND] Atualizar `src/hooks/useAiSettings.ts` para carregar/salvar configurações com fallback `GLOBAL`
- [ ] [FRONTEND] Atualizar `src/routes/agente.tsx`:
  - [ ] Adicionar botão "Executar Teste de IA & Gerar Log" na aba Telemetria / DevTools Inspector
  - [ ] Garantir formatação amigável dos cards de telemetria (Tokens, Custo USD/BRL, Chamadas, Matches)
- [ ] [TEST] Executar um teste de conciliação por IA e verificar se os logs aparecem instantaneamente na tela `/agente`
- [ ] [TEST] Verificar build limpo com `npm run build`
