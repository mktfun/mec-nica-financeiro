# Design Document: Spec 024

## Estética (Rollback para Master UI)
- O fundo geral e o layout baseam-se novamente nos componentes de `Card` padrÁo do Shadcn, sem `border-radius` exagerados ou cores Neon.
- Paleta: Primário (`color-primary`, aquele azul/roxo padrÁo do sistema), alertas (`color-accent-danger`, teal).
- Elementos "Liquid Glass" (blur e bordas transparentes) que já existiam no commit base serÁo preservados.

## AtualizaçÁo dos Hooks de Dados
- **`useConciliacaoDetalhes`**: Será refatorado para nÁo usar filtro mensal e sim Diário (recebendo `date`), filtrando transações exatamente do dia.
- **`useWeeklyRevenueTrend(anchorDate)`**: Receberá a `anchorDate` do filtro, subtrairá 14 dias dela, e trará o array do Recharts com faturamentos passados em relaçÁo àquela data.
- **Lógica Smart Cash**: Estará na Query do `useConciliacaoDiaria`. Ela iterará sobre as transações daquele dia + as OSs em aberto para cravar um boolean `expects_cash` por loja.

## Componentes UI Refinados
- Na listagem "Dinheiro em Caixa · Hoje", em vez de iterar sobre `stores`, iteraremos sobre `stores.filter(s => conciliacaoData[s.id]?.expects_cash)`.
- Se a lista resultante for vazia, mostraremos a mensagem "Nenhum fechamento físico requerido para esta data."
