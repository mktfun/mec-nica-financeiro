# Spec Plan: Correção Definitiva de Chave Estrangeira em Conciliação e Importação (conciliacao-fk-definitive-fix)

## Tasks

- [ ] [FRONTEND/BACKEND] Implementar Remapeador de DB IDs em `src/components/importacoes/CentralImportWizard.tsx`:
  - [ ] Ao montar `matchesToInsert`, guardar a chave de busca `_fitid_key` (`${store_id}_${tx.fitid}`).
  - [ ] Após o `saveTransactions`, consultar a tabela `transactions` no Supabase via `.in('fitid', allFitids)` para recuperar os IDs primários reais que o Postgres utilizou no `upsert`.
  - [ ] Substituir os `ofx_transaction_id` pelos IDs reais do banco de dados.
  - [ ] Fazer uma checagem física de existência no banco via `.in('id', checkIds)`. Caso algum ID não exista no DB, substituir por `null`.
  - [ ] Envolver `insertConciliationMatches` em bloco try-catch com resiliência.
- [ ] [TEST] Verificar compilação limpa com `npm run build`.
