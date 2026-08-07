# Design: Acionamento Automático em Background do Motor de IA & Registro de Logs (auto-background-ai-reconciler)

## Arquitetura de Acionamento em Background

```
[Importação / Carregamento de Conciliação]
                    |
                    v
   [useBackgroundAiReconciler Hook]
                    | (Verifica se há api_key e itens sem par)
                    v
  [src/lib/llm-matcher.ts -> generateTripleMatchSuggestions()]
                    |
      +-------------+-------------+
      |                           |
      v                           v
[Supabase: conciliation_matches] [Supabase: ai_execution_logs]
(Aplica matches >= 90%)         (Grava Tokens, Custo USD/BRL, ExecTimeMs,
                                 Input Payload JSON, Output Response JSON)
                                          |
                                          v
                              [Central de IA em /agente]
                              (Atualiza os cards de telemetria e o Inspector JSON)
```

## Estrutura do Hook `useBackgroundAiReconciler`

```typescript
export function useBackgroundAiReconciler(
  storeId: string,
  targetDate: string,
  unmatchedOs: any[],
  unmatchedRede: any[],
  unmatchedOfx: any[]
) {
  const { data: aiSettings } = useAiSettings();
  const queryClient = useQueryClient();
  const processedHashRef = useRef<string>('');

  useEffect(() => {
    if (!aiSettings?.api_key) return;
    if (!storeId || !targetDate) return;
    if (unmatchedOs.length === 0 && unmatchedOfx.length === 0) return;

    const currentHash = `${storeId}_${targetDate}_${unmatchedOs.length}_${unmatchedOfx.length}`;
    if (processedHashRef.current === currentHash) return;

    processedHashRef.current = currentHash;

    // Executa em background sem travar o React
    generateTripleMatchSuggestions(aiSettings, unmatchedOs, unmatchedRede, unmatchedOfx, storeId)
      .then(async (matches) => {
        const highConfidenceMatches = matches.filter(m => m.confidence >= 90);
        if (highConfidenceMatches.length > 0) {
          // Grava matches com alta confiança
          for (const m of highConfidenceMatches) {
            await supabase.from('conciliation_matches').insert({
              store_id: storeId,
              target_date: targetDate,
              match_type: m.match_type,
              system_os_number: m.os_number || null,
              confidence_score: m.confidence,
              reasoning: m.reasoning,
              created_at: new Date().toISOString()
            });
          }
          queryClient.invalidateQueries({ queryKey: ['conciliacao_detalhes'] });
        }
        queryClient.invalidateQueries({ queryKey: ['ai_execution_logs'] });
      })
      .catch(err => {
        console.warn('Execução silenciosa da IA encontrou aviso:', err);
      });
  }, [storeId, targetDate, unmatchedOs.length, unmatchedOfx.length, aiSettings]);
}
```

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Execução Automática de Background):**
  - *Ação:* Navegar na conciliação de uma loja com vendas de PIX ou cartão não pareadas e com API key configurada.
  - *Resultado Esperado:* O hook de background dispara a chamada de IA de forma invisível.
- **Cenário 2 (Gravação de Logs na Central `/agente`):**
  - *Ação:* Acessar `/agente` na aba "Telemetria & Custos" ou "Inspector JSON".
  - *Resultado Esperado:* A chamada recém-executada aparece registrada com contagem de tokens, custo em dólares, payload JSON de entrada/saída e os passos de raciocínio.
- **Cenário 3 (Prevenção de Loop de Chamadas):**
  - *Ação:* Re-renderizar a página de conciliação sem alterar os dados.
  - *Resultado Esperado:* A trava de hash impede que chamadas duplicadas sejam enviadas para a API de IA.
