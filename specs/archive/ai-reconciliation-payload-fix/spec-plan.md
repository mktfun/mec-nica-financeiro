# Spec Plan: CorreçÁo do Payload da IA de ConciliaçÁo Silenciosa (ai-reconciliation-payload-fix)

## Tasks

- [x] [FRONTEND] Atualizar `src/lib/llm-matcher.ts`:
  - [x] Implementar desempacotador defensivo (`raw_os`, `os_data`, `ofxDeposit`, etc.) para `total_value`, `pix_value`, `credit_value`, `gross_value` e `description`
  - [x] Filtrar itens com valores zerados antes de enviar o JSON para a LLM
  - [x] Aprimorar o System Prompt com regras claras de associaçÁo por PIX e por tolerância de taxas de cartÁo
- [x] [FRONTEND] Atualizar `src/hooks/useBackgroundAiReconciler.ts`:
  - [x] Adicionar suporte a busca direta de pendências no Supabase caso os arrays pasados sejam vazios ou parciais
  - [x] Garantir trava de hash `processedHashRef`
- [x] [FRONTEND] Atualizar `src/routes/conciliacao.index.tsx`:
  - [x] Ajustar invocaçÁo do reconciliador em background para passar pendências reais ou delegar para a busca automática
- [x] [TEST] Executar um teste no Inspector e verificar se o `Input JSON` envia valores reais (> R$ 0,00) e se a LLM retorna matches válidos
- [x] [TEST] Verificar build limpo com `npm run build`
