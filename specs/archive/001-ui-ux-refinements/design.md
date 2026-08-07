# Design: Refinamentos de UI/UX e Inteligência Temporal (001-ui-ux-refinements)

## Arquitetura de UI (Stitch MCP)

### 1. Modal de EvoluçÁo da OS (Pátio)
- **LocalizaçÁo**: `src/routes/patio.tsx`.
- **Estrutura**: Em vez de apenas cuspir o histórico JSON puro no rodapé do modal, adicionaremos uma Aba "Linha do Tempo" ou uma visualizaçÁo visual de `Stepper` Vertical.
- **Aesthetic (Liquid Glass 2026)**: Usaremos nós com ícones luminosos (neon glow subtle) interligados por uma borda (border-l) para representar os estágios:
  - CriaçÁo da OS
  - Recebimento de Valor (Parcial)
  - Fechamento da OS
- **MicrointeraçÁo**: Hover sobre cada nó expande os detalhes da alteraçÁo (valor de/para).

### 2. Altura dos Cards (Espaço Vazio)
- **LocalizaçÁo**: `patio.tsx`, `recebiveis.tsx`, `loja.$lojaId.tsx`, `importacoes.tsx`.
- **AlteraçÁo CSS**: 
  - Remover `min-h-[400px]` dos containeres de lista.
  - As listas deverÁo usar `h-fit` ou nenhuma altura mínima, para que o `<Card>` "abrace" o conteúdo interno.
  - Para as telas sem dados, a altura será mantida por paddings balanceados (`py-20`).

### 3. Filtro Temporal Global (Dashboard e ConciliaçÁo)
- **LocalizaçÁo**: `src/components/layout/AppShell.tsx` ou em `src/routes/index.tsx` e `src/routes/conciliacao.tsx`.
- **Estrutura**: Adicionar um seletor rápido (ex: um Dropdown "Mês: Junho 2026") no topo da página.
- O padrÁo (default state) da aplicaçÁo deverá verificar qual foi o mês do último `import_log` (ou transaçÁo) e definir esse mês como o mês ativo, e nÁo usar cruamente o `Date.now()`. Isso previne o efeito "zero" se o usuário estiver conciliando o mês anterior.
- **State Management**: Isso será passado para os hooks `useDashboardSummary` e `useConciliacaoResumo`.

### 4. Layout "Sem Divergências" na Loja
- **LocalizaçÁo**: `src/routes/loja.$lojaId.tsx`.
- **AlteraçÁo**: Mover o Card "Sem Divergências" (que hoje fica preso solitário antes do PieChart) para o topo da coluna da direita (acima do Extrato), ou transformá-lo num banner slim (full width) logo abaixo das métricas (Cards KPI). Isso vai equilibrar as larguras (grids) de maneira muito mais natural.

## IntegraçÁo com Banco (Supabase)
- NÁo sÁo necessárias novas colunas. As consultas em `useTransactions` e `useConciliacao` já usam `.gte` e `.lte` de acordo com a data alvo. Apenas a injeçÁo da variável "Mês Alvo" será ajustada na lógica client-side (hooks React).
