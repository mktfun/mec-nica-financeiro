# 📝 Spec Plan: Sincronização de Pátio, Recebíveis e Parcelamento de Boletos

## Checklist de Execução

- [ ] `[FRONTEND]` Atualizar inicialização de `targetDate` em `src/routes/recebiveis.tsx` para `getDefaultDate()` (`frontend-design-pro`)
- [ ] `[FRONTEND]` Ajustar `useReceivablesByDate` em `src/hooks/useRecebiveis.ts` para garantir exibição de todos os títulos em aberto da competência (`backend-patterns`)
- [ ] `[BACKEND]` Aprimorar extração e cálculo de parcelas de boletos em `src/hooks/useOsImportProcessor.ts` com ajuste fino de centavos e segregação de sinal (`backend-patterns`)
- [ ] `[BACKEND]` Validar persistência idempotente em `src/hooks/useImportProcessor.ts` (`database`)
- [ ] `[VERIFY]` Executar compilação limpa via `npm run build` com 0 erros (`terminal-gate`)
