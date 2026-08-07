# Checklist: Implementação UI Revolut para Conciliação

## Fase 1: Motor Gráfico & Hero
- [ ] Construir o hook `useWeeklyRevenueTrend()` para alimentar o gráfico com dados dos últimos 7 ou 14 dias de faturamento, gerando o vetor para a linha.
- [ ] Criar o componente `<RevolutHeroChart>` integrando o Saldo Gigante do Dia com o `<LineChart>` minimalista (sem grid, sem eixos) no fundo do cartão.

## Fase 2: Lista Elegante de Lojas
- [ ] Mudar a iteração de lojas de um Grid para uma lista flex-col vertical.
- [ ] Criar o componente de linha `<StoreListItem>` (Ícone status, Nome da Loja, Valor alinhado à direita).
- [ ] Implementar o "Ponto de Ação Neon" (Dot pulsante) se a loja precisa de `Smart Cash` (Dinheiro Físico pendente).

## Fase 3: Revolut Drawer
- [ ] Atualizar o `<StoreDetailPane>` do Slide-over para o visual Revolut.
- [ ] Fazer o Header do Drawer ter uma área sólida de contraste (ex: fundo Neon) para destacar a loja aberta.
- [ ] Garantir que o formulário de "Input de Gaveta" pareça uma pílula flutuante (Liquid Glass) grudada no bottom do Drawer.
- [ ] Aplicar bordas absurdamente arredondadas (`rounded-[32px]`) nos contornos principais.
