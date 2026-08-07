# Tasks - UnificaçÁo do Saldo Real

## Backend Engineer
- [x] Criar um script Node em `scripts/purge-bug-17m.ts` que se conecta via client Supabase (`.env.local`) e roda um `.delete().eq('bank_total', 1751833)` na tabela `reconciliations` para remover a sujeira.
- [x] Executar o script no terminal para limpar o banco do cliente imediatamente e confirmar a remoçÁo com um `.select()`.

## Frontend Engineer
- [x] Editar `src/hooks/useTransactions.ts` e refatorar `useAllStoresBalances()`.
  - Atualmente a query soma os `amount` das `transactions`.
  - Alterar a query para buscar `store_id`, `bank_total`, `date` da tabela `reconciliations`.
  - Agrupar localmente no Typescript pelo `store_id` pegando apenas o registro mais recente (`date` mais alto) ou iterar ordenado e sobrescrever para ter a posiçÁo mais atual do extrato.
  - Retornar o `Record<string, number>` onde o key é `store_id` e value é o `bank_total` oficial.
- [x] Testar visualmente a tela Lojas da Rede (`/lojas`) para garantir que os valores refletem a nova lógica.

## QA
- [ ] Assegurar que ao entrar numa loja (ex: `st-01`), o Saldo Da Loja (card superior esquerdo) exibe exatamente o mesmo valor listado na Tela Inicial (`/lojas`).
