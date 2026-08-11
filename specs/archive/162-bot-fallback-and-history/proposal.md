# Proposal: Cloud Sync Imersivo e Auto-Fallback do Pátio (162)

## Problema
A implementação atual do sync das OS via bot estava trazendo os veículos no pátio apenas para o mês atual e separada da importação de arquivos. Se o bot falhasse, o usuário ficava sem saída clara. Além disso, a importação manual e o bot estavam em fluxos desvinculados na UI. Por fim, as OS pendentes de dias anteriores (mes passado) não estavam sendo cobertas devidamente na atualização diária, o que impacta os cálculos do Pátio.

## Solução Proposta
1. **Sync Padrão (Mês Passado + Hoje):** Ao acionar a importação/sync, o sistema deve SEMPRE disparar a coleta das OS do *Mês Passado* (01/XX a 31/XX) e de *Hoje*. Isso garante que todas as OS que estão pendentes (em aberto) no pátio sejam varridas e atualizadas, independentemente de quando foram abertas.
2. **UX Imersiva Unificada:** A experiência visual "Agent Runner" vai rodar simultaneamente para processar o processamento dos arquivos locais (OFX, planilhas) E a raspagem da Oficina Inteligente pelo Bot. Somente após a conclusão de ambos, o botão de avançar no Wizard será liberado.
3. **Resiliência e Fallback Manual:** O bot tentará extrair os dados 3 vezes em caso de falha. Se as 3 tentativas falharem (último caso), a UI exibirá um formulário de fallback para o usuário preencher manualmente as OS pendentes/recebidas. Este formulário pedirá os exatos mesmos dados que viriam da planilha Excel (Número da OS, Loja, Valor Total e Valor Pago).

## Contratos de Dados
- Não há grandes alterações de schema de banco necessárias, utilizaremos as tabelas já existentes: `pos_transactions` e `daily_snapshots`.
- Os inputs da rotina manual de fallback devem mapear diretamente para inserções na `pos_transactions` como se tivessem vindo do Excel, possuindo identificadores consistentes.

## API / Interface
- `sync-oficina` Edge Function precisará receber parâmetros flexíveis de `data_inicio` e `data_fim` para garantir que o mês anterior + hoje sejam englobados.
- `CentralImportWizard.tsx` orquestrará a chamada simultânea de arquivos e bot.
- Novo componente de Fallback (ex: `ManualOsFallbackForm`) injetado no Wizard para quando a flag `bot_failed` estiver ativa.

## Features Existentes Impactadas
- **Wizard de Importação (`CentralImportWizard.tsx`)**: Sofre grande reformulação na orquestração dos Steps 2 e 3.
- **Agent UI (`AgentRunnerModal.tsx`)**: Expandida para representar tanto o scraping cloud quanto o parsing local em paralelo.

## Risco Principal
Gargalo de performance na Edge Function / Playwright. Fazer o bot buscar as OS do mês passado inteiro + hoje pode estourar o timeout da Edge Function (Vercel/Supabase limitam o tempo de execução). 
*Mitigação*: Garantir que o bot no Playwright faça as consultas rapidamente ou divida as datas para não dar timeout, e configurar devidamente o Retry de 3 tentativas com feedback visual.
