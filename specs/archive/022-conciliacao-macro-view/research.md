# Research: Spec 022 - Retorno da Visão Macro e Consolidada

## Contexto do Problema
Na Spec 021, transformamos a tela de conciliação em um modelo Split-Pane (Master-Detail). O usuário rejeitou a mudança argumentando que:
1. Ele **perdeu a visão consolidada** de todas as lojas, que existia antes na forma de Grid com cards de resumo (necessária para relatórios à gerência/Daniel).
2. O layout atual deixa um grande "vazio escuro" (void) no lado direito quando nenhuma loja está selecionada.
3. Ele quer manter a facilidade do "ver tudo geral" com a capacidade de, quando necessário, ver o detalhe de uma loja específica.

## Achados e Direcionamento
1. **Voltar ao Layout de Dashboard Macro**: A tela principal de `/conciliacao` precisa voltar a exibir os `Summary Cards` (Faturado, Fechamentos, Saldo Líquido, etc) e o `Grid de Lojas` (10 unidades lado a lado mostrando Faturado vs Físico).
2. **Date Picker Diário**: O filtro por `dia` (YYYY-MM-DD) implementado na Spec 021 foi uma vitória e **deve ser mantido**. O hook `useConciliacaoDiaria` continuará sendo a base de dados.
3. **Smart Cash Input**: A lógica de exibir o input de dinheiro *apenas* para lojas que esperam dinheiro físico também foi um acerto, mas deve ser movida para a visão Macro ou dentro do detalhamento.
4. **Visualização de Detalhes (Sem mudar de página)**: Ao invés do Split-Pane, usaremos um **Modal/Drawer Lateral (Slide-over)**. Ao clicar no card da loja no Grid, uma gaveta desliza na direita mostrando o extrato de entradas/saídas do dia e o formulário de "Fechar Caixa (Físico)". Isso mantém o Dashboard intacto embaixo.
