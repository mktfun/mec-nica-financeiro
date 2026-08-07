# Proposal: Refinamentos de UI/UX e Inteligência Temporal (001-ui-ux-refinements)

## Requisitos
- **Histórico e EvoluçÁo da OS**: Criar uma interface dedicada e clara (Timeline) para o usuário visualizar o ciclo de vida de uma OS (criaçÁo, edições de valor, pagamentos parciais e finalizaçÁo) no Pátio.
- **Responsividade Vertical de Cards**: Corrigir as listagens (Dashboard, Pátio, Recebíveis, Importações) para que os cards se adaptem ao conteúdo, eliminando o "espaço vazio" (`min-h-[400px]`) quando houver poucos itens na página.
- **Inteligência de Período (Dashboard e ConciliaçÁo)**: Consertar a exibiçÁo de R$ 0,00 adicionando seleçÁo explícita de Mês/Período, para que os resumos financeiros reflitam os dados reais do mês importado em vez de forçar o mês do calendário do dia atual.
- **Ajuste de Layout (Loja)**: Reposicionar o card "Sem Divergências" na visÁo da Loja, que atualmente "quebra" o fluxo visual da coluna esquerda.

## User Stories
- Como gestor, eu quero clicar em uma OS no Pátio e ver uma "Timeline" clara mostrando quando ela foi criada, quando teve o valor alterado e quando foi paga.
- Como usuário, eu quero que as páginas que possuem listas curtas nÁo tenham grandes buracos vazios na tela.
- Como analista financeiro, eu quero que o Dashboard Principal consolide corretamente os valores do mês correspondente aos dados que eu importei, para que eu nÁo veja "R$ 0,00" só porque virou o mês.
- Como analista financeiro, eu quero ver as Lojas sem divergências em um local que faça sentido no layout, integrado com o Extrato.

## BDD Scenarios

### Cenário: VisualizaçÁo de Histórico da OS
- **Given (Dado):** O usuário está na tela de Pátio e clica em uma OS que já sofreu atualizações (ex: pagamento parcial).
- **When (Quando):** O Modal de Detalhes é aberto e o usuário navega para a aba/seçÁo de EvoluçÁo.
- **Then (EntÁo):** Uma linha do tempo (Timeline) é exibida detalhando as alterações de status, valor e datas.

### Cenário: ExibiçÁo Compacta de Listas
- **Given (Dado):** Uma tabela/lista com apenas 2 registros (ex: aba "Pagas Parcial").
- **When (Quando):** O usuário visualiza a listagem.
- **Then (EntÁo):** A altura do fundo da lista acompanha a altura dos 2 registros, sem deixar 300px de espaço vazio.

### Cenário: ConsolidaçÁo Temporal do Dashboard
- **Given (Dado):** O sistema tem importações apenas no mês passado.
- **When (Quando):** O usuário acessa o Dashboard no mês atual.
- **Then (EntÁo):** O usuário possui a opçÁo de filtrar/selecionar o Mês Desejado e ver os valores totais consolidados desse mês escolhido.
