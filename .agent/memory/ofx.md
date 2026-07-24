# 🧠 Memória Modular: Importação OFX & Adquirentes

## [2026-07-24] — Feature ID: conciliacao-fk-definitive-fix

**Contexto:** Correção definitiva do erro de Foreign Key ao confirmar a importação de extratos OFX (`conciliation_matches_ofx_transaction_id_fkey`).

**Regra aprendida:**
- Ao fazer `upsert` na tabela `transactions` com conflito por `(store_id, fitid)`, o Postgres atualiza a linha existente e **mantém a chave primária antiga (`id`)** do banco de dados.
- O Javascript gera um `crypto.randomUUID()` em memória que NUNCA é salvo no banco de dados quando ocorre conflito no `upsert`.
- Para vincular transações OFX em `conciliation_matches`, você DEVE consultar a tabela `transactions` via `.in('fitid', fitids)` **após** o salvamento para remapear e resgatar o `id` primário real do Postgres.
- Sempre faça uma checagem de existência física (`.in('id', checkIds)`) antes de disparar o `insert` em `conciliation_matches`. Se o ID não existir fisicamente no banco de dados, atribua `null` no campo `ofx_transaction_id` ou `rede_transaction_id`.

**Risco identificado:** Tentar usar IDs gerados no Javascript em memória para tabelas filhas com Foreign Key antes de consultar quais IDs o Postgres manteve no `upsert`.

**Não fazer:** Nunca confiar em UUIDs gerados no frontend para tabelas com relacionamentos FK após operações de `upsert` com `onConflict`.
