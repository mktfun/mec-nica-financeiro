# Spec Plan: Central Dedicada de Inteligência, Telemetria & GestÁo da IA (`/agente`) (dedicated-ai-telemetry-hub)

## Tasks

- [ ] [FRONTEND] Corrigir hook `src/hooks/useBotLogs.ts`:
  - [ ] Alterar consulta para buscar da tabela `ai_execution_logs` ou tratar erro silenciosamente sem emitir `console.warn` agressivo.
- [ ] [FRONTEND] Reformular a página `/agente` em um Centro de Comando de IA com 4 Abas:
  - [ ] Aba 1: Chat do Agente (Manter assistente e histórico de conversas).
  - [ ] Aba 2: ConfiguraçÁo de Provedores & API Keys (Google Gemini, OpenAI GPT, Anthropic Claude).
  - [ ] Aba 3: Dashboard de Telemetria, Consumo de Tokens e Custos Acumulados ($ USD / R$ BRL).
  - [ ] Aba 4: Inspector de JSON (Payload Input, Response Output, Chain of Thought).
- [ ] [FRONTEND] Limpar `/configuracoes` e adicionar redirecionamento/card para `/agente`.
- [ ] [TEST] Verificar compilaçÁo limpa com `npm run build`.
