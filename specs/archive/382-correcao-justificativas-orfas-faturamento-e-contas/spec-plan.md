# Spec 382 — Plano de Implementação: Correção das Justificativas de Transações Órfãs (Faturamento e Contas a Pagar)

## Tarefas de Implementação

### Fase 1: Correção do Schema e Queries do React Query
- [x] 1.1 Em `src/components/importacoes/wizard/Step2NonRevenueJustifications.tsx`, remover as colunas inexistentes `title` e `subtitle` das queries `pending-ofx-outflows` e `pending-ofx-inflows`.
- [x] 1.2 Atualizar o mapeamento de `nonRevenueInflowEntries` e `nonRevenueOutflowEntries` para usar exclusivamente `counterpart_name` e `bank_name` como descritores.
- [x] 1.3 Em `src/hooks/useTransactions.ts`, remover a coluna `title` da query `useHistoricalReconciledTransactions`.

### Fase 2: Blindagem do Salvamento de Justificativas e Tratamento Fail-Fast
- [x] 2.1 Em `Step2NonRevenueJustifications.tsx` (`handleSaveInflow`), garantir que `daily_revenue_adjustments` receba `date: targetDate` e `store_id: entry.storeId || null`.
- [x] 2.2 Substituir `console.warn` por `throw adjErr` ao persistir em `daily_revenue_adjustments`, impedindo toasts de sucesso falsos em caso de erro.
- [x] 2.3 Atualizar `ofx_transactions.contabilizar_no_subtotal = true` quando `impactsRevenue = true`, e `false` quando não.
- [x] 2.4 Em `handleSaveOutflow`, verificar o retorno da RPC `resolve_orphan_saida_ofx` (`rpcRes?.success === false`) e disparar exceção explicativa se a transação não puder ser resolvida.

### Fase 3: Migration Backend & Blindagem de Fechamento Contábil
- [x] 3.1 Criar migration SQL `20260911000041_fix_contas_extras_and_revenue_adjustments.sql`.
- [x] 3.2 Blindar `Step4FinalAuditAndClose.tsx` para somar dinamicamente `summary.contas_itens` + `juros_rede` e neutralizar duplo cômputo de juros.
- [x] 3.3 Blindar `CentralImportWizard.tsx` (`handleFinalizeClosing`) para consultar ativamente `daily_revenue_adjustments` e `daily_manual_bills`, persistindo `faturamento_outros_valor` e `contas_a_pagar`.
- [x] 3.4 Corrigir `CentralImportWizard.tsx` para respeitar `advanceToWizard` na flag `is_closed` prevenindo congelamento prematuro do snapshot.

### Fase 4: Verificação, Teste de Carga e Auditoria Visual
- [x] 4.1 Executar script forense de validação simulando a classificação de uma transação de entrada órfã e comprovando incremento em `daily_revenue_adjustments` e no Faturamento via `get_daily_reconciliation_summary`.
- [x] 4.2 Executar script de validação comprovando que uma saída justificada como Despesa Extra reflete imediatamente em `daily_manual_bills` e em `subtotal_contas`.
- [x] 4.3 Testar build local da aplicação (`npm run build`).
- [x] 4.4 Capturar screenshot comprovando funcionamento no frontend.
