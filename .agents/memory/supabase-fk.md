## [2026-08-07] — [Feature ID: 147]

**Contexto:** Ao importar o OFX, ocorria o erro `Key is not present in table "manual_transactions"` em `conciliation_matches`. Isso ocorreu porque a tabela `transactions` foi renomeada para `manual_transactions`, e a constraint apontava para ela.

**Regra aprendida:** Ao dividir uma tabela monolítica (ex: `transactions`) em várias (ex: `manual_transactions`, `ofx_transactions`, `pos_transactions`), todas as foreign keys que apontavam para a tabela antiga devem ser destruídas e recriadas para apontar para as novas tabelas específicas.

**Risco identificado:** Constraints "órfãs" que seguem o RENAME de tabelas originais, impossibilitando inserção nas novas arquiteturas (como OFX ou POS).

**Não fazer:** Nunca faça um RENAME de tabela central do sistema sem mapear e reescrever as Foreign Keys (constraints) das tabelas auxiliares (como matches, logs, etc) que dependem dela.
