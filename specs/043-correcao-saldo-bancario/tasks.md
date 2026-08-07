# Tasks: Correção de Saldo Bancário

## Backend (Supabase MCP)
- [ ] Editar `src/hooks/useTransactions.ts`.
- [ ] No `useExtrato`, substituir a `globalQuery` (que soma transações) por uma query na tabela `reconciliations` filtrada por `store_id`, ordenada por `date DESC` com `limit 1`. O `globalBalance` deve ser o valor de `bank_total` retornado por essa query (ou `0` se não houver registros).
- [ ] Atualizar o retorno do `useExtrato` para passar o novo `globalBalance` de forma limpa, evitando a lógica de `globalIn - globalOut - totalMachineFees`.
- [ ] Revisar `useAllStoresBalances` para também retornar a soma dos últimos `bank_total` de cada loja em vez de um somatório histórico de transações, ou manter como está se este hook for para DRE apenas (avaliar uso no dashboard central).

## Frontend (Stitch MCP)
- [ ] Editar `src/routes/loja.$lojaId.tsx`.
- [ ] Modificar o cálculo de `concBanco` dentro do `useEffect`. Atualmente ele soma todos os `ofxRes.data` (`type=in`). Em vez disso, deve ser o fluxo líquido: `Soma(Entradas OFX) - Soma(Saídas OFX)` para o período selecionado. (Para isso, precisa alterar a query Supabase `ofxRes` para pegar tanto `in` quanto `out` e reduzir o valor com base no tipo `amount * (type === 'in' ? 1 : -1)`).
- [ ] No JSX que renderiza "Saldo da Loja", atualizar o subtítulo de "Acumulado real do sistema" para "Último saldo reportado pelo banco".
- [ ] No JSX que renderiza a Conciliação ("Extrato Banco"), atualizar a label visualmente ou adicionar um tooltip `(Entradas OFX - Saídas OFX)` para esclarecer que aquele valor é a variação líquida do banco no período.

## Test / QA
- [ ] Executar build do Vite.
- [ ] Validar que nenhum componente crashea.
