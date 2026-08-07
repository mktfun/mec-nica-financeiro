# Research: Spec 023 - Revolut-Style Conciliation Dashboard

## Benchmarking Visual (Revolut)
O usuário solicitou um design estritamente inspirado no aplicativo **Revolut** (com base nas imagens fornecidas e link do Behance). As principais características de design (Design System) observadas sÁo:
1. **Tipografia Heroica**: Números de saldo gigantes, com a moeda em destaque. Fonte sans-serif geométrica (Inter/SF Pro).
2. **Modo Escuro com Alto Contraste**: Fundo frequentemente preto puro (`#000000`) ou cinza muito escuro (`#111111`).
3. **Acentos Neon/Vibrantes**: O Revolut usa blocos inteiros em cores vibrantes, como "Neon Yellow/Green" (`#DFFF00`), Azul Elétrico ou gradientes suaves como fundo de cartões principais (Cards).
4. **Formas Arredondadas (Pill-shape & Squircles)**: Botões no formato de pílula (`rounded-full`), e cartões com bordas bem arredondadas (ex: `rounded-3xl` ou `24px`).
5. **IntegraçÁo de Gráficos Orgânicos**: Gráficos de linha (Line Charts) inseridos diretamente sob o saldo principal de forma "seamless" (sem bordas duras de gráficos tradicionais), apenas a linha colorida preenchendo o cartÁo.
6. **Layout de Listas Limpo**: Listas de transações/unidades com um ícone circular à esquerda, título em cima, subtítulo cinza embaixo e valor alinhado à direita.

## Necessidades do Usuário (Negócio)
1. **VisÁo Consolidada Premium**: Ele quer bater o olho e ver "como a rede está" hoje. Isso exige um componente "Hero" no topo.
2. **Gráfico Essencial para a Diretoria/Financeiro**: O usuário explicitou a necessidade de um gráfico vital. Para a conciliaçÁo diária, o gráfico ideal é a **EvoluçÁo do Faturamento da Rede (Últimos 7 ou 30 dias)** em formato de linha limpa.
3. **Lista de Unidades Resumida**: As 10 unidades devem aparecer como uma lista "estilo feed de transações do Revolut", limpa e clicável.
4. **Detalhes sem Perder Contexto**: Ao clicar na unidade, abrir um Slide-over (Gaveta) para lidar com o físico e as divergências.

## Decisões Técnicas
- **Gráfico**: Usar a biblioteca `recharts` já presente no projeto, mas com customizaçÁo extrema (remover eixos, linhas de grade e fundo) para deixar apenas o `Line` puro fluindo com stroke de gradiente neon.
- **Estrutura**: Ao invés de um "Grid de cartões", faremos uma lista empilhada elegante (Flex col) para as Lojas, que simula perfeitamente a UI do Revolut.
