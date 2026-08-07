# Proposal: ExtraçÁo da PosiçÁo Consolidada do Banco (BALAMT) via OFX

## VisÁo Geral
Como descoberto na análise técnica (research), a nossa importaçÁo de arquivos OFX está cega para o verdadeiro saldo do cliente. O parser apenas lia as listas de transações e ignorava o fechamento real do banco reportado pela instituiçÁo financeira. Com isso, o Saldo da Loja estava ficando dependente de somatórias e ajustes manuais, o que causava a falsa sensaçÁo de que a última correçÁo de saldo nÁo funcionou.

## Requisitos
1. **Parser de OFX:** Precisa varrer o arquivo para identificar a tag `<LEDGERBAL>` e capturar o valor de `<BALAMT>`.
2. **Componente Wizard ImportaçÁo:** O fluxo de estados no React deve armazenar esse saldo extraído do OFX e passar para a camada de mutaçÁo.
3. **Motor de IngestÁo (`useImportProcessor`):** No momento de gravar os dados do banco no banco de dados (`reconciliations`), o sistema deverá fazer o update da coluna `bank_total` com o valor do `BALAMT`.

## User Stories
- **Como gerente financeiro**, eu quero que ao importar meu extrato do Itaú (ou Nubank, Bradesco, etc.), o sistema capture o meu saldo oficial e o exiba no dashboard da Loja, para que eu nÁo precise digitar manualmente meu saldo em conta todos os dias.
- **Como sistema confiável**, a plataforma deve basear seu "Último saldo reportado pelo banco" em um dado absoluto provido pela instituiçÁo e nÁo numa conta local baseada no fluxo de transações, já que transações antigas podem nÁo ter sido importadas.

## BDD Scenarios

### Cenário: ExtraçÁo e ExibiçÁo do Saldo Correto
- **Given (Dado):** Que o arquivo OFX possui a linha `<LEDGERBAL>` e uma sub-tag `<BALAMT>15459.42</BALAMT>`.
- **When (Quando):** Eu fizer o drag and drop deste OFX na tela de Importações e Confirmar ImportaçÁo.
- **Then (EntÁo):** A tabela `reconciliations` terá um registro na data do extrato com `bank_total = 15459.42`. Consequentemente, o card "Saldo da Loja" mostrará R$ 15.459,42.
