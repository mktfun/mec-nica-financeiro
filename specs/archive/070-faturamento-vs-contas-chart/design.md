# Design Document: Spec 070 (Redesign Gráfico Faturamento vs Contas)

## 1. Modificações em `FaturamentoVsContasChart.tsx`

### 1.1 Layout e Eixos
- **YAxis:** Aumentar `width={130}` (ou um valor que acomode os nomes sem quebra, como `140`).
- **YAxis Tick Customizado:** Criar uma função para renderizar o tick do YAxis garantindo que fique alinhado à direita, com uma fonte forte e sem quebrar no meio do traço.
- **XAxis e Grid:** Adicionar `CartesianGrid` com linhas verticais `strokeDasharray="3 3"` e uma opacidade super baixa (`stroke="rgba(255,255,255,0.05)"`) para não poluir, mas dar dimensão e sentido de profundidade aos valores.

### 1.2 Aspecto das Barras
- **Espessura (barSize):** Mudar de `10` para `16` (ou `14`).
- **BarCategoryGap:** Mudar de `25%` para `15%`, deixando as duplas (Faturamento/Contas) mais próximas entre si para enfatizar a comparação na mesma loja.
- **Labels (Valores):** Adicionar `<LabelList dataKey="Faturamento" position="right" formatter={...} fill="var(--text-secondary)" fontSize={10} />` na barra de Faturamento e na de Contas. Isso é essencial para tornar a leitura do painel Imediata, sem depender de mouse (ótimo para telas estáticas/mobile).
- **Cores:** Manter as paletas oficiais:
  - Faturamento: `var(--color-accent-teal)`
  - Contas: `var(--color-accent-warning)` ou `#ef4444` sutil, dependendo do design system. Vamos usar `var(--color-accent-warning)`.

### 1.3 Tooltip Premium
- Renderizar um componente customizado para o `content` do `<Tooltip />`:
  ```tsx
  const CustomTooltip = ({ active, payload, label }: any) => { ... return um card glassmorphism lindo ... }
  ```
- O Tooltip deve exibir a loja (label) no título, e embaixo uma mini tabela ou lista colorida com "Receita" e "Despesa" + as moedas em negrito.

### 1.4 Tratamento dos Nomes
A função `shortenName`:
```ts
const shortenName = (name: string) => name.replace(/Rei do /gi, '').replace(/Mecânica /gi, '').slice(0, 20);
```
Remover "Rei do" em vez de substituir por "R. ", economizando espaço.
