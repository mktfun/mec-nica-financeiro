# Proposal: Correção de Justificativas no Faturamento Atual e Redesign do Card de Diferença Final (220)

## Problema
1. **Justificativa não somando no Faturamento Atual nem abatendo na Loja:**
   - A query do hook `useJustifiedTransactions` tentava ler a coluna inexistente `ofx_transactions.title` (na tabela bancária o campo é `bank_name` / `counterpart_name`), gerando erro `42703 (column ofx_transactions.title does not exist)`.
   - Além disso, verificava apenas `manual_justification NOT IS NULL`. Quando o usuário seleciona apenas a categoria (ex: `venda de oleo` no lançamento de R$ 1.712,56 da Dom Pedro), a coluna `manual_justification` fica vazia `""`, fazendo a transação ser ignorada pelo cálculo.
   - O `useCategorizeOrphan` não estava atualizando a tabela unificada `transactions`.
2. **Design do Card de Diferença Final:**
   - O card de *Diferença Final* no `ResumoDiaPanel.tsx` ficou verticalmente esticado, desproporcional e desalinhado com os outros cards da grade de consolidação.

## Solução Proposta
1. **Correção do Pipeline de Justificativas (`useJustifiedTransactions` e `useCategorizeOrphan`):**
   - Corrigir a consulta para utilizar os campos reais (`bank_name`, `counterpart_name` em `ofx_transactions` e ler a tabela unificada `transactions`).
   - Considerar justificada qualquer transação com `manual_category IS NOT NULL` OU `manual_justification IS NOT NULL` (não nulo e não vazio).
   - Atualizar tanto `transactions`, `ofx_transactions` e `pos_transactions` no `useCategorizeOrphan`.
   - Com isso, a transação de R$ 1.712,56 da loja Dom Pedro (DP) será somada ao **Faturamento Atual** e abaterá a diferença da loja Dom Pedro, zerando a pendência.
2. **Redesign do Card de Diferença Final:**
   - Reestruturar o card de Diferença Final com proporções harmônicas, centralização impecável, tipografia de destaque em `font-display` e background glassmorphism premium com feedback de cor verde/vermelho elegante.
   - Alinhar perfeitamente com os blocos da grade de Consolidação do Dia.

## Contratos de Dados
- `transactions`: `manual_category`, `manual_justification`, `amount`, `store_id`, `target_date`, `title`, `bank_name`.
- `ofx_transactions`: `bank_name`, `counterpart_name`, `amount`, `target_date`, `manual_category`, `manual_justification`.
- `pos_transactions`: `machine_name`, `payment_method`, `gross_amount`, `target_date`, `manual_category`, `manual_justification`.

## Riscos e Mitigações
- **Risco:** Duplicar transação se estiver presente em `transactions` e `ofx_transactions`.
- **Mitigação:** Desduplicação por `id` único no hook `useJustifiedTransactions`.
