# Spec 071: Refatoração do Gráfico "Faturamento × Contas" (Correção de UX)

## 1. O Problema (Análise do Feedback)
O redesign anterior (Spec 070) introduziu problemas graves de renderização identificados pelo usuário:
- **Quebra de Linhas no Eixo Y:** O Recharts forçou quebra de linha em nomes compostos (ex: "Santo André - \n HD"), tornando a leitura horrível.
- **Sobreposição de Labels:** Barras com valores pequenos causaram o encavalamento dos textos de `<LabelList>`, tornando os valores ilegíveis (ex: R$ 886 e R$ 14 sobrepostos).
- **Tooltip Cortado (Overflow):** O tooltip customizado vazou a div com `overflow-y-auto`, ficando cortado pela metade na lateral direita.
- **Espaçamento Sobrando (Scroll desnecessário):** O cálculo da altura dinâmica (`chartData.length * 55`) deixou o gráfico muito alto, criando um espaço morto absurdo no final e forçando scroll sem necessidade.

## 2. A Solução
Para corrigir isso de forma cirúrgica e deixar o gráfico realmente limpo e funcional:
1. **Remover os Labels Externos (`<LabelList>`):** Gráficos de barras agrupadas (Faturamento vs Contas) em espaços reduzidos ficam extremamente poluídos com Labels nativos. Vamos focar em um **Tooltip** impecável.
2. **Consertar o Tooltip (Z-Index e Overflow):** Removeremos o overflow oculto lateral se possível, ou garantiremos que a `margin.right` do chart dê espaço suficiente para o Tooltip respirar (ex: `margin={{ right: 30 }}`). Alternativamente, usar estilo nativo do Recharts para escapar da caixa.
3. **Eixo Y Inquebrável:** Implementar um `<CustomYAxisTick>` (um componente SVG `<text>`) para forçar o Recharts a renderizar a string inteira em 1 linha, truncando com reticências (...) apenas se exceder o limite visual real.
4. **Altura Dinâmica Ajustada:** Reduzir o multiplicador de altura de `55` para `35` ou `40` (ex: `Math.max(260, chartData.length * 40)`), eliminando o espaço morto na parte inferior.
