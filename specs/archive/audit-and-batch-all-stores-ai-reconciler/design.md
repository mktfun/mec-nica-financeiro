# Design: ConciliaçÁo em Lote Multi-Loja Completa & Auditoria de Payloads de IA (audit-and-batch-all-stores-ai-reconciler)

## Arquitetura Técnica

```
[conciliacao.index.tsx]
       │
       ▼ (passa array completo de stores)
[useBackgroundAiReconciler(stores, targetDate)]
       │
       ├── Para CADA loja (Loop Sequencial):
       │     1. Busca patio_os (status != 'ENTROU')
       │     2. Busca transactions (Rede & OFX do dia sem match)
       │     3. Se houver lançamentos pendentes:
       │        ├── Envia para generateTripleMatchSuggestions()
       │        ├── LLM gera Matches (confiança >= 90%)
       │        ├── INSERT public.conciliation_matches
       │        └── INSERT public.ai_execution_logs (com input_payload e output_payload preenchidos)
       │
       ▼
[DevTools Inspector na tela /agente]
       └── Exibe Input JSON, Output JSON e Raciocínio formatados por loja e data
```

## Interfaces TypeScript

```typescript
export interface AiExecutionLogRecord {
  id: string;
  store_id: string | null;
  provider: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost: number;
  execution_time_ms: number;
  input_payload: any;
  output_payload: any;
  reasoning_steps: any;
  matches_applied_count: number;
  created_at: string;
}
```

## Mapeamento de Persistência em `llm-matcher.ts`

```typescript
await saveTelemetryLog({
  store_id: storeId,
  provider: settings.provider,
  model: settings.model,
  prompt_tokens: promptTokens,
  completion_tokens: completionTokens,
  total_tokens: totalTokens,
  estimated_cost: estimatedCost,
  execution_time_ms: executionTimeMs,
  input_payload: payload,
  output_payload: rawResponse,
  reasoning_steps: matchesResult.map(m => ({
    id: m.id,
    os_number: m.os_number,
    confidence: m.confidence,
    reasoning: m.reasoning,
    client_name: m.client_name,
    amount: m.amount
  })),
  matches_applied_count: matchesResult.filter(m => m.confidence >= 90).length,
});
```

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Processamento de Todas as Lojas):**
  - Estado inicial: Existem 3 lojas no sistema com lançamentos pendentes no dia.
  - AçÁo: Abrir a página `/conciliacao`.
  - Resultado esperado: O hook percorre as 3 lojas, gera chamadas à LLM para cada loja com pendências e registra os logs correspondentes em `ai_execution_logs`.

- **Cenário 2 (VisualizaçÁo de Payloads no DevTools Inspector):**
  - Estado inicial: IA concluiu o processamento silencioso.
  - AçÁo: Abrir a tela `/agente` -> Aba *DevTools Inspector*.
  - Resultado esperado: Clicar em "Inspecionar" em um log exibe os objetos `Input JSON` (com OSs, Rede e OFX enviados) e `Output JSON` (com os matches retornados) sem estar zerado ou `undefined`.
