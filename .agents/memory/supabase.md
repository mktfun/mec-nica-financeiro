## [2026-08-07] — [Feature ID: 146]

**Contexto:** Ocorriam erros de 404 e 400 no dashboard de loja porque a tabela `import_logs` havia sido removida em uma limpeza e a função `get_store_financial_stats` exigia um tipo `uuid` mas o sistema enviava `text` (ex: `st-01`).

**Regra aprendida:** As lojas deste sistema utilizam IDs descritivos em texto longo (`text`), como `st-01`, `st-02`. RPCs que lidam com estatísticas financeiras de lojas devem SEMPRE tipar a variável `store_id` como `text`.

**Risco identificado:** Alterações de schema no Supabase que apaguem a view `transactions` (ex: drop para alterar colunas bases) causam quebra generalizada se a View não for recriada na mesma migração. 

**Não fazer:** Nunca use `uuid` para representar o campo de ID das lojas nas RPCs ou em novas tabelas. Sempre use `text`.

## [2026-08-10] — [Feature ID: 155]

**Contexto:** Pátio OS Cumulativo. A RPC `get_conciliation_breakdown` não contabilizava o saldo histórico devedor das OS. A migration introduziu comparações do tipo `date` = `text` que quebraram a query principal em cloud.

**Regra aprendida:** As colunas temporais nas tabelas como `reconciliations` (`date`) e `ofx_transactions` (`target_date`) e `patio_os` (`opened_at`) no banco real estão nativamente tipadas para formatos Data (ex: `date`, `timestamp`). Nas migrações e RPCs do Supabase, NÃO use `p_date::text` e NÃO compare `TO_CHAR(...)` = `p_date` (se `p_date` for declarada como tipo `date`), caso contrário o PostgreSQL abortará com erro fatal `42883 (operator does not exist: date = text)`. Compare Date com Date.

**Risco identificado:** A CLI legada do Supabase no ambiente (v1.x) apresenta `unknown flag: --project-ref` no comando `db execute`, e `db push` gera conflitos (`already exists`) pela falta de sync local. Se a CLI falhar, valide via E2E usando o pacote `ssh2` no Node ou a API nativa do `supabase-js`, e oriente o usuário a rodar no Editor Web.

**Não fazer:** Nunca force casting em parâmetros temporais do PostgreSQL para texto (`::text`) com o objetivo de igualdade contra colunas físicas tipadas. Use `occurred_at::date = p_date` e não `TO_CHAR(occurred_at) = p_date::text`.
