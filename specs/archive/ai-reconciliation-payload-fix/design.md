# Design: Correção do Payload da IA de Conciliação Silenciosa (ai-reconciliation-payload-fix)

## Arquitetura Técnica

```
[conciliacao.$lojaId.tsx / conciliacao.index.tsx]
       │
       ▼
[useBackgroundAiReconciler(storeId, targetDate, unmatchedOs, unmatchedRede, unmatchedOfx)]
       │ (se arrays vazios → busca lançamentos pendentes no Supabase)
       ▼
[generateTripleMatchSuggestions()]
       │ 
       ├── Unwraps `raw_os` / `os_data` / `amount` para construir JSON válido:
       │     os: [{ os_number, client_name, total_value (>0), pix_value, credit_value }]
       │     rede: [{ id, title, gross_value (>0), net_value, payment_date, nsu }]
       │     ofx: [{ id, description ("PIX RECEBIDO..."), amount (>0), occurred_at }]
       │
       ▼
[Fetch Gemini / OpenAI / Claude API]
       │
       ▼
[IA Retorna JSON com Matches & Reasoning]
       │
       ├── Matches >= 90% ──> INSERT public.conciliation_matches
       └── Telemetria     ──> INSERT public.ai_execution_logs (com payload completo e reasoning)
```

## Modificações em Funções e Interfaces

### 1. `src/lib/llm-matcher.ts`
Desempacotador defensivo no mapeamento de `payload`:
```typescript
const payload = {
  os: (unmatchedOs || []).map(o => {
    const raw = o.raw_os || o.os_data || o;
    const totalVal = Number(o.total_value || o.amount || raw.total_value || raw.paid_value || 0);
    const pixVal = Number(o.pix_value || o.pix_transfer_value || raw.pix_transfer_value || raw.parsed_pix_transfer || 0);
    const creditVal = Number(o.credit_value || o.credit_debit_value || raw.credit_debit_value || raw.parsed_credit || 0);
    const osNum = String(o.os_number || raw.os_number || o.id || raw.id || '');
    const clientName = o.client_name || raw.client_name || raw.customer_name || 'Cliente';

    return {
      id: osNum,
      os_number: osNum,
      client_name: clientName,
      total_value: totalVal > 0 ? totalVal : (pixVal + creditVal),
      pix_value: pixVal,
      credit_value: creditVal,
      opened_at: o.opened_at || raw.opened_at || raw.created_at || o.created_at,
      payment_method: o.payment_method || raw.payment_method || ''
    };
  }).filter(o => o.total_value > 0 || o.pix_value > 0 || o.credit_value > 0),

  rede: (unmatchedRede || []).map(r => ({
    id: r.id,
    title: r.title || r.maquininha_title || 'Rede',
    gross_value: Number(r.gross_value || r.rede_bruto || r.amount || 0),
    net_value: Number(r.net_value || r.amount || 0),
    payment_date: r.occurred_at || r.payment_date,
    nsu: r.nsu || ''
  })),

  ofx: (unmatchedOfx || []).map(t => {
    const ofxObj = t.ofxDeposit || t;
    return {
      id: ofxObj.id,
      description: ofxObj.title || ofxObj.subtitle || ofxObj.memo || ofxObj.description || '',
      amount: Number(ofxObj.amount || 0),
      occurred_at: ofxObj.occurred_at || ofxObj.date
    };
  })
};
```

### 2. `src/hooks/useBackgroundAiReconciler.ts`
Se `unmatchedOs`, `unmatchedRede` ou `unmatchedOfx` não forem passados ou estiverem vazios:
- Executa consulta ao Supabase para buscar:
  - `patio_os` da loja com `status != 'ENTROU'`
  - `transactions` com `source IN ('rede', 'maquininha')` e `target_date = date` sem match
  - `transactions` com `source = 'ofx'` e `target_date = date` sem match

### 3. `src/routes/conciliacao.index.tsx`
Remover a chamada falsa `useBackgroundAiReconciler(firstStoreId, selectedDate, detalhes, [], [])`.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Payload com valores reais):**
  - Estado inicial: Existem OSs de R$ 1.300,00 e lançamentos OFX do dia.
  - Ação: Disparar `useBackgroundAiReconciler`.
  - Resultado esperado: DevTools Inspector exibe `Input JSON` com `total_value: 1300`, `pix_value: 1300`, `ofx: [{ amount: 1300 }]`, e `Output JSON` com match e justificativa de raciocínio (`reasoning`).

- **Cenário 2 (Match automático aplicado):**
  - Estado inicial: OS e PIX com valor R$ 1.300,00 e nome do cliente idêntico.
  - Ação: Execução do reconciliador silencioso.
  - Resultado esperado: Inserção do match em `conciliation_matches` com `confidence >= 90%` e atualização visual da tabela na loja.
