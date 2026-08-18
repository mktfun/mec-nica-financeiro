# Design: Redesign do Dashboard com Tabs de Análise por Filial e Tabela de Resultado Horizontal (228)

## 1. Componente `StoreAnalyticsTabs.tsx`
- **Estado de Aba:** `activeTab = 'saldo' | 'faturamento' | 'contas'`
- **Tabs:**
  - `saldo`: Ícone `Landmark`, label *"Saldo Bancário (Itaú)"*, paleta azul/índigo/ciano.
  - `faturamento`: Ícone `TrendingUp`, label *"Faturamento por Filial (OFX)"*, paleta esmeralda/verde/teal.
  - `contas`: Ícone `CreditCard`, label *"Contas e Saídas por Filial (OFX)"*, paleta âmbar/laranja/coral.
- **Estrutura Interna (Grid 12 colunas):**
  - **Coluna Esquerda (5 colunas):** Donut Chart SVG via Recharts com centro luminoso e legenda.
  - **Coluna Direita (7 colunas):**
    - 4 mini cards de estatística rápida (Total, Média, Top Loja, Menor Loja).
    - Tabela/lista compacta com barra de progresso visual colorida para as 10 filiais.

## 2. Componente `StoreTableDashboard.tsx`
- Largura total (`w-full`), mantendo tipografia tabular mono espaçada, contrastes refinados e badges informativos.

## 3. Integração em `src/routes/index.tsx`
- Substituição da divisão em colunas pela sequência horizontal fluida e responsiva.
