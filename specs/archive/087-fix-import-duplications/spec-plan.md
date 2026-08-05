# Spec Plan: Fim das Duplicações nos Extratos e Lojas

## Etapas de Implementação

- [x] **Etapa 1: Catalogar chaves de lote na rotina de salvamento**
  - Onde: `src/hooks/useTransactions.ts` (na função `saveTransactions`)
  - Ação: Varremos **TODAS** as transações (OFX e Rede) do lote, criando um Set de pares `"store_id|target_date"`.
  - Tratamento Null: `"GLOBAL"` ou `null` será tratado explicitamente.

- [x] **Etapa 2: Ação de Exclusão Universal (Delete antes de Insert)**
  - Onde: `src/hooks/useTransactions.ts`
  - Ação: Iterar sobre o Set coletado e invocar o `supabase.from('transactions').delete()`
  - Lógica: `eq('target_date', date)`. Se o `store_id` for "null", usar `.is('store_id', null)`. Caso contrário, `.eq('store_id', id)`.
  - Diferença para a versão antiga: Agora apagaremos *tudo* daquela data e loja, independente de ter `fitid` ou não.

- [x] **Etapa 3: Inserção Mestre Única (Fall-forward)**
  - Onde: `src/hooks/useTransactions.ts`
  - Ação: Juntar as transações (OFX e Rede) num único array `txs` e rodar um `supabase.from('transactions').insert(txs)` simples, no lugar do `upsert` com constraint falha que estava sendo feito para o OFX.
  - Objetivo: Sucesso absoluto na inserção sem chance de colisões residuais.

## Risco de Regressão
- A mudança apaga o dado existente de uma loja para a mesma `target_date` re-importada. Se o usuário importar "metade" do dia em uma planilha e depois "outra metade" numa planilha separada para a *mesma* data no Wizard, a segunda apagará a primeira. No fluxo de negócios documentado na oficina, no entanto, a conciliação do OFX com o sistema é um pacote fechado importado diariamente num lote único (todos os OFX e planilhas juntos no Wizard), ou seja, a substituição inteira do estado da data é a mecânica esperada e a única forma viável de garantir 0 duplicações.
