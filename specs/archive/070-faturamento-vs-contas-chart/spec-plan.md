# Checklist de ImplementaçÁo: Spec 070

## Tasks

- [x] [FRONTEND] Expandir Eixo Y e Margens em `FaturamentoVsContasChart.tsx`
  - [x] Aumentar `width` do `YAxis` para `140` (ajustado para 130).
  - [x] Refinar a funçÁo `shortenName` para limpar o nome da loja de maneira mais eficiente (removendo prefixos longos) e permitindo até 20 caracteres.
  - [x] Modificar o espaçamento `margin` do `BarChart` para dar respiro aos lados e ao longo da direita, reservando espaço para os Labels dos valores.

- [x] [FRONTEND] Ajustar as Barras e Grid
  - [x] Aumentar o `barSize` para `14`.
  - [x] Reduzir o `barCategoryGap` para aproximar as barras de Faturamento e Contas da mesma loja.
  - [x] Adicionar `CartesianGrid` com linhas verticais para textura de fundo.
  - [x] Inserir `<LabelList>` nativo do Recharts nas extremidades direitas (position="right") para exibir o montante sem necessidade de Tooltip. Formatado para `R$ X,X mil` se for alto, para economizar espaço.

- [x] [FRONTEND] Tooltip Premium e Legenda
  - [x] Substituir o Tooltip padrÁo por um componente funcional `CustomTooltip`.
  - [x] No `CustomTooltip`, usar design glassmorphism (`backdrop-blur-md`, bordas suaves, hierarquia visual clara).
  - [x] Reposicionar ou estilizar a `<Legend />` para dar um toque mais minimalista e sofisticado.

- [x] [FRONTEND] ValidaçÁo Final
  - [x] Visualizar o gráfico no Dashboard.
  - [x] Verificar se os nomes de loja agora aparecem em uma linha só sem quebrar incorretamente.
  - [x] Checar a visibilidade dos novos `LabelList` à direita das barras.
