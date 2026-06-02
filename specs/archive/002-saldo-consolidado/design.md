# Design: Saldo Líquido Consolidado (002-saldo-consolidado)

## Arquitetura de UI (Stitch MCP)
- Nenhuma alteração visual significativa é exigida além da separação lógica dos dados no React.
- O componente `HeroBalance.tsx` continuará existindo, porém, seus valores não dependerão apenas da data. 
- Vamos introduzir uma pequena indicação visual debaixo do Saldo Consolidado, algo como `(Saldo Real de Todas as Contas)` em vez de deixar ambíguo.
- O bloco de "Entradas" e "Saídas" receberá uma badgezinha ou label indicando que referem-se ao mês (ex: `Entradas de Maio`).

## Arquitetura de Banco de Dados (Supabase)
### Lógica de Queries no `useTransactions.ts`
Atualmente, `useDashboardSummary` faz UMA query que filtra `gte` e `lte` baseada no `monthStr`.
Nós vamos alterar a estrutura:
1. Manter a query mensal (para `txsMonth` e `recsMonth`) para extrairmos `totalIn` e `totalOut` e `totalDivergences`.
2. Adicionar uma SEGUNDA query paralela que busca TODO o histórico (`txsAllTime`), e calcula `globalIn - globalOut` para o `balance`. 

Isso será feito internamente no mesmo custom hook (`useDashboardSummary`) retornando:
```typescript
{
  totalIn: number; // Mês selecionado
  totalOut: number; // Mês selecionado
  balance: number; // ALL-TIME (Saldo da Vida toda)
  totalDivergences: number; // Mês selecionado
  motorStatus: string;
}
```
Isso satisfaz 100% a lógica de negócio do gestor que necessita de visões independentes de curto prazo (movimentação) e de longuíssimo prazo (saldo real bancário).
