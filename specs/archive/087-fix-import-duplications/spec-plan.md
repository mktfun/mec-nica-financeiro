# Spec Plan: Fim das Duplicações nos Extratos e Lojas

## Etapas de ImplementaçÁo

- [x] **Etapa 1: Catalogar chaves de lote na rotina de salvamento**
  - Onde: `src/hooks/useTransactions.ts` (na funçÁo `saveTransactions`)
  - AçÁo: Varremos **TODAS** as transações (OFX e Rede) do lote, criando um Set de pares `"store_id|target_date"`.
  - Tratamento Null: `"GLOBAL"` ou `null` será tratado explicitamente.

- [x] **Etapa 2: AçÁo de ExclusÁo Universal (Delete antes de Insert)**
  - Onde: `src/hooks/useTransactions.ts`
  - AçÁo: Iterar sobre o Set coletado e invocar o `supabase.from('transactions').delete()`
  - Lógica: `eq('target_date', date)`. Se o `store_id` for "null", usar `.is('store_id', null)`. Caso contrário, `.eq('store_id', id)`.
  - Diferença para a versÁo antiga: Agora apagaremos *tudo* daquela data e loja, independente de ter `fitid` ou nÁo.

- [x] **Etapa 3: InserçÁo Mestre Única (Fall-forward)**
  - Onde: `src/hooks/useTransactions.ts`
  - AçÁo: Juntar as transações (OFX e Rede) num único array `txs` e rodar um `supabase.from('transactions').insert(txs)` simples, no lugar do `upsert` com constraint falha que estava sendo feito para o OFX.
  - Objetivo: Sucesso absoluto na inserçÁo sem chance de colisões residuais.

## Risco de RegressÁo
- A mudança apaga o dado existente de uma loja para a mesma `target_date` re-importada. Se o usuário importar "metade" do dia em uma planilha e depois "outra metade" numa planilha separada para a *mesma* data no Wizard, a segunda apagará a primeira. No fluxo de negócios documentado na oficina, no entanto, a conciliaçÁo do OFX com o sistema é um pacote fechado importado diariamente num lote único (todos os OFX e planilhas juntos no Wizard), ou seja, a substituiçÁo inteira do estado da data é a mecânica esperada e a única forma viável de garantir 0 duplicações.
