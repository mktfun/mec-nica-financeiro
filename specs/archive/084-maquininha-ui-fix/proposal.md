# Proposal: Fix Maquininha Conciliation & Preview (084)

## Problema
1. **Maquininhas Zeradas na Conciliação:** Embora a tela de preview da importação exiba corretamente os totais de maquininha e rede (ex: R$ 5.159,02), a tela de Conciliação exibe R$ 0,00. 
   - *Causa*: O novo `CentralImportWizard` salva os itens de maquininha apenas na tabela `receivables`, mas deixou de inseri-los na tabela `transactions`. A tela de conciliação depende da tabela `transactions` (`source: 'rede'` ou `source: 'maquininha'`) para consolidar o total.
2. **Confusão no Preview (Salada de Dados):** O usuário importa vários arquivos de maquininha e não consegue ver com clareza o total deles na tela de preview.
   - *Causa*: O preview renderiza os totais calculando apenas `redeResults`, ignorando por completo os arquivos processados como `maquininhaItems` genéricos.
3. **Vazamento de Datas (Telas com Dados de Outros Dias):** Ao navegar na tela de conciliação para dias onde não houve importação, aparecem valores irreais.
   - *Causa*: Assim como ocorria na tela de Loja, alguns hooks do sistema (`useSystemTransactions` e `useDailyReconciliationDelta`) ainda utilizam ranges de `occurred_at` ou `created_at` para buscar dados, puxando transações históricas de OFXs importados em outras datas.

## Solução Proposta
1. **Restauração de Inserção de Transactions:** Em `CentralImportWizard.tsx`, após gerar as Promessas de `savePatioOsAndReceivables`, iremos iterar sobre `maqByStore` e `redeByStore` para gerar instâncias de transações e inseri-las em `txsToInsert`. Dessa forma, elas entrarão na tabela `transactions` com `target_date`, permitindo que o Dashboard de Conciliação encontre e some os valores de `cartaoEntrou`.
2. **Correção do Preview:** Atualizar a UI do `CentralImportWizard` para que `storeRedeNet` some os totais de `redeResults` E de `maquininhaItems` mapeados para aquela loja.
3. **Erradicação do Vazamento de Datas:** Em `src/hooks/useConciliacao.ts`, substituir os usos de `occurred_at` e `created_at` nos hooks `useSystemTransactions` e `useDailyReconciliationDelta` por `target_date`.

## Contratos de Dados
- Nenhuma alteração de schema.
- Maquininhas passam a registrar dupla-entrada novamente (uma em `receivables` para o contas a receber, e uma em `transactions` para a conciliação diária), igual era no Wizard original.

## Features Existentes Impactadas
- **Conciliação Diária:** Passará a exibir os totais reais das maquininhas.
- **Importação:** O preview do wizard ficará preciso, mostrando a soma real do que será inserido.

## Risco Principal
- O principal risco é que, ao inserirmos na `transactions`, possamos gerar erro de unique constraint se o `fitid` gerado já existir. Mitigação: usar `generateSyntheticFitId` da mesma forma que o `WizardImportacao` antigo usava, e delegar o conflito ao upsert da tabela.
