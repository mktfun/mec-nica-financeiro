# Spec Plan: Correção do Payload da IA de Conciliação Silenciosa (ai-reconciliation-payload-fix)

## Tasks

- [ ] [FRONTEND] Atualizar `src/lib/llm-matcher.ts`:
  - [ ] Implementar desempacotador defensivo (`raw_os`, `os_data`, `ofxDeposit`, etc.) para `total_value`, `pix_value`, `credit_value`, `gross_value` e `description`
  - [ ] Filtrar itens com valores zerados antes de enviar o JSON para a LLM
  - [ ] Aprimorar o System Prompt com regras claras de associação por PIX e por tolerância de taxas de cartão
- [ ] [FRONTEND] Atualizar `src/hooks/useBackgroundAiReconciler.ts`:
  - [ ] Adicionar suporte a busca direta de pendências no Supabase caso os arrays pasados sejam vazios ou parciais
  - [ ] Garantir trava de hash `processedHashRef`
- [ ] [FRONTEND] Atualizar `src/routes/conciliacao.index.tsx`:
  - [ ] Ajustar invocação do reconciliador em background para passar pendências reais ou delegar para a busca automática
- [ ] [TEST] Executar um teste no Inspector e verificar se o `Input JSON` envia valores reais (> R$ 0,00) e se a LLM retorna matches válidos
- [ ] [TEST] Verificar build limpo com `npm run build`
