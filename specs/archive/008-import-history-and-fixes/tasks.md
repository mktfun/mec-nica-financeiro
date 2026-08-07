# Tasks: Rastreamento de Importações e Correções (008)

## Fase 0 — Banco de Dados
- [ ] **0.1** Criar tabela `import_logs` via migration no Supabase com campos e índice único `(store_id, target_date)`.
- [ ] **0.2** Criar índice único em `receivables` para evitar duplicatas `(store_id, type, date, ROUND(value, 2))`.
- [ ] **0.3** Limpar a tabela `receivables` de duplicatas existentes (DELETE e reimportar).

## Fase 1 — Hooks e Lógica
- [ ] **1.1** Atualizar `useImportProcessor.ts`: receber `totalPaidAll` e `totalDinheiro` separados e gravar ambos em `import_logs` após o processamento.
- [ ] **1.2** Atualizar `useImportProcessor.ts`: usar UPSERT (ON CONFLICT) para `reconciliations` em vez de INSERT — evita duplicar conciliações.
- [ ] **1.3** Criar `src/hooks/useImportLogs.ts` com `useImportLogs(filters?)` e `useImportLogDetail(storeId, date)`.
- [ ] **1.4** Atualizar `useDashboardSummary` em `useTransactions.ts`: trocar `financial_total` por `os_total` para o `totalIn`.
- [ ] **1.5** Atualizar `ImportReportDialog.tsx`: calcular e passar `totalPaidAll` (soma de todos os pagamentos) para o processador.

## Fase 2 — UI
- [ ] **2.1** Substituir a rota `/historico` (`historico.tsx`) por um Histórico de Importações que consome `useImportLogs`.
- [ ] **2.2** Adicionar filtros de período (data início/fim) e loja na nova tela de histórico.
- [ ] **2.3** Implementar expansÁo inline (accordion) para mostrar as OSs do dia ao clicar em uma importaçÁo.
- [ ] **2.4** Atualizar o link "Histórico" no Sidebar para apontar para a nova tela.

## Fase 3 — VerificaçÁo
- [ ] **3.1** `npm run build` — confirmar sem erros de TypeScript.
- [ ] **3.2** Testar importaçÁo de planilha e verificar novo registro em `import_logs`.
- [ ] **3.3** Verificar que o Dashboard mostra o faturamento bruto após importaçÁo.
- [ ] **3.4** Verificar que Recebíveis nÁo duplicam ao reimportar a mesma planilha.
