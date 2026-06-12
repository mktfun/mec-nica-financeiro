# Design - Apurado Sistema

Esta Spec exigirá modificações primariamente na camada de Data Fetching do Frontend (React Query via Supabase Client). Nenhuma migração ou edição no banco será necessária.

## Frontend
Em `src/hooks/useTransactions.ts`, a query atual faz `eq('target_date', targetDate)`.
Iremos alterá-la para utilizar `.gte('occurred_at', startOfDay)` e `.lte('occurred_at', endOfDay)`.

O `targetDate` vindo da interface é formato string (`YYYY-MM-DD`). 
Devemos tratá-lo para montar:
`const startOfDay = targetDate + 'T00:00:00.000Z';`
`const endOfDay = targetDate + 'T23:59:59.999Z';`

Esta solução isola a exibição contábil de um dia perfeitamente à realidade dos fatos que **aconteceram** no dia, em vez de atrelar a cálculos baseados puramente no dia da "operação de importação do usuário".
