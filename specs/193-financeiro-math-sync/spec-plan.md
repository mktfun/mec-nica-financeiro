# Spec Plan 193

- `[x]` 1. No Componente `ProductPricingRow`, adicionar os states locais `simMesa`, `simIfood`, `sim99`, `simKeeta` (inicializados com os valores que vierem do produto ou 0).
- `[x]` 2. Alterar o header da tabela (thead) agrupando as colunas conforme o Design 193 (3 grandes grupos: Custos, Meta, Simulador).
- `[x]` 3. Construir as colunas de "Simulador" com o Input e a tag de Margem (% Mg Real) renderizados de forma empilhada na mesma célula (`flex-col`), economizando espaço horizontal.
- `[x]` 4. Atualizar as fórmulas matemáticas de Lucro Real (`lucroIfood`, `lucro99`, `lucroKeeta`) para usarem os respectivos inputs do Simulador ao invés de um único `numPrecoDefinido`.
- `[x]` 5. Renomear "Custo Total" para "Custo Var. (Base)" na primeira seção.
