# Tasks - Spec 037

## Backend / Database
- [x] 1. Em `src/hooks/useTransactions.ts`, criar a funçÁo `useDailySystemBalance(targetDate: string)` usando React Query.
  - O hook deve consultar todas as `transactions` para a data especificada (`occurred_at::date = targetDate`).
  - Opcional: ignorar transações se `source = 'ofx'`, para obter o saldo real apenas das inserções nativas de OS, recebíveis, etc. (entradas subtraídas das saídas). Agrupar os resultados por `store_id`.

## Frontend
- [x] 2. Na tela de Lojas (`src/routes/loja.$lojaId.tsx`), procurar pelo botÁo de voltar (`<Link to="/conciliacao">`) e substituí-lo por `<Link to="/lojas">`.
- [x] 3. Na tela de ConciliaçÁo (`src/routes/conciliacao.tsx`):
  - Importar e consumir o novo hook `useDailySystemBalance(selectedDate)`.
  - Para cada iteraçÁo do `stores.map`, procurar o saldo dessa loja vindo do novo hook em vez de `rec?.financial_total`. Atribuir o valor à constante `sys`.
  - Transformar o card da loja (atualmente a `<Card key={store.id} ...>`) em um link ou englobá-lo em `<Link to={"/loja/" + store.id}>`. Adicionar efeito de hover suave se já nÁo tiver.
  
## QA
- [x] 4. Rodar a aplicaçÁo (`npm run dev` ou `build`) para verificar que o valor "Sistema (CartÁo+Din)" agora retrata as Entradas e Saídas diárias corretamente de cada loja.
- [ ] 5. Testar os roteamentos garantindo as idas e vindas de Lojas -> Detalhes de Loja sem cair na ConciliaçÁo indevidamente.
