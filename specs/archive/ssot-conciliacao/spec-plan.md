# Spec Plan — SSOT da Conciliação Financeira

### [DATABASE]
- [x] Criar migração consolidada `20260917000001_redefine_daily_reconciliation_summary_ssot.sql` com RPC canônica e remoção definitiva de `calculate_daily_conciliation`
- [x] Criar migração `20260917000002_create_fechar_dia_and_standardize_statuses.sql` com RPC transacional `fechar_dia(p_date)` e normalização de status

### [BACKEND/TYPES]
- [x] Criar `src/types/status.ts` com vocabulário fechado de status e tipos exportados
- [x] Atualizar tipagens de conciliação para refletir o schema unificado

### [FRONTEND/HOOKS]
- [x] Criar hook canônico `src/hooks/useDailyReconciliationSummary.ts` com chave única de cache e invalidação centralizada
- [x] Refatorar `src/components/conciliacao/ResumoDiaPanel.tsx` para sincronizar com a fonte canônica sem cálculos locais de divergência
- [x] Refatorar `src/components/importacoes/CentralImportWizard.tsx` para delegar o fechamento exclusivamente à RPC `fechar_dia`
- [x] Refatorar `src/routes/loja.$lojaId.tsx` para persistir diretamente em tabelas físicas em vez da view `transactions`

### [QUALITY/BUILD GATE]
- [x] Executar `npm run build` para garantir zero erros de tipagem e integridade total
