# Plano de Execução: Spec 200

## Tasks

- [x] [FRONTEND/MODAL] Atualizar `src/components/conciliacao/ImportConciliacaoModal.tsx` para enviar `type: 'in' | 'out'` e `amount: Math.abs(t.amount)`.
- [x] [FRONTEND/HOOK] Atualizar `src/hooks/useTransactions.ts` com sanitização defensiva para `type: 'in' | 'out'` e `amount: Math.abs(t.amount)` no upsert de `ofx_transactions`.
- [x] [QUALITY/GATE] Executar `cmd.exe /c "npm run build"` garantindo TypeScript limpo e bundling 100% verde.
- [x] [TEST] Validar gravação no banco sem violação de `ofx_transactions_type_check`.
