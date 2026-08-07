# Proposal: Juros Progressivo e ImportaçÁo Idempotente (015)

## Contexto e Problema
O usuário reportou dois desafios críticos na rotina de fechamento diário:
1. **Juros Progressivos nÁo contabilizados:** Quando um cliente paga uma OS no CartÁo de Crédito parcelado (ex: 18x), a loja embute um juros (ex: 18%). O gerente, no entanto, frequentemente esquece de lançar esse acréscimo no sistema fonte, deixando a OS com o valor original (R$ 1.000) enquanto o recebimento real foi maior (R$ 1.180). Isso gera divergências falsas no sistema de conciliaçÁo.
2. **SobreposiçÁo de Importações (Efeito Bola de Neve):** A planilha exportada diariamente nÁo traz apenas as OSs daquele dia, mas um conjunto acumulado (ex: OSs em aberto + finalizadas recentes). Se hoje importa 15k e amanhÁ 16k, o sistema nÁo pode somar 31k no faturamento. O sistema precisa ser inteligente o suficiente para atualizar o status das OSs sem duplicar os valores financeiros (Extrato e ReconciliaçÁo).

## Requisitos e User Stories
- **Eu como gestor**, quero que o sistema perdoe a diferença de valores na OS quando identificar que houve pagamento parcelado no cartÁo, aplicando a tabela de juros progressiva automaticamente para abater a divergência.
- **Eu como gestor**, quero importar a mesma planilha 10 vezes seguidas ou importar a planilha de amanhÁ contendo dados de ontem, e ter a certeza de que o sistema nÁo duplicará meu extrato bancário nem meu faturamento.

## O que já existe e será reutilizado
- A tabela `patio_os` já usa `upsert` (atualiza se a OS já existe).
- A tabela de `transactions` e `reconciliations` recebe os dados ao fechar a OS.

## O que precisa ser criado/alterado
- **Motor de Juros Progressivos:** No `useImportProcessor.ts`, ao detectar divergência positiva entre `paid_value` e `total_value`, verificar se a forma de pagamento inclui "CartÁo" ou "Parcelado". Usar a tabela de juros (0% até 4x, 10.5% em 5x... 18% em 18x) para justificar a diferença.
- **Idempotência Forte:** Garantir que a inserçÁo na tabela `transactions` busque estritamente pela referência da OS (ex: `metadata: { os_number }`) para evitar qualquer duplicaçÁo. Re-processar o fechamento diário (Reconciliation) deve **substituir** os valores anteriores daquele dia, e nÁo somá-los ao infinito.

## Critérios de Aceite
1. Se uma OS de R$ 1.000 tiver um recebimento de R$ 1.180 em CartÁo (18x), o sistema nÁo deve acusar "R$ 180 Sobrando", mas sim entender que foi o juros aplicado (Divergência R$ 0).
2. A soma total de Faturamento na Home nÁo pode duplicar caso uma OS seja importada em dois dias diferentes.
