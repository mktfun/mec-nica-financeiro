# Proposta de Especificação Técnica: Correção da Constraint de Tipo em `ofx_transactions` (Spec 200)

## Contexto do Problema
Durante a gravação de importações e fechamento diário no modal `ImportConciliacaoModal.tsx`, o Supabase retornou o erro de violação de restrição de verificação (Check Constraint):
`null value / check constraint violation: ofx_transactions_type_check`

A tabela `public.ofx_transactions` possui a restrição:
```sql
type TEXT CHECK (type IN ('in', 'out'))
```

No entanto, o componente `ImportConciliacaoModal.tsx` estava mapeando o campo `type` como:
`type: t.type === 'in' || t.amount > 0 ? 'income' : 'expense'`

Além disso, o hook `useTransactions.ts` repassava o valor recebido sem normalização defensiva para `'in' | 'out'`, violando a restrição de verificação do PostgreSQL.

## Solução Proposta
1. **Normalização no Modal (`ImportConciliacaoModal.tsx`):**
   - Garantir que o campo `type` seja estritamente `'in' | 'out'`, respeitando o tipo retornado pelo `ofxParser` e pelo sinal do valor (`t.type === 'in' || t.type === 'income' || t.amount > 0 ? 'in' : 'out'`).
   - Armazenar `amount` como valor positivo (`Math.abs(t.amount)`), já que a direção é controlada pela coluna `type`.
2. **Defesa no Hook (`useTransactions.ts`):**
   - No `useBulkInsertTransactions()`, aplicar sanitização estrita para `type: (t.type === 'in' || t.type === 'income' || t.type === 'credit' || t.type === 'C' || t.amount > 0) ? 'in' : 'out'`.
   - Garantir que o valor gravado na tabela `ofx_transactions` nunca seja diferente de `'in'` ou `'out'`.
3. **Validação de Idempotência:**
   - Garantir que a cláusula de `upsert` com `onConflict: 'store_id, fitid'` e `ignoreDuplicates: true` continue funcionando sem quebras.

## Critérios de Sucesso
- [x] Transações OFX gravadas com `type = 'in'` (entradas) e `type = 'out'` (saídas).
- [x] Zero erros de `ofx_transactions_type_check` durante o fechamento.
- [x] `npm run build` aprovado 100% verde.
