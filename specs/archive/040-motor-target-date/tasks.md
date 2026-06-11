# Tasks - Spec 040 (Motor Target Date Universal)

## Backend Engineer
- [x] 1. Criar migration SQL `add_target_date_to_transactions.sql` na pasta `supabase/migrations/`:
```sql
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS target_date DATE DEFAULT CURRENT_DATE;
UPDATE transactions SET target_date = DATE(occurred_at) WHERE target_date IS NULL;
```
- [x] 2. Modificar o arquivo da migration SQL para alterar a trigger `update_reconciliation_bank_total` mudando `v_date := DATE(NEW.occurred_at)` para `v_date := NEW.target_date`. Executar a migration usando o backend/Supabase localmente ou em produção.
- [x] 3. Em `src/lib/supabase.ts`, adicionar `target_date?: string` à interface `TransactionRow`.
- [x] 4. Em `src/hooks/useImportProcessor.ts` (na hora de inserir transações de OS), adicionar `target_date: date` ao objeto inserido.
- [x] 5. Em `src/hooks/useTransactions.ts`, alterar a lógica do `useDailySystemBalance` de `.gte('occurred_at', start)` e `.lte('occurred_at', end)` para um simples `.eq('target_date', targetDate)`.

## Frontend Engineer
- [x] 1. Em `src/components/importacoes/WizardImportacao.tsx`, ao montar o `txsToInsert` no array, incluir o campo `target_date: targetDate`.
- [x] 2. Em `src/routes/conciliacao.tsx`, alterar o cálculo global `const totalSistema = detalhes.reduce(...)` para usar as balanças reais via `dailyBalances` (Ex: `const totalSistema = Object.values(dailyBalances || {}).reduce((acc, val) => acc + Number(val), 0);`).
