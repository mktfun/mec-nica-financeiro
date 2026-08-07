# Pesquisa e Contexto: CorreçÁo de Saldo Bancário e Extrato

## Entendimento do Problema
O usuário relata que o "Saldo da Loja" e a métrica "Extrato Banco" na aba de ConciliaçÁo estÁo contabilizando valores incorretamente. Em vez de obter o **saldo final real do banco (BALAMT no caso de OFX)** para o dia/período, o sistema está **somando todas as transações de entrada do extrato (source='ofx', type='in')**.

### Impacto Identificado
1. **Saldo da Loja (`globalBalance`)**: No hook `useExtrato`, o sistema pega todos os lançamentos `source='ofx'`, soma `in`, subtrai `out` e subtrai as taxas de maquininha (`machine_fees`). No entanto, a fonte da verdade de um "saldo de banco" deveria ser o fechamento reportado pelo banco (ou seja, o valor consolidado final do dia/extrato, como gravado na coluna `bank_total` da tabela `reconciliations`).
2. **ConciliaçÁo do Período (`concBanco`)**: Em `loja.$lojaId.tsx`, o hook `useEffect` calcula `concBanco` somando o `amount` de todas as transações `source='ofx'` e `type='in'` no período. Novamente, isso soma os fluxos de entrada, mas nÁo representa o Saldo Final.

### SoluçÁo Arquitetural
Para corrigir a forma como o "Extrato Banco" é calculado, nÁo podemos somar transações. Devemos:
1. Buscar o valor final consolidado da conta bancária daquela loja.
2. Como a tabela `reconciliations` ganhou a coluna `bank_total` na Spec 033, podemos usar esse valor. O "Saldo da Loja" pode ser definido como o `bank_total` do fechamento mais recente.
3. Para o "Extrato Banco" (a métrica do período), em vez de somar as transações, deve refletir o saldo final bancário do período filtrado, ou se for para conciliaçÁo fluxo-a-fluxo, corrigir o cálculo para Entradas menos Saídas do banco, em vez de apenas Entradas, dependendo da regra de negócio (precisaremos definir em BDD). 

### Arquivos Afetados
- `src/hooks/useTransactions.ts`
- `src/routes/loja.$lojaId.tsx`
