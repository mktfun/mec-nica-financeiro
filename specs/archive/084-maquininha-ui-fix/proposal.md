# Proposal: Fix Maquininha Conciliation & Preview (084)

## Problema
1. **Maquininhas Zeradas na ConciliaçÁo:** Embora a tela de preview da importaçÁo exiba corretamente os totais de maquininha e rede (ex: R$ 5.159,02), a tela de ConciliaçÁo exibe R$ 0,00. 
   - *Causa*: O novo `CentralImportWizard` salva os itens de maquininha apenas na tabela `receivables`, mas deixou de inseri-los na tabela `transactions`. A tela de conciliaçÁo depende da tabela `transactions` (`source: 'rede'` ou `source: 'maquininha'`) para consolidar o total.
2. **ConfusÁo no Preview (Salada de Dados):** O usuário importa vários arquivos de maquininha e nÁo consegue ver com clareza o total deles na tela de preview.
   - *Causa*: O preview renderiza os totais calculando apenas `redeResults`, ignorando por completo os arquivos processados como `maquininhaItems` genéricos.
3. **Vazamento de Datas (Telas com Dados de Outros Dias):** Ao navegar na tela de conciliaçÁo para dias onde nÁo houve importaçÁo, aparecem valores irreais.
   - *Causa*: Assim como ocorria na tela de Loja, alguns hooks do sistema (`useSystemTransactions` e `useDailyReconciliationDelta`) ainda utilizam ranges de `occurred_at` ou `created_at` para buscar dados, puxando transações históricas de OFXs importados em outras datas.

## SoluçÁo Proposta
1. **RestauraçÁo de InserçÁo de Transactions:** Em `CentralImportWizard.tsx`, após gerar as Promessas de `savePatioOsAndReceivables`, iremos iterar sobre `maqByStore` e `redeByStore` para gerar instâncias de transações e inseri-las em `txsToInsert`. Dessa forma, elas entrarÁo na tabela `transactions` com `target_date`, permitindo que o Dashboard de ConciliaçÁo encontre e some os valores de `cartaoEntrou`.
2. **CorreçÁo do Preview:** Atualizar a UI do `CentralImportWizard` para que `storeRedeNet` some os totais de `redeResults` E de `maquininhaItems` mapeados para aquela loja.
3. **ErradicaçÁo do Vazamento de Datas:** Em `src/hooks/useConciliacao.ts`, substituir os usos de `occurred_at` e `created_at` nos hooks `useSystemTransactions` e `useDailyReconciliationDelta` por `target_date`.

## Contratos de Dados
- Nenhuma alteraçÁo de schema.
- Maquininhas passam a registrar dupla-entrada novamente (uma em `receivables` para o contas a receber, e uma em `transactions` para a conciliaçÁo diária), igual era no Wizard original.

## Features Existentes Impactadas
- **ConciliaçÁo Diária:** Passará a exibir os totais reais das maquininhas.
- **ImportaçÁo:** O preview do wizard ficará preciso, mostrando a soma real do que será inserido.

## Risco Principal
- O principal risco é que, ao inserirmos na `transactions`, possamos gerar erro de unique constraint se o `fitid` gerado já existir. MitigaçÁo: usar `generateSyntheticFitId` da mesma forma que o `WizardImportacao` antigo usava, e delegar o conflito ao upsert da tabela.
