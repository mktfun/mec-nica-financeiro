# Proposal: Rollback e Refinamento do Fechamento de Caixa

## DescriçÁo do Problema
O design experimental adotado nÁo serviu ao propósito funcional. O usuário nÁo tinha a visÁo de saúde (Health) lado-a-lado, perdeu a tela de detalhes de cada unidade, e a lógica do dinheiro nÁo refletia o combinado. Além disso, o gráfico exibia dados vazios pois estava ancorado na data real (Hoje) e nÁo na data do filtro escolhido.

## SoluçÁo Proposta
1. **Rollback**: Restauramos via Git a tela original que tinha a aprovaçÁo base do cliente (com cards de Grid, Alertas, e Input de Caixa Geral).
2. **Date Picker Diário**: O MonthPicker será trocado por um input do tipo `date`, e todas as queries (`useConciliacaoDetalhes` -> virando `useConciliacaoDiaria`) trarÁo dados daquele dia específico.
3. **Smart Cash no Dashboard**: O card de "Dinheiro em Caixa · Hoje" na tela principal continuará lá, mas ele vai renderizar **APENAS as lojas que possuem expectativa de dinheiro físico** no dia filtrado (seja por OS aberta ou transaçÁo em dinheiro). As que nÁo tem, exibirÁo "Nenhum dinheiro esperado".
4. **Gráfico Evolutivo Real**: Vamos pegar a ideia do Gráfico, mas inseri-lo num dos "Top Cards" de resumo (ex: junto com o Total Faturado) e ele será alimentado por um hook que busca os 14 dias **anteriores à data selecionada no input**, garantindo que nÁo fique zerado.

## BDD Scenarios

### Cenário: VisÁo Geral Diária
- **Given (Dado):** O usuário acessa `/conciliacao` e seleciona `01/05/2026`.
- **When (Quando):** A página carrega.
- **Then (EntÁo):** Ele vê a tela antiga com o grid das 10 lojas. Os dados refletem exclusivamente as entradas e saídas de 01/05/2026.

### Cenário: Gráfico Correto
- **Given (Dado):** O usuário está vendo os dados de `01/05/2026`.
- **When (Quando):** Ele observa o card de Total Faturado no topo.
- **Then (EntÁo):** Ele vê um minigráfico de linha exibindo o faturamento diário de `17/04/2026` até `01/05/2026`, com a curva baseada em dados reais.

### Cenário: NavegaçÁo para Detalhes
- **Given (Dado):** O usuário clica na loja "Rei do Módulo".
- **When (Quando):** O clique acontece.
- **Then (EntÁo):** Ele é direcionado para a rota `/conciliacao-detalhes?storeId=X&date=Y`, que volta a existir com sua interface robusta padrÁo.
