# Design: Correção da Telemetria de Consumo, Logs & Custos de IA (fix-ai-telemetry-logs-and-cost-tracking)

## Arquitetura Técnica

```
[UI: /agente] ──> [useAiSettings] ──> [ai_settings (DB/GLOBAL)]
      │
      ├──> [Botão: Testar Conciliação & Gerar Telemetria]
      │           │
      │           ▼
      └──> [generateTripleMatchSuggestions()] ──> Fetch Gemini/OpenAI API
                  │
                  ▼
         [saveTelemetryLog()] ──> INSERT into public.ai_execution_logs
                  │
                  ▼
         [queryClient.invalidateQueries(['ai_execution_logs'])]
                  │
                  ▼
         [UI: Telemetria & DevTools Inspector Atualizados Instantaneamente]
```

## Componentes / Hooks / Modificações

1. **`src/hooks/useAiSettings.ts`**:
   - `useAiSettings`: Busca `ai_settings` por `user.id` ou `'GLOBAL'`, com fallback para `VITE_GEMINI_API_KEY`.
   - `useSaveAiSettings`: Salva `ai_settings` por `user.id` ou `'GLOBAL'`.

2. **`src/lib/llm-matcher.ts`**:
   - `saveTelemetryLog`: Insere em `ai_execution_logs` garantindo que erros de inserção não travem o retorno dos matches.
   - Cálculo de custo em USD via tabela de precificação `TOKEN_PRICING` + conversão BRL (~5.60 BRL).

3. **`src/routes/agente.tsx`**:
   - Adicionar botão de teste manual "Executar Teste de IA" na aba Telemetria / Inspector.
   - Garantir que a query `['ai_execution_logs']` atualize corretamente os 4 cards de topo e o Inspector.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Tabela `ai_execution_logs` acessível):**
  - Estado inicial: Tabela criada com RLS ativado.
  - Ação: Disparar inserção de log via `saveTelemetryLog`.
  - Resultado esperado: Inserção com sucesso (status 201).

- **Cenário 2 (Visualização em `/agente`):**
  - Estado inicial: Existem registros em `ai_execution_logs`.
  - Ação: Abrir a aba "Telemetria & Custos" ou "DevTools Inspector".
  - Resultado esperado: Exibe total de tokens, custo em USD/BRL, total de chamadas e a tabela detalhada de logs com payload/response JSON.
