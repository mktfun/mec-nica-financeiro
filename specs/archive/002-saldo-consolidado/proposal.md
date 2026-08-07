# Proposal: Saldo Líquido Consolidado Independente de Período (002-saldo-consolidado)

## Requisitos
- **Saldo Global All-Time:** O "Saldo Líquido Consolidado" exibido como Hero Balance no Dashboard deve refletir o saldo real (histórico de entradas e saídas de todas as lojas, desde o início dos tempos), e não ser filtrado pelo Mês selecionado.
- **Métricas do Mês:** As outras métricas (Total de Entradas, Total de Saídas e Divergências) continuam sendo relativas ao Mês selecionado no filtro. Isso permite ao usuário ver a performance isolada do mês, mas saber exatamente o dinheiro em caixa final.

## User Stories
- Como gestor, eu quero ver o meu saldo líquido total de todas as lojas a qualquer momento no topo do painel, independentemente de estar analisando o fluxo de caixa do mês atual ou de um mês passado, para ter noção do meu caixa real global.
- Como gestor, eu quero que, ao mudar o filtro de mês, os indicadores menores de "Entradas" e "Saídas" mostrem os dados daquele mês específico, para que eu acompanhe minha performance.

## BDD Scenarios

### Cenário: Verificação de Saldo Independente de Filtro Mensal
- **Given (Dado):** O sistema possui transações no mês atual (Ex: R$ 50k Entradas) e em meses passados (Ex: R$ 100k acumulados). Total real = R$ 150k.
- **When (Quando):** O usuário muda o filtro do Dashboard de "Todos" (ou Mês Atual) para um mês passado.
- **Then (Então):** O "Saldo Líquido Consolidado" principal da tela (Hero Balance) continua exibindo R$ 150k, mas os cards menores de Entradas/Saídas atualizam para exibir apenas os valores daquele mês filtrado.
