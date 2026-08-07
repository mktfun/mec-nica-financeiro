# Spec 067: Refinamento de Layout do Dashboard V5 (Full-Width Macro Chart)

## 1. Visão Geral
Após a implementação da Spec 066, o usuário identificou que o Gráfico "Visão Macro do Mês" ficou espremido ao lado do gráfico "Faturamento x Contas". Além disso, o design do chart precisa ser mais limpo e horizontalizado (mais fino).

**Objetivos:**
1. **Layout 100% Full-Width:** O `EvolucaoMacroChart` deve ocupar as 4 colunas (`xl:col-span-4`), posicionando-se no topo absoluto da seção (acima tanto da tabela quanto do gráfico lateral de lojas).
2. **Design Fino e Horizontal:** Reduzir a altura mínima (ex: para `min-h-[200px]`) para que o card fique longo e fino (aspect ratio super widescreen).
3. **Cabeçalho Integrado:** Mover a legenda do Recharts (Faturamento, Contas, Saldo) para cima, preferencialmente fundida de forma minimalista ao lado do título do Card no "header", limpando a área do gráfico.
4. **Eixo Y Minimalista:** Exibir os valores numéricos no eixo Y lateral esquerdo de forma bem minimalista (fonte pequena, abreviada ex: "15k", "20k", sem poluir a visão).

## 2. Abordagem Técnica
- **`src/routes/index.tsx`**:
  - Tirar o `<EvolucaoMacroChart />` de dentro do `xl:col-span-3`.
  - Criar uma `div` de `xl:col-span-4` para abrigar o `<EvolucaoMacroChart />`.
  - Em seguida, teremos a Tabela em `xl:col-span-3` e o Gráfico de Lojas em `xl:col-span-1`.
- **`src/components/dashboard/EvolucaoMacroChart.tsx`**:
  - Diminuir `min-h-[260px]` para `min-h-[220px]` (ou 200px).
  - Remover o componente `<Legend />` nativo do fundo e recriá-lo manualmente no HTML do header, ao lado do título.
  - Habilitar `<YAxis hide={false} />` mas com formatação compactada (ex: `Intl.NumberFormat('pt-BR', { notation: "compact" })`) e fonte bem fina/pequena.
