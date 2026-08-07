# Checklist de Implementação: Spec 069

## Tasks

- [x] [FRONTEND] Ajustar Fetch Inicial em `src/hooks/useDashboardV2.ts`
  - [x] Remover a dependência de `closed_at` e `updated_at` do `patio_os` para faturamento.
  - [x] Mudar a query `contasRows` para buscar todas as `transactions` (não apenas `type='out'`) ou criar uma `entradasRes` específica para `type='in'` da `dateAtual` e `dateAnterior`.
  - [x] Otimizar as queries Macro para trazer `transactions` em geral (entradas e saídas no array `monthDates`).

- [x] [FRONTEND] Substituir Motor do Faturamento Diário
  - [x] `faturamentoAtualLog` passa a ser a soma do `amount` das `transactions` onde `type === 'in'` e `target_date === dateAtual`.
  - [x] `faturamentoAnterior` será a soma correspondente para `dateAnterior`.
  - [x] Distribuir no `fatByStore` os recebimentos por loja.

- [x] [FRONTEND] Substituir Motor do Histórico Macro
  - [x] Alimentar `histMap[data].faturamento` utilizando `transactions` com `type === 'in'` em vez do `patio_os`.
  - [x] Manter a soma dos `faturamento_outros_valor` manuais para não perder os aportes diretos.

- [x] [FRONTEND] Validação Final
  - [x] Confirmar se a tela quebra caso uma loja não possua vendas de maquininha num dia específico (deve exibir 0 corretamente).
