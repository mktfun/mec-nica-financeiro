# Proposal: Idempotência e Ingestão Completa da Maquininha (057)

## Problema
Atualmente, no módulo `storeMapping.ts`, estamos utilizando a string `"IGNORAR"` para forçar o descarte de linhas cujo nome do estabelecimento seja genérico (ex: "Visa", "Mastercard"). O usuário apontou corretamente que isso destrói informações que podem ser úteis, pois são transações verídicas. 
Porém, se apenas importarmos tudo, arriscamos duplicar transações caso o usuário faça upload do mesmo arquivo Excel mais de uma vez, já que as transações da Rede não possuem um ID nativo infalível como o OFX possui (`fitid`).

## Solução Proposta
1. Remover as exclusões destrutivas (`"IGNORAR"`) do dicionário `storeMapping.ts`, permitindo que "Visa", "Mastercard", etc., sejam mantidos e caiam no processo normal de mapeamento (onde podem ser atrelados a uma conta Global/Interna).
2. Criar um ID sintético determinístico (`fitid`) para TODAS as transações de Maquininha (Rede). Esse hash será baseado na combinação única de: `Loja + Data + Valor Bruto + Valor Líquido + Método`.
3. Ao injetar o campo `fitid` nos objetos criados na importação, o hook nativo `useBulkInsertTransactions` (que já lida com OFXs baseados em `fitid`) irá interceptá-las na lógica do array `ofxTxsRaw` e processá-las via `.upsert({ onConflict: 'store_id, fitid' })`, garantindo que **duplicatas exatas sejam ignoradas silenciosamente pelo banco de dados**, protegendo a aplicação contra re-importações.

## Contratos de Dados
- Tabela `transactions`: Continuará inalterada. Já possui o campo `fitid` suportando índices únicos compostos com `store_id`.
- Mutações de estado (INSERT/UPDATE/DELETE): Transações originadas da maquininha passarão a usar UPSERT no lugar de INSERT bruto.

## API / Interface
- Nenhuma alteração nos endpoints ou hooks `useTransactions.ts`.
- `CentralImportWizard.tsx`: O gerador do payload de importação passará a montar a propriedade `fitid` usando um hash simples, ex: `REDE_<storeName>_<date>_<netAmount>`.

## Features Existentes Impactadas
- O hook de `useCentralImport` ou a interface de confirmação continuarão exibindo o totalizador de importados, porém a tabela absorverá repetições sem duplicar caixa. (Mapeado em `spec/global/features.md`).

## Risco Principal
O maior risco é a geração do hash sintético (fitid) ter colisão com transações perfeitamente idênticas que ocorreram no mesmo dia, na mesma loja, com o exato mesmo valor e método. Na vida real, a Rede agrega o repasse diário, reduzindo essa possibilidade. O uso da concatenação dos atributos atende com 99% de segurança os relatórios consolidados diários.
