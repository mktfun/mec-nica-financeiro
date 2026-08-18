# Proposal 200 - Motor Financeiro Multi-Canal e Custeio Preciso (Manual do Restaurante)

## O Problema
Atualmente, o sistema possui uma arquitetura financeira global (rateando um custo fixo único para a loja inteira e jogando margens estáticas em cima do Custo Variável). O manual aponta uma evolução arquitetural gigantesca: **Os custos fixos devem ser desmembrados (Salão vs Delivery vs Geral)** e o faturamento deve ser capturado **diariamente por canal** para gerar um Custo Fixo Unitário baseado no real volume de pedidos (estabilizado em uma média móvel trimestral). 

Sem essa arquitetura, a precificação é um "chute", pois quem vende 1.000 pedidos paga menos custo fixo por prato do que quem vende 100 pedidos, e as taxas variam por canal.

## A Solução (Engenharia de Dados)
Vamos aplicar os 5 passos do manual do restaurante construindo uma infraestrutura real:

1. **Schema de Canais & Configurações**: Tabelas `canais` e `config_canal_restaurante`. Isso resolve o problema de o restaurante não ter acesso a API do iFood/99Food: ele mesmo cadastra a % da comissão vigente para aquela plataforma.
2. **Lançamento Diário**: O calcanhar de Aquiles resolvido. Tabela `faturamento_diario` para injetar os dados de venda de cada canal (Mesa, iFood, Keeta). A partir do número de pedidos diários, calculamos a **% de representatividade** de cada canal na operação.
3. **Custos Fixos Granulados**: A tabela `custos_fixos_mensais` com a flag `aplica_a` (`geral`, `salao`, `delivery`).
4. **O Motor Matemático (Postgres View/RPC)**: Ao invés de o frontend calcular o rateio com JS, criaremos Views no Supabase que fazem todo o cálculo de "Passo 1 a 5" nativamente. A View fará o rateio do Custo "Geral" para Salão e Delivery baseando-se na proporção de Pedidos dos últimos 3 meses, distribuindo a carga de forma justa.
5. **Dashboard Multi-Canal**: Consumirá a View diretamente para cuspir o Custo Fixo Unitário e a Margem Real Diária por Canal.
