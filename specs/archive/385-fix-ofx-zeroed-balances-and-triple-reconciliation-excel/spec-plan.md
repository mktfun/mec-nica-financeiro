# Spec Plan: Correção dos Saldos OFX e Sincronização Tríplice (385)

## Tasks

- [x] [BACKEND] Criar migration `20260909000042_fix_ofx_date_anchor_and_reconciliation_zeroed.sql` com backfill dos saldos reais de 09/09 e fallback na RPC `get_daily_reconciliation_summary`
- [x] [FRONTEND] Modificar `src/hooks/useTransactions.ts` para ancorar `storeBankBalances` estritamente na `targetDate` da importação
- [x] [FRONTEND] Modificar `src/components/importacoes/CentralImportWizard.tsx` preservando `bank_total` no upsert de pátio em `reconciliations`
- [x] [TEST] Verificar no banco e via build que as 10 lojas refletem exatamente os extratos OFX para 09/09
- [x] [AUDIT] Executar teste de regressão e auditoria visual dos cards do Raio-X
