# Spec 054: Unifica‡Æo de L¢gica de Competˆncia no Dashboard de Divergˆncias  
  
## Problema  
Ap¢s a implementa‡Æo da Spec 053, o assistente central de importa‡Æo (Wizard) come‡ou a filtrar perfeitamente os dados em mem¢ria usando o targetDate (Competˆncia), por‚m a tela de Dashboard de Concilia‡Æo Di ria (Fechamento do Dia) continuou exibindo valores divergentes.  
  
A raiz do problema ‚ um descasamento de queries:  
- O Wizard insere os dados baseados na Competˆncia (target_date). Exemplo: Uma venda na maquininha feita dia 09 com cr‚dito em D+1 recebe target_date = 09 mas occurred_at = 10.  
- O Dashboard (via useDailySystemBalance e useDailyBankBalance) puxa as m‚tricas usando a data f¡sica (occurred_at), o que faz com que vendas com cr‚dito no futuro sumam do dashboard da competˆncia.  
  
## Objetivo  
Refatorar as queries do Dashboard de Concilia‡Æo (useDailySystemBalance, useDailyBankBalance) para que o Apurado Sistema e o Extrato Banc rio respeitem a coluna target_date em vez de occurred_at. 
