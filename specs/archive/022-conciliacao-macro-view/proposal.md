# Proposal: Retorno da VisÁo Consolidada com Slide-over

## DescriçÁo do Problema
O usuário nÁo se adaptou ao layout Split-Pane (mestre-detalhe estrito) implementado na Spec 021. A ausência de uma "VisÁo Macro Consolidada" prejudicou a extraçÁo de relatórios e a avaliaçÁo geral de saúde das unidades no fechamento diário. A ausência de conteúdo quando nada está selecionado também causa estranheza.

## SoluçÁo Proposta
1. **Restaurar Dashboard Macro**: A tela principal `/conciliacao` voltará a ser um painel amplo. Terá os 4 Cards de Resumo no topo e abaixo um Grid com os cartões das 10 lojas, permitindo bater o olho e ver quem faturou, quem nÁo faturou e o status de conciliaçÁo.
2. **Details via Slide-over (Gaveta)**: Clicar no cartÁo de uma loja nÁo levará para outra página nem dividirá a tela permanentemente. Em vez disso, abrirá um "Slide-over" (uma gaveta deslizante vinda da direita da tela). Essa gaveta conterá:
   - A lista de transações do dia para a loja.
   - O formulário "Smart Cash" (que só aparece se houver operações em espécie).
3. **Smart Cash Global**: O widget isolado de "Dinheiro em Caixa - Hoje" com todos os inputs enfileirados que existia antes era poluído. Na nova visÁo macro, podemos colocar um alerta: "X lojas precisam do seu input de fechamento de gaveta", e o usuário clica na loja no grid para abrir a gaveta e informar o valor.

## BDD Scenarios

### Cenário: VisÁo Macro Restaurada
- **Given (Dado):** O usuário abre a página "Fechamento de Caixa" e seleciona a data de hoje.
- **When (Quando):** A página carrega.
- **Then (EntÁo):** Ele vê a visÁo consolidada (Entradas do Dia, Divergência Total) e um grid exibindo TODAS as 10 lojas de uma vez, cada uma com seus valores de Faturado vs Físico.

### Cenário: InspeçÁo via Slide-over
- **Given (Dado):** O usuário está visualizando o Grid consolidado.
- **When (Quando):** Ele clica na loja "Rei do Módulo".
- **Then (EntÁo):** Um painel lateral (Slide-over) desliza da direita cobrindo parcialmente a tela, exibindo o detalhamento do extrato diário daquela loja e o formulário de fechamento de caixa, sem fazê-lo sair do Dashboard.
