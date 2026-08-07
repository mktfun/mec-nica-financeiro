# Proposal - RestauraçÁo do Histórico de Lançamentos da Loja

## 1. O Problema
Durante a limpeza da interface da Loja (`loja.$lojaId.tsx`) na Spec 049, as abas que exibiam o histórico em lista de "Entradas" e "Saídas" foram removidas, restando apenas a aba "Caixa Físico". Como resultado, o usuário consegue ver o totalizador "Saídas: R$ 2.206,37", mas nÁo consegue enxergar as transações individuais que compõem esse valor no período selecionado.

## 2. A SoluçÁo
Restaurar as abas de "Entradas" e "Saídas" ao lado de "Caixa Físico" no painel inferior do Dashboard da Loja.
Essas abas exibirÁo o array de transações retornado pelo hook `useExtrato` filtrado pelo tipo da transaçÁo (`type === 'in'` ou `type === 'out'`).

## 3. BDD Scenarios

### Cenário: VisualizaçÁo de Entradas Mensais
- **Given (Dado):** O usuário está no Dashboard de uma Loja (`/loja/st-01`) e o filtro de datas abrange o mês corrente.
- **When (Quando):** O usuário clica na aba "Entradas" no painel de Extrato Bancário.
- **Then (EntÁo):** O sistema exibe uma lista de todas as transações de entrada (receitas) daquele período, permitindo que o usuário identifique os lançamentos individuais que somam o totalizador de Entradas exibido acima.

### Cenário: VisualizaçÁo de Saídas Mensais
- **Given (Dado):** O usuário está no Dashboard de uma Loja (`/loja/st-01`) e o filtro de datas abrange o mês corrente.
- **When (Quando):** O usuário clica na aba "Saídas" no painel de Extrato Bancário.
- **Then (EntÁo):** O sistema exibe a lista de despesas (contas a pagar) filtradas no período, com a cor vermelha e formato claro, validando os "R$ 2.206,37" informados no Card.
