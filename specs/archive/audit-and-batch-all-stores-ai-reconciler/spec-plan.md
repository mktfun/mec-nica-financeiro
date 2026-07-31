# Spec Plan: Conciliação em Lote Multi-Loja Completa & Auditoria de Payloads de IA (audit-and-batch-all-stores-ai-reconciler)

## Tasks

- [x] [FRONTEND] Atualizar `src/lib/llm-matcher.ts`:
  - [x] Mapear corretamente as propriedades `input_payload`, `output_payload` e `reasoning_steps` na chamada a `saveTelemetryLog`
- [x] [FRONTEND] Refatorar `src/hooks/useBackgroundAiReconciler.ts`:
  - [x] Alterar assinatura do hook para aceitar a lista de lojas (`stores`) e iterar sequencialmente por cada uma
  - [x] Buscar todas as OSs pendentes (`status != 'ENTROU'`), transações Rede e OFX sem match de cada loja
  - [x] Fatiar pendências em lotes otimizados e acionar a IA para 100% dos registros
- [x] [FRONTEND] Atualizar `src/routes/conciliacao.index.tsx`:
  - [x] Invocar `useBackgroundAiReconciler(stores, selectedDate)` passando o array de todas as lojas ativas
- [x] [FRONTEND] Atualizar `src/routes/agente.tsx`:
  - [x] Garantir que a renderização dos botões "Raciocínio", "Input JSON" e "Output JSON" formate adequadamente objetos JSON e strings
- [x] [TEST] Verificar no DevTools Inspector se os logs gravam e exibem `Input JSON` e `Output JSON` completos com os dados reais
- [x] [TEST] Verificar build limpo com `npm run build`
