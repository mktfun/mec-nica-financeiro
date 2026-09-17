# 📋 Plano de Implementação — Spec 417: Geração Automática de Recebíveis de OSs (Boletos & Transferências)

## Checklist de Tarefas

### [CLEANUP / WIZARD]
- [x] Task 1: Remover a inserção automática de vendas de cartão (Rede/Maquininha) na tabela `receivables` dentro de `src/components/importacoes/CentralImportWizard.tsx` (linhas 1113-1121 e 1151-1159), mantendo-as exclusivamente em `pos_transactions`.
- [x] Task 2: Executar limpeza das 31 linhas órfãs de cartão da tabela `receivables` (`WHERE os_number IS NULL AND type ILIKE 'Cartão%'`).

### [AUTO-DETECTION & ENRICHMENT]
- [x] Task 3: Atualizar `src/hooks/useOsImportProcessor.ts` para formatar a descrição do recebível com o Nome do Cliente limpo e número da OS (ex: `BOLETO MARINHO LOCADORA OS 40369 1/1`).
- [x] Task 4: Atualizar `src/hooks/useImportProcessor.ts` (`savePatioOsAndReceivables`) para checar idempotência por `store_id + os_number`: se a OS já tiver recebíveis no banco (inclusive se o usuário já desmembrou em 1/3, 2/3, 3/3), não reinsere nem sobrescreve. Se não tiver, insere automaticamente direto no banco sem requerer cliques.

### [VERIFICATION / QA]
- [x] Task 5: Executar script Node de simulação para verificar que a ingestão de OSs gera os recebíveis corretos de forma automática e não cria duplicidades.
- [x] Task 6: Executar `npm run build` para validar integridade de compilação (Exit Code 0).
