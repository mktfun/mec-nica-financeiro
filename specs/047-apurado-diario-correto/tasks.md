# Tasks - Fechamento Diario

## Frontend Engineer
- [x] Editar `src/hooks/useTransactions.ts`.
- [x] Na função `useDailySystemBalance`, alterar a variável extraída do React Query (a query principal).
- [x] Trocar `.eq('target_date', targetDate)` para as condições `.gte` e `.lte` de `occurred_at`.
- [x] Construir as variáveis delimitadoras `startOfDay` e `endOfDay` com base na string do `targetDate`.
- [x] Validar que as transações ignoradas com `source === 'ofx'` ou título `Extrato Bancário` continuam ativas para garantir integridade.
