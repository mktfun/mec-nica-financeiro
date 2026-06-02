# Contexto e Escopo
A tela atual de Conciliação exibe 10 blocos de lojas (e um input global de caixa para todas elas) filtrados mensalmente.
A navegação para os detalhes da conciliação requer cliques adicionais (`/conciliacao-detalhes`).

O feedback do usuário aponta que:
1. O filtro por mês é insuficiente; precisa ser **por dia exato**.
2. O input de "Dinheiro em Caixa" não pode ser global e aleatório. Deve aparecer **apenas para lojas que possuem valores em "espécie" (dinheiro)** atrelados a alguma OS naquele dia/período.
3. A tela atual é feia e disfuncional. Os detalhes deveriam estar mais acessíveis.

## Achados Técnicos
1. `src/routes/conciliacao.tsx`: Usa `<input type="month" />`. Trocá-lo para `<input type="date" />` exigirá atualizar os hooks `useConciliacaoResumo` e `useConciliacaoDetalhes` para aceitarem o formato `YYYY-MM-DD` ou criar novos hooks diários.
2. `Dinheiro em Caixa`: Atualmentemente varre as lojas (`stores.map`). A regra de negócio exige que filtremos as lojas que possuem entradas do tipo `dinheiro` nas `transactions` do dia.
3. **UI/UX 2026**: Precisamos usar o layout de Master-Detail ou Split Pane para visualizar os detalhes de cada loja de forma imediata (evitando o pulo para `/conciliacao-detalhes`).
