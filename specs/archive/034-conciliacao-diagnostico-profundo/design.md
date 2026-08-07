# Spec 034: Design

## Ajustes de Lógica
1. A rotina `parsePaymentMethods` que atende ao Dashboard fará uma limpeza agressiva em subtítulos para identificar as Formas de Pagamento, mas no Dashboard o filtro vital `txSemOS` ignorará estritamente transações onde `subtitle === 'Ajuste de Saldo Inicial'`.
2. Para resolver o `WizardImportacao`, injetaremos o hook `useBulkInsertTransactions` ou similar para, na etapa 3 (`step === 3`), submeter os dados ao Supabase.
   - OFX e Maquininhas sÁo `transactions` (extrato).
   - O mapeamento (De-Para) alimentará a chave `store_id` da transaçÁo inserida.

## Visuais UX
- **ConciliaçÁo Global**: A divergência de valor exibida será linkável (ex: ícone `ArrowUpRight`), levando o usuário para o `/loja/$lojaId` para uma visÁo tátil dos falsos-positivos.
- ManutençÁo do padrÁo Apple Liquid Glass nas exibições, sem alterar profundamente o CSS, focando apenas na mecânica transacional.
