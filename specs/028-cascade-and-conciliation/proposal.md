# Proposta: Reformulação da Conciliação e Deleção Segura (Cascade)

## Contexto e Problema
1. **Deleção em Cascata no Frontend:** A rotina de limpar um lote excluído estava rodando no frontend, suscetível a interrupções de rede e quebrando no Supabase JS por falta de aspas, deixando OSs órfãs no pátio.
2. **Tela de Conciliação Atual:** A visão atual de `/conciliacao` está muito focada em um dashboard misto com alertas e pátio, deixando a parte "financeira" e "diária" confusa. O usuário deseja que a tela principal seja um **Motor de Conciliação Diária**, que mostre os resultados consolidados, detecção de divergências do dia, e o principal: **um histórico/seletor de dias** para poder consultar conciliações passadas.

## Objetivo
1. Transferir a exclusão em cascata de lotes para o **PostgreSQL via RPC**, garantindo atomicidade (tudo ou nada) na exclusão de `import_logs`, `patio_os`, `transactions` e `receivables`.
2. Redesenhar a rota principal `/conciliacao` para exibir o **Painel Diário de Conciliação** (Consolidado vs Físico), focando no resultado final daquele dia, alertas de divergência automáticos e permitindo navegar no calendário para ver dias anteriores conciliados.

## BDD Scenarios

### Cenário: Exclusão Segura e Atômica (Cascade)
- **Given:** O usuário exclui um lote pela tela de importação.
- **When:** A ação é acionada.
- **Then:** O sistema chama uma única Função no Banco de Dados que limpa perfeitamente Pátio, Extrato e Recebíveis de uma vez só, ou falha tudo junto, sem gerar órfãos.

### Cenário: Visão da Conciliação Diária
- **Given:** O usuário entra no menu de Conciliação.
- **When:** A tela é carregada.
- **Then:** O usuário vê o resultado de caixa consolidado do dia de hoje (ou do dia anterior selecionado), valores físicos informados, valores registrados pelo sistema e um carimbo de divergências.

### Cenário: Consulta a Dias Anteriores
- **Given:** O usuário quer conferir se a loja bateu as metas na semana passada.
- **When:** Ele usa um calendário/seletor na tela de conciliação e clica em uma data antiga.
- **Then:** A tela atualiza os blocos para exibir o resultado final consolidado daquela data selecionada, com o status da época preservado.
