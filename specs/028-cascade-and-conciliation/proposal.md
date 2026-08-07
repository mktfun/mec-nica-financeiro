# Proposta: ReformulaçÁo da ConciliaçÁo e DeleçÁo Segura (Cascade)

## Contexto e Problema
1. **DeleçÁo em Cascata no Frontend:** A rotina de limpar um lote excluído estava rodando no frontend, suscetível a interrupções de rede e quebrando no Supabase JS por falta de aspas, deixando OSs órfÁs no pátio.
2. **Tela de ConciliaçÁo Atual:** A visÁo atual de `/conciliacao` está muito focada em um dashboard misto com alertas e pátio, deixando a parte "financeira" e "diária" confusa. O usuário deseja que a tela principal seja um **Motor de ConciliaçÁo Diária**, que mostre os resultados consolidados, detecçÁo de divergências do dia, e o principal: **um histórico/seletor de dias** para poder consultar conciliações passadas.

## Objetivo
1. Transferir a exclusÁo em cascata de lotes para o **PostgreSQL via RPC**, garantindo atomicidade (tudo ou nada) na exclusÁo de `import_logs`, `patio_os`, `transactions` e `receivables`.
2. Redesenhar a rota principal `/conciliacao` para exibir o **Painel Diário de ConciliaçÁo** (Consolidado vs Físico), focando no resultado final daquele dia, alertas de divergência automáticos e permitindo navegar no calendário para ver dias anteriores conciliados.

## BDD Scenarios

### Cenário: ExclusÁo Segura e Atômica (Cascade)
- **Given:** O usuário exclui um lote pela tela de importaçÁo.
- **When:** A açÁo é acionada.
- **Then:** O sistema chama uma única FunçÁo no Banco de Dados que limpa perfeitamente Pátio, Extrato e Recebíveis de uma vez só, ou falha tudo junto, sem gerar órfÁos.

### Cenário: VisÁo da ConciliaçÁo Diária
- **Given:** O usuário entra no menu de ConciliaçÁo.
- **When:** A tela é carregada.
- **Then:** O usuário vê o resultado de caixa consolidado do dia de hoje (ou do dia anterior selecionado), valores físicos informados, valores registrados pelo sistema e um carimbo de divergências.

### Cenário: Consulta a Dias Anteriores
- **Given:** O usuário quer conferir se a loja bateu as metas na semana passada.
- **When:** Ele usa um calendário/seletor na tela de conciliaçÁo e clica em uma data antiga.
- **Then:** A tela atualiza os blocos para exibir o resultado final consolidado daquela data selecionada, com o status da época preservado.
