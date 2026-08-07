# Proposal: Retorno da Visão Consolidada com Slide-over

## Descrição do Problema
O usuário não se adaptou ao layout Split-Pane (mestre-detalhe estrito) implementado na Spec 021. A ausência de uma "Visão Macro Consolidada" prejudicou a extração de relatórios e a avaliação geral de saúde das unidades no fechamento diário. A ausência de conteúdo quando nada está selecionado também causa estranheza.

## Solução Proposta
1. **Restaurar Dashboard Macro**: A tela principal `/conciliacao` voltará a ser um painel amplo. Terá os 4 Cards de Resumo no topo e abaixo um Grid com os cartões das 10 lojas, permitindo bater o olho e ver quem faturou, quem não faturou e o status de conciliação.
2. **Details via Slide-over (Gaveta)**: Clicar no cartão de uma loja não levará para outra página nem dividirá a tela permanentemente. Em vez disso, abrirá um "Slide-over" (uma gaveta deslizante vinda da direita da tela). Essa gaveta conterá:
   - A lista de transações do dia para a loja.
   - O formulário "Smart Cash" (que só aparece se houver operações em espécie).
3. **Smart Cash Global**: O widget isolado de "Dinheiro em Caixa - Hoje" com todos os inputs enfileirados que existia antes era poluído. Na nova visão macro, podemos colocar um alerta: "X lojas precisam do seu input de fechamento de gaveta", e o usuário clica na loja no grid para abrir a gaveta e informar o valor.

## BDD Scenarios

### Cenário: Visão Macro Restaurada
- **Given (Dado):** O usuário abre a página "Fechamento de Caixa" e seleciona a data de hoje.
- **When (Quando):** A página carrega.
- **Then (Então):** Ele vê a visão consolidada (Entradas do Dia, Divergência Total) e um grid exibindo TODAS as 10 lojas de uma vez, cada uma com seus valores de Faturado vs Físico.

### Cenário: Inspeção via Slide-over
- **Given (Dado):** O usuário está visualizando o Grid consolidado.
- **When (Quando):** Ele clica na loja "Rei do Módulo".
- **Then (Então):** Um painel lateral (Slide-over) desliza da direita cobrindo parcialmente a tela, exibindo o detalhamento do extrato diário daquela loja e o formulário de fechamento de caixa, sem fazê-lo sair do Dashboard.
