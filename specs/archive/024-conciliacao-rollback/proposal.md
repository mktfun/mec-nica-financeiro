# Proposal: Rollback e Refinamento do Fechamento de Caixa

## Descrição do Problema
O design experimental adotado não serviu ao propósito funcional. O usuário não tinha a visão de saúde (Health) lado-a-lado, perdeu a tela de detalhes de cada unidade, e a lógica do dinheiro não refletia o combinado. Além disso, o gráfico exibia dados vazios pois estava ancorado na data real (Hoje) e não na data do filtro escolhido.

## Solução Proposta
1. **Rollback**: Restauramos via Git a tela original que tinha a aprovação base do cliente (com cards de Grid, Alertas, e Input de Caixa Geral).
2. **Date Picker Diário**: O MonthPicker será trocado por um input do tipo `date`, e todas as queries (`useConciliacaoDetalhes` -> virando `useConciliacaoDiaria`) trarão dados daquele dia específico.
3. **Smart Cash no Dashboard**: O card de "Dinheiro em Caixa · Hoje" na tela principal continuará lá, mas ele vai renderizar **APENAS as lojas que possuem expectativa de dinheiro físico** no dia filtrado (seja por OS aberta ou transação em dinheiro). As que não tem, exibirão "Nenhum dinheiro esperado".
4. **Gráfico Evolutivo Real**: Vamos pegar a ideia do Gráfico, mas inseri-lo num dos "Top Cards" de resumo (ex: junto com o Total Faturado) e ele será alimentado por um hook que busca os 14 dias **anteriores à data selecionada no input**, garantindo que não fique zerado.

## BDD Scenarios

### Cenário: Visão Geral Diária
- **Given (Dado):** O usuário acessa `/conciliacao` e seleciona `01/05/2026`.
- **When (Quando):** A página carrega.
- **Then (Então):** Ele vê a tela antiga com o grid das 10 lojas. Os dados refletem exclusivamente as entradas e saídas de 01/05/2026.

### Cenário: Gráfico Correto
- **Given (Dado):** O usuário está vendo os dados de `01/05/2026`.
- **When (Quando):** Ele observa o card de Total Faturado no topo.
- **Then (Então):** Ele vê um minigráfico de linha exibindo o faturamento diário de `17/04/2026` até `01/05/2026`, com a curva baseada em dados reais.

### Cenário: Navegação para Detalhes
- **Given (Dado):** O usuário clica na loja "Rei do Módulo".
- **When (Quando):** O clique acontece.
- **Then (Então):** Ele é direcionado para a rota `/conciliacao-detalhes?storeId=X&date=Y`, que volta a existir com sua interface robusta padrão.
