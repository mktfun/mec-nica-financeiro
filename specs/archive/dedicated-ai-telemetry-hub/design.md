# Design: Central Dedicada de Inteligência, Telemetria & GestÁo da IA (`/agente`) (dedicated-ai-telemetry-hub)

## Arquitetura de Interface em `/agente`

```
                                  [/agente - Centro de Comando de IA]
                                                  |
       +--------------------------+---------------+--------------------------+
       |                          |                                          |
       v                          v                                          v
[Aba 1: 💬 Chat]          [Aba 2: ⚙️ Provedores]                     [Aba 3: 📊 Telemetria & Custos]  + [Aba 4: 🔍 Inspector JSON]
(Chat conversacional,      (Gemini, OpenAI, Claude,                    (Cards de Tokens, Custo USD/BRL,  (Payload Input JSON, Response
 conversas, mensagens)      API Key, seleçÁo de modelo)                 Tempo de ExecuçÁo ms)             Output JSON, Chain of Thought)
```

## Estrutura da Rota `/agente`

- **NavegaçÁo Superior de Abas (Sub-Header):**
  - `[💬 Chat do Agente]`
  - `[⚙️ Provedores & Modelos]`
  - `[📊 Telemetria & Custos]`
  - `[🔍 Inspector de JSON & Raciocínio]`

- **Aba 1: Chat do Agente**
  - Mantém o chat com a IA e histórico de conversas do Supabase (`conversations` / `messages`).

- **Aba 2: Provedores & Modelos**
  - Mantém a gestÁo de API Keys (Google Gemini, OpenAI GPT-4o, Anthropic Claude 3.5).

- **Aba 3: Telemetria & Custos**
  - KPI Cards: Total Tokens, Custo Acumulado ($ USD e ~R$ BRL), Tempo Médio de Resposta (ms), Total de Matches Aplicados em Background.

- **Aba 4: Inspector de JSON & Raciocínio**
  - DevTools Inspector: Visualizador de Payload JSON enviado, Resposta JSON recebida e Passos de Raciocínio (Chain of Thought).

## CorreçÁo do Hook `useBotLogs.ts`

```typescript
export function useBotLogs(limit = 50) {
  return useQuery({
    queryKey: ['bot_logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_execution_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return [] as BotAuditLog[];
      }
      return data as any[];
    },
  });
}
```

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (EliminaçÁo de Erros de Console):**
  - *AçÁo:* Navegar em `/configuracoes` ou `/agente`.
  - *Resultado Esperado:* Nenhum aviso de `Could not find table public.bot_audit_logs` é disparado.
- **Cenário 2 (NavegaçÁo por Abas em `/agente`):**
  - *AçÁo:* Acessar `/agente` e alternar entre `💬 Chat`, `⚙️ Provedores`, `📊 Telemetria` e `🔍 Inspector`.
  - *Resultado Esperado:* Cada aba carrega suas métricas dedicadas de forma fluida e organizada.
- **Cenário 3 (Limpeza de `/configuracoes`):**
  - *AçÁo:* Acessar `/configuracoes`.
  - *Resultado Esperado:* A página exibe apenas gerenciamento de lojas e credenciais, com um card indicativo para a Central `/agente`.
