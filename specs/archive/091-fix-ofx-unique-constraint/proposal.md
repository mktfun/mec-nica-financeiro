# Proposal: Corrigir Violação de Unique Constraint em OFX (091-fix-ofx-unique-constraint)

## Problema
Durante a importação de lotes que contêm arquivos OFX com datas sobrepostas (ex: extrato bancário de dias anteriores que já foram importados e salvos no banco), o sistema falha com o erro `duplicate key value violates unique constraint "transactions_store_fitid_key"`. Isso acontece porque a estratégia atual deleta apenas as transações do banco cuja `target_date` corresponde à data do fechamento sendo feito, mas o OFX pode trazer lançamentos antigos. Ao tentar inserir tudo cegamente (`.insert(ofxTxs)`), o Supabase esbarra nas transações antigas que já existem com o mesmo `fitid` (mas com `target_date` anterior) e trava o lote todo.

## Solução Proposta
Conforme sugerido, a solução técnica é substituir a instrução cega de `.insert` por um **ON CONFLICT DO NOTHING**. No ecossistema do Supabase (Postgres), isso é atingido usando o método `.upsert` com a flag `ignoreDuplicates: true`.

Essa abordagem garante que:
1. As transações antigas (de outros dias) que vieram no OFX sejam silenciosamente ignoradas (evitando erro e evitando que sejam movidas para o dia atual).
2. As novas transações do dia sejam inseridas normalmente.
3. A nossa regra anterior de "Limpar o pacote do dia antes de inserir" (Delete-then-Insert) continua preservada, o que significa que o estado do dia corrente sempre será limpo antes de receber os dados novos, garantindo a idempotência perfeita sem vazamentos de dias alheios.

## Contratos de Dados
- Nenhuma alteração de schema.
- Tabela envolvida: `transactions`.
- O método de gravação no Supabase muda de `.insert(ofxTxs)` para `.upsert(ofxTxs, { onConflict: 'store_id, fitid', ignoreDuplicates: true })`.

## API / Interface
- Hook afetado: `useBulkInsertTransactions` em `src/hooks/useTransactions.ts`.

## Features Existentes Impactadas
- **Importação de Extratos OFX**: O processo deixará de falhar em lotes com sobreposição de datas. 
- Ref. `spec/global/features.md` (A mecânica central da conciliação continuará intacta).

## Risco Principal
Garantir que as transações do dia correto sejam inseridas. Como executamos um `delete()` para o `target_date` antes do Upsert, as transações daquele dia alvo NÃO estarão no banco na hora do Upsert, logo serão inseridas perfeitamente. O risco é inexistente.
