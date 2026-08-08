## [2026-08-07] — [Feature ID: 146]

**Contexto:** Ocorriam erros de 404 e 400 no dashboard de loja porque a tabela `import_logs` havia sido removida em uma limpeza e a função `get_store_financial_stats` exigia um tipo `uuid` mas o sistema enviava `text` (ex: `st-01`).

**Regra aprendida:** As lojas deste sistema utilizam IDs descritivos em texto longo (`text`), como `st-01`, `st-02`. RPCs que lidam com estatísticas financeiras de lojas devem SEMPRE tipar a variável `store_id` como `text`.

**Risco identificado:** Alterações de schema no Supabase que apaguem a view `transactions` (ex: drop para alterar colunas bases) causam quebra generalizada se a View não for recriada na mesma migração. 

**Não fazer:** Nunca use `uuid` para representar o campo de ID das lojas nas RPCs ou em novas tabelas. Sempre use `text`.
