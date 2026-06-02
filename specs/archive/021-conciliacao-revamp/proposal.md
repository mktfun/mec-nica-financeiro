# Proposal: Conciliação Inteligente & Master-Detail

## Descrição do Problema
O fluxo atual de conciliação tem gargalos graves de usabilidade:
- Ele é limitado à visão mensal, dificultando a auditoria do que ocorreu **exatamente ontem ou hoje**.
- A página de "Detalhes" é desconectada da visão macro.
- O input manual de "Dinheiro Físico em Caixa" cobra do usuário informar caixas para lojas que nem tiveram transações em espécie, gerando confusão e cliques desnecessários.

## Solução Proposta
Uma interface unificada "Side-by-Side" (Split Pane) de **Fechamento de Caixa Diário**.

### Principais Mudanças:
1. **Filtro Diário**: Ao invés de Mês, o usuário selecionará um Dia específico (com botões rápidos: *Hoje*, *Ontem*, etc).
2. **Layout Split-Pane**: A esquerda terá a lista de Lojas (com o indicador Rápido de OK/Divergente). Ao clicar na loja, o lado direito (Painel de Detalhes) atualizará em tempo real com todas as entradas/saídas **daquele dia**.
3. **Smart Cash Input**: O campo de imputar "Dinheiro em Caixa" existirá DENTRO do painel da loja selecionada e **só será desbloqueado/exibido** se o sistema detectar que houve pelo menos R$0,01 transacionado em espécie ("Dinheiro") para aquela loja naquele dia ou se a loja tiver recebimentos pendentes previstos em dinheiro.

## BDD Scenarios

### Cenário: Filtrar conciliação por dia exato
- **Given (Dado):** O usuário está na tela de Conciliação
- **When (Quando):** Ele seleciona a data "Ontem" (ex: 2026-06-01)
- **Then (Então):** O resumo e o status das 10 lojas devem refletir apenas o faturado, físico e divergências correspondentes a ontem.

### Cenário: Exibir campo de Dinheiro apenas para quem movimenta em espécie
- **Given (Dado):** O painel de uma loja está aberto no layout split-pane para a data de hoje.
- **When (Quando):** O sistema varre as transações e NÃO encontra nenhuma movimentação com método "dinheiro" e NENHUMA OS em aberto aguardando espécie.
- **Then (Então):** O campo de "Informar Dinheiro Físico" fica oculto ou desabilitado com a mensagem "Nenhuma operação em espécie hoje".

### Cenário: Visualizar detalhes instantaneamente
- **Given (Dado):** O usuário vê a loja "Rei do Módulo" marcada como "Pendente" na esquerda.
- **When (Quando):** O usuário clica sobre "Rei do Módulo".
- **Then (Então):** A aba direita exibe instantaneamente as O.S., Entradas e Saídas do Rei do Módulo daquele dia sem necessidade de recarregar a página.
