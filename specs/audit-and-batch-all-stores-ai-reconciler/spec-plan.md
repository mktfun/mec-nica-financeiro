# Spec Plan: Conciliação em Lote Multi-Loja Completa & Auditoria de Payloads de IA (audit-and-batch-all-stores-ai-reconciler)

## Tasks

- [ ] [FRONTEND] Atualizar `src/lib/llm-matcher.ts`:
  - [ ] Mapear corretamente as propriedades `input_payload`, `output_payload` e `reasoning_steps` na chamada a `saveTelemetryLog`
- [ ] [FRONTEND] Refatorar `src/hooks/useBackgroundAiReconciler.ts`:
  - [ ] Alterar assinatura do hook para aceitar a lista de lojas (`stores`) e iterar sequencialmente por cada uma
  - [ ] Buscar todas as OSs pendentes (`status != 'ENTROU'`), transações Rede e OFX sem match de cada loja
  - [ ] Fatiar pendências em lotes otimizados e acionar a IA para 100% dos registros
- [ ] [FRONTEND] Atualizar `src/routes/conciliacao.index.tsx`:
  - [ ] Invocar `useBackgroundAiReconciler(stores, selectedDate)` passando o array de todas as lojas ativas
- [ ] [FRONTEND] Atualizar `src/routes/agente.tsx`:
  - [ ] Garantir que a renderização dos botões "Raciocínio", "Input JSON" e "Output JSON" formate adequadamente objetos JSON e strings
- [ ] [TEST] Verificar no DevTools Inspector se os logs gravam e exibem `Input JSON` e `Output JSON` completos com os dados reais
- [ ] [TEST] Verificar build limpo com `npm run build`
