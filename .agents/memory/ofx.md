## [2026-08-10] — [Feature ID: ofx-expenses]

**Contexto:** Despesas (out) do arquivo OFX estavam sumindo no momento do upload. A trava de segurança de `useBulkInsertTransactions` barrava transações com `fitid` vazio, e o Supabase limitava transações com `<FITID>` duplicados enviados de forma incorreta pelos bancos.

**Regra aprendida:** O parser de OFX e o injetor do frontend devem sempre garantir um ID (FITID) determinístico (hash de data + valor + título) se o banco enviar um extrato sem o campo ou se detectarmos ausência. Isso previne o drop silencioso de despesas legítimas e garante que a inserção resista a re-importações idênticas via instrução idempotente `ON CONFLICT (store_id, fitid) DO NOTHING`. Além disso, despesas não possuem Ordem de Serviço, então devem herdar diretamente a loja (store_id) do alias (mapping) da conta no wizard para comporem o saldo por loja corretamente.

**Risco identificado:** A deduplicação por hash pode causar falso-positivo caso ocorram duas taxas literalmente idênticas no mesmo milissegundo, mas em sistemas financeiros o agrupamento bancário padrão mitiga isso.

**Não fazer:** Nunca depender do `<FITID>` como garantia absoluta de existência de despesas. E nunca filtrar `t.fitid` num pipeline central sem assegurar um fallback hash, sob risco de perder o histórico financeiro passivo.
