# Spec Plan: Motor de Auto-Match de PIX e Rede x OS (Pátio), Isolamento Temporal Estrito e Vínculo Manual Residual (339)

## Tasks

- [x] [BACKEND] Criar migration `20260901000014_unified_auto_match_daily_transactions.sql` com a RPC `auto_match_daily_transactions(p_date DATE)` (casamento por loja de Rede x OS, PIX x OS e Saídas x Contas)
- [x] [BACKEND] Aplicar migration 14 no Supabase via script Node headless
- [x] [FRONTEND] Ajustar `CentralImportWizard.tsx` para invocar `auto_match_daily_transactions` no `handleConfirm` logo após os inputs manuais
- [x] [FRONTEND] Corrigir `fetchRealUnmatchedTransactions` no `CentralImportWizard.tsx` para filtrar estritamente por `.eq('target_date', tDate)` (zero vazamento de agosto)
- [x] [FRONTEND] Ajustar queries em `Step2NonRevenueJustifications.tsx` para isolamento temporal estrito de `targetDate`
- [x] [TEST] Executar build gate (`npm run build`) e validar 0 erros TypeScript
- [x] [TEST] Validar fluxo no browser em `http://localhost:8080/importacoes` confirmando que apenas os PIX e vendas REDE sem OS do dia 01/09 aparecem no Step 1
