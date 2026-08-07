# Phase 1: Research - CorreçÁo de Apurado do Sistema (Fechamento)

## Contexto
O usuário reportou que ao visualizar a tela de ConciliaçÁo, o "Apurado Sistema" está exibindo valores astronômicos (ex: R$ 198.832,45 num único dia) e nÁo está batendo com o extrato. 
Eles relataram: *"o carros em patio temuqe contailizar so oq entrou no dia ok? de dinheiro e saiu tbm como o contas a pagar, n e pra somar td n, importei pro dia 9 e somou td na tela de conciliacao po"*.

## Análise do Código
O "Apurado Sistema" é calculado no frontend através da funçÁo `useDailySystemBalance(targetDate)` no arquivo `src/hooks/useTransactions.ts`.
Atualmente, a query desta funçÁo é:
```typescript
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('target_date', targetDate);
```
O problema arquitetural é que a coluna `target_date` armazena o "ID do Fechamento" (ou seja, o dia em que o usuário escolheu fazer a importaçÁo). Quando o usuário importa uma planilha de Carros em Pátio ou Contas a Pagar contendo histórico de vários meses/anos, TODOS os registros dessa planilha recebem `target_date = '2026-06-09'` porque foram importados naquele lote.

## A SoluçÁo
O cálculo do saldo diário ("Apurado Sistema") de um dia específico deve basear-se exclusivamente na data em que a transaçÁo financeira ocorreu de fato (coluna `occurred_at`), e nÁo apenas no lote de importaçÁo.
Se o cliente visualizar o fechamento do dia `2026-06-09`, precisamos somar as transações cujo `occurred_at` cai dentro de `2026-06-09 00:00:00` a `2026-06-09 23:59:59`.
