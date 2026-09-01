# Spec Plan: Motor de Auto-Match com OSs Finalizadas, Direcionamento de Transações Corporativas e Orquestração Linear Determinística de Steps (340)

## Tasks

- [x] [BACKEND] Criar migration `20260901000015_auto_match_finalized_os_and_corporate_routing.sql` expandindo a RPC `auto_match_daily_transactions(p_date text)` com casamento de OSs finalizadas por `pix_transfer_value` e `credit_value`/`debit_value`, e auto-tagging de transações corporativas (Empréstimos, Seguros, Transferências)
- [x] [BACKEND] Aplicar migration 15 no Supabase via script Node headless e testar casamento com as 24 transações do dia 01/09/2026
- [x] [FRONTEND] Ajustar `CentralImportWizard.tsx` no `handleConfirm`: remover chamada a `setStep(8)` para eliminar o flash visual da tela de sucesso e garantir transição direta e suave para o Step 1 (`setStep(4)`)
- [x] [FRONTEND] Ajustar `fetchRealUnmatchedTransactions` em `CentralImportWizard.tsx` para não trazer transações que já foram auto-categorizadas como corporativas (direcionadas para o Step 2)
- [x] [TEST] Executar build gate (`npm run build`) e validar 0 erros TypeScript
- [x] [TEST] Testar o fluxo completo em `http://localhost:8080/importacoes` confirmando que os PIX e Cartões de OSs finalizadas somem do Step 1, que Empréstimos e Seguros vão para o Step 2, e que não há pulos automáticos de tela
