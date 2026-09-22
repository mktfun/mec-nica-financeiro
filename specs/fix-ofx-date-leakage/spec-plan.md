# 📝 Spec Plan: Blindagem de Escopo de Data e Eliminação de Vazamento do OFX

## Checklist de Execução

- [x] `[DB]` Executar correção SQL em `ofx_transactions` e `transactions` alinhando `target_date = occurred_at::date` (`database`)
- [x] `[BACKEND]` Corrigir atribuição de `target_date` em `src/components/importacoes/CentralImportWizard.tsx` para usar `effectiveOfxDate` (`backend-patterns`)
- [x] `[BACKEND]` Ajustar `useBulkInsertTransactions` em `src/hooks/useTransactions.ts` para garantir integridade da data do OFX (`backend-patterns`)
- [x] `[FRONTEND]` Alterar `viewScope` padrão para `'dia_alvo'` em `src/components/conciliacao/StoreExtratoBancarioView.tsx` (`frontend-design-pro`)
- [x] `[VERIFY]` Executar compilação limpa via `npm run build` com 0 erros (`terminal-gate`)
