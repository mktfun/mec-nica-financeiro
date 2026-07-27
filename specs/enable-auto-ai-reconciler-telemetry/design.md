# Design: Ativação Automática do Motor de Conciliação por IA e Telemetria em Background (enable-auto-ai-reconciler-telemetry)

## Fluxo Técnico de Resolução da IA & Telemetria

```
[Conciliação / Importação Executada]
                  |
                  v
[useBackgroundAiReconciler (Hash Lock)]
                  |
                  v
    Obtém AiSettings (com fallback para VITE_GEMINI_API_KEY se vazio)
                  |
                  v
 [generateTripleMatchSuggestions()]
                  |
                  +---> Executa chamada HTTP à LLM (Gemini / OpenAI / Anthropic)
                  |
                  +---> Grava Log em Supabase `ai_execution_logs` (Tokens + Cost + Payloads)
                  |
                  v
[Aplica Matches Alta Confiança (>= 90%) em `conciliation_matches`]
                  |
                  v
[Atualização em Tempo Real da Tela /agente (DevTools & Telemetria)]
```

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Disparo Automático e Registro de Logs):**
  - *Ação:* Entrar em uma loja na conciliação que contenha itens não pareados.
  - *Resultado Esperado:* A IA dispara silenciosamente em background, registra a chamada na tabela `ai_execution_logs` e atualiza a aba Telemetria em `/agente` exibindo a contagem de tokens, chamadas e custo em USD/BRL.
- **Cenário 2 (DevTools Inspector de Payloads):**
  - *Ação:* Clicar em uma linha de log na aba Inspector em `/agente`.
  - *Resultado Esperado:* Exibe o JSON de Entrada (Prompt), o JSON de Resposta (Output) e o Raciocínio (Chain of Thought) gerado pela IA.
