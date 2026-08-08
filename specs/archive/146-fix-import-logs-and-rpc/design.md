# Design: Restauração de Logs de Importação e Ajuste de RPC (146)

## Arquitetura Técnica
CentralImportWizard → `useBulkInsertTransactions` (Frontend)
Hook de upsert recebe `target_date` no payload, mapeia para `ofx_transactions` e `pos_transactions` contendo `target_date`.
Nova Migration recria `import_logs` para persistir estatísticas de gravação por loja e dia.
Nova Migration atualiza `get_store_financial_stats(text, date, date)` para a UI recuperar estatísticas parciais sem erros.
View `transactions` reconstruída aponta para o campo nativo `target_date` nas transações.

## Interfaces TypeScript
Nenhuma nova interface. `TransactionRow` em `database.types.ts` já contempla `target_date`. No `useBulkInsertTransactions`, adicionaremos a propriedade `target_date` ao mapeamento do payload para as tabelas `ofx_transactions` e `pos_transactions`.

## Componentes / Hooks / Funções
1. `src/hooks/useTransactions.ts` → Atualizar `useBulkInsertTransactions` para extrair e inserir `target_date`.
2. `supabase/migrations/<id>_restore_import_logs_and_rpc.sql` → Recriar a tabela `import_logs` com RLS, alterar `ofx_transactions` e `pos_transactions` (+ View `transactions`), e fazer REPLACE em `get_store_financial_stats`.

## Fluxo de UI
1. Usuário importa OFX de ontem.
2. A UI define `target_date` (ex: hoje).
3. Transações de ontem são salvas no banco com `occurred_at = ontem` e `target_date = hoje`.
4. Dashboard da loja para "hoje" exibirá os gastos de "ontem" corretamente sob a égide da data de conciliação.

## Infra / Deploy
- Nenhuma mudança estrutural fora da Supabase. Novas execuções no banco necessárias.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- Cenário 1: [Dashboard Loja] → [Abrir loja st-01] → [Página carrega os cards e "Ajustar Saldo" sem 400 Bad Request]
- Cenário 2: [Importação de OFX] → [Fazer upload de ofx com data passada] → [Concluir gravação] → [Tabela `import_logs` é inserida com sucesso (sem erro 404)]
- Cenário 3: [Visualização de Contas] → [Entrar na dashboard da loja na data de importação] → [Verificar se o valor extraído consta na aba Saídas/Contas e se soma corretamente].
