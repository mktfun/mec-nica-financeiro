# Design Document: Spec 071 (Fix Gráfico Faturamento vs Contas)

## 1. YAxis Custom Tick (Anti-Wrap)
Recharts automaticamente quebra o texto (wrap) baseando-se no `width` e nos espaços vazios da string, usando SVG `<tspan>`.
Para prevenir isso 100%, criaremos um `CustomYAxisTick`:
```tsx
const CustomYAxisTick = (props: any) => {
  const { x, y, payload } = props;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="end"
        fill="var(--text-secondary)"
        fontSize={11}
        fontWeight={500}
      >
        {payload.value}
      </text>
    </g>
  );
};
```
Isso desativa a quebra automática e força a string em uma única linha. O SVG `<text>` cru nunca faz wrap automático.

## 2. Limpeza Visual (Menos é Mais)
- Remover os `<LabelList>`. A sobreposição visual quebrou o princípio de legibilidade.
- Reduzir o multiplicador de altura da div de `55` para `38` ou `40` (ex: `Math.max(260, chartData.length * 40)`), o que deixará as barras agrupadas numa densidade vertical mais agradável.

## 3. Prevenção de Corte no Tooltip
- Se o Tooltip sai do container `overflow-y-auto`, ele é cortado (overflow clip).
- Adicionar no Tooltip do Recharts a prop `allowEscapeViewBox={{ x: true, y: true }}` e possivelmente `isAnimationActive={false}` (para evitar bugs de escape).
- Se ainda cortar, reduziremos a margem direita do gráfico para que o tooltip não bata no limite.
