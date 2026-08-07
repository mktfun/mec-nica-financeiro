# Spec 037 - Design e Arquitetura

## Banco de Dados
A query para pegar o saldo diário de uma loja na conciliaçÁo precisa considerar as transações criadas naquele dia (ou referentes àquele dia) cujo `source` nÁo seja `ofx`. O hook que buscará isso usará a tabela `transactions`. 

## Frontend e UX
1. **Hook `useDailySystemBalance`:** Criaremos um novo hook dentro de `src/hooks/useTransactions.ts` que retorna os totais financeiros (entradas - saídas) por `store_id` em um determinado dia.
2. **`conciliacao.tsx`:** 
   - Integramos `useDailySystemBalance(selectedDate)`.
   - Modificamos a constante `sys` para buscar os dados desse novo hook ao invés de usar `rec?.financial_total`.
   - Modificamos a constante `bank` para continuar lendo do `reconciliations.bank_total` (já foi automatizado na Spec 035).
   - O `Card` da Loja deve usar o hook `<Link>` com um CSS de hover indicando clicabilidade (como `hover:scale-[1.01] transition-transform`). O link de roteamento será `/loja/${store.id}`.
3. **`loja.$lojaId.tsx`:** 
   - Apenas alterar o link superior esquerdo `<Link to="/conciliacao">` para `<Link to="/lojas">`. Manteremos a interface Apple Liquid Glass inalterada.
