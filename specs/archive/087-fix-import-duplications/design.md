# Design: DeduplicaçÁo Extrema na ImportaçÁo

## Componentes Afetados
- `src/hooks/useTransactions.ts` (funçÁo `saveTransactions`)

## Lógica de Negócio Envolvida
Atualmente, a inserçÁo de transações misturou duas abordagens:
1. Para o OFX: `UPSERT` baseado em `store_id, fitid`. 
2. Para Rede/Patio: `DELETE` seguido de `INSERT` (mas apenas para `store_id` válidos).

## Mudanças Arquiteturais / Fluxo de Dados
Vamos unificar e blindar o fluxo de inserçÁo em um modelo puramente transacional de reposiçÁo de estado (State Replacement):
- A unidade de importaçÁo no projeto é a **Data Alvo (`target_date`)**.
- Antes de qualquer inserçÁo (seja OFX ou Rede), o sistema irá catalogar todos os pares distintos de `(store_id, target_date)` presentes no lote (tratando `null` adequadamente como 'GLOBAL').
- **Primeiro passo:** O sistema deletará **absolutamente tudo** na tabela `transactions` que corresponda aos pares `(store_id, target_date)` presentes neste lote de importaçÁo. 
- **Segundo passo:** Só entÁo fará o `INSERT` em massa das novas linhas.

Isso elimina a dependência de IDs externos mutáveis (como `fitid` de banco volátil) e garante que, ao reimportar uma planilha, o dia seja reescrito "do zero".

## Tratamento do Null
O Postgres lida mal com comparações `NULL` em rotinas automatizadas. No array de exclusões, precisamos fazer um `is('store_id', null)` explícito caso existam transações com loja Global sendo importadas, garantindo que o lixo sem loja atrelada também suma.
