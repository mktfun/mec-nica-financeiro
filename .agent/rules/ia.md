# Constituição da IA (Rules)

## 1. Tratamento de Dados e Migrations

**Regra:** Expurgo de Legado em Migrations
**Comportamento proibido:** Adicionar colunas restritivas (como `dedup_hash`) ou constraints de unicidade em tabelas críticas (ex: transações financeiras) e deixar os registros antigos preenchidos com `NULL`.
**Guardrail:** Sempre que criar ou modificar schemas de importação envolvendo chaves de des-duplicação, faça um `UPDATE` imediato para preencher retroativamente os hashes usando dados da linha, ou faça um expurgo (`DELETE`) do lixo. Nunca deixe o banco vulnerável a duplicatas em caso de reimportação histórica.
**Por quê universal:** Tabelas com `NULL` em colunas de deduplicação viram uma bomba-relógio em qualquer sistema de importação, permitindo duplicatas ilimitadas de dados antigos se o usuário tentar reprocessar.
