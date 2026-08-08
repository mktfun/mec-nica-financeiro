# Spec Plan: Restauração de Logs de Importação e Ajuste de RPC (146)

## Tasks

- [ ] [BACKEND] Criar nova migration `20260807000018_restore_import_logs_and_rpc.sql`.
- [ ] [BACKEND] Na migration, recriar a tabela `import_logs` com todos os campos `total_os`, `total_paid_all`, `total_dinheiro`, `os_count`, `receivables_count`, constraint `import_logs_store_id_target_date_key` e RLS correspondente (para inserção/atualização por `authenticated`).
- [ ] [BACKEND] Na migration, alterar a função `get_store_financial_stats(p_store_id uuid, ...)` substituindo `uuid` por `text`.
- [ ] [BACKEND] Na migration, adicionar as colunas `target_date date` às tabelas `ofx_transactions` e `pos_transactions`.
- [ ] [BACKEND] Na migration, recriar a View `transactions` removendo a função `TO_CHAR(occurred_at, 'YYYY-MM-DD')::date` e substituindo por `target_date`.
- [ ] [FRONTEND] Atualizar hook `useBulkInsertTransactions` em `useTransactions.ts` para capturar `t.target_date` e salvar nas inserções do `ofx_transactions` e `pos_transactions`.
- [ ] [TEST] Executar migration no Supabase local (`npx supabase db push` ou `supabase db query`).
- [ ] [TEST] Verificar se a RPC de stats e logs retornam os valores corretos.
