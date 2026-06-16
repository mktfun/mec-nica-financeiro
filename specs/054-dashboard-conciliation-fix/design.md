# Design - Spec 054  
  
## Architecture  
Em src/hooks/useTransactions.ts:  
  
1. useDailySystemBalance(targetDate)  
Substituir a busca gte/lte em occurred_at por eq(target_date, targetDate).  
  
2. useDailyBankBalance(targetDate)  
Substituir a busca gte/lte em occurred_at por eq(target_date, targetDate).  
  
## Cen†rios  
- SCAN: Verificar de onde vem a query de Extrato Banc†rio.  
- INFER: Se mudarmos a query para target_date, as vendas antigas que n∆o possu°am target_date poderiam falhar.  
- VERIFY: A migration que adicionou target_date tambÇm preencheu para dados legados? O sistema j† assumia target_date = ocorreu_at para os antigos, ent∆o target_date ser† sempre v†lido. 
