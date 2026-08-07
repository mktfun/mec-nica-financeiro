# Proposal: Dashboard Fintech V4 — Filtro de Data Dinâmico e UI Ajustada (064)

## Problema
Após o deploy da V3, o usuário relatou dois problemas:
1. **Falta de Filtro de Data:** A ancoragem automática na "Última ConciliaçÁo" limitou a capacidade de navegar para o passado. Além disso, se o fallback apontar para o dia atual (onde ainda nÁo há dados exportados), a tela exibe tudo zerado sem chance do usuário retroceder manualmente para o dia que tem dados.
2. **Tabela Espremida:** Com a adiçÁo da coluna de "Pátio" por loja, a tabela "Resultado por Loja" ficou muito apertada e densa, dificultando a leitura.

## SoluçÁo Proposta
1. **Retorno do DatePicker:** Vamos reintroduzir um seletor de data (`<input type="date">`) no cabeçalho. Por padrÁo, ele exibirá a data atual ou a `dateAtual` retornada pelo hook. Mas o usuário terá total liberdade de escolher um dia específico do passado para visualizar os resultados daquele "fechamento".
2. **Hook Híbrido (`useDashboardV2.ts`):** O hook passará a aceitar um `selectedDate`. Se fornecido, ele forçará o `dateAtual` a ser o escolhido pelo usuário. A busca pela `dateAnterior` será inteligente: buscará a maior data de conciliaçÁo que seja **estritamente menor** que a `selectedDate`.
3. **Respiro na Tabela:** A `StoreTableDashboard` será ajustada para lidar melhor com a densidade de colunas. As informações da coluna "Pátio" (Qtd e Valor) serÁo empilhadas verticalmente (ou terÁo seus espaçamentos e fontes otimizados) para nÁo "espremer" o restante da tabela. Adicionaremos também uma classe para garantir um scroll horizontal suave em telas menores, sem esmagar o texto.

## Contratos de Dados
- Nenhuma nova tabela ou coluna.
- A query em `reconciliations` continuará buscando todas as datas distintas, mas aplicará um filtro para localizar a `dateAnterior` relativa ao pivô selecionado.

## API / Interface
- `useDashboardV2(selectedDate?: string)`
- No `index.tsx`, criaremos um state `[selectedDate, setSelectedDate]` conectado ao `<input type="date">`.

## Features Existentes Impactadas
- `src/routes/index.tsx`
- `src/hooks/useDashboardV2.ts`
- `src/components/dashboard/StoreTableDashboard.tsx`

## Risco Principal
- Se o usuário selecionar uma data onde nenhuma loja enviou dados de conciliaçÁo, a tela ficará vazia (esperado), mas o gráfico de "EvoluçÁo do Saldo" precisa continuar mostrando o histórico *até* aquela data sem quebrar.
