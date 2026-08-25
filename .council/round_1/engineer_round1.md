# Round 1 — Engineer

## Viabilidade Técnica e Execução
A ideia é totalmente viável, mas exige regras cirúrgicas de compensação bancária e parsing de texto para não falhar na prática.

## Regras de Execução:
1. **Deteção de Formas de Pagamento no ERP:**
   - O relatório de OS costuma trazer strings variadas: `BOLETO 2X`, `BOL 30/60`, `TRANSF BANC`, `DOC/TED`, `PGTO CONTA`, `FATURADO`.
   - O classificador deve usar regex robusto: se contiver `boleto|bol`, classifica como `Boleto`; se contiver `transf|ted|doc|debito|deposito|conta`, classifica como `Transferência`.
2. **Cálculo de Vencimento e Calendário Bancário (BACEN/Febraban):**
   - **Transferência:** Prazo padrão é D+1 útil (ou D+0 se for TED até às 17h, mas como conciliação é diária, liquida em D+1).
   - **Boleto:** Prazos padrão (ex: 30 dias para parcela 1, 60 dias para parcela 2). Se a data calculada cair em sábado, domingo ou feriado nacional, prorroga-se deterministicamente para o **primeiro dia útil subsequente**.
   - Implementação de função auxiliar de feriados nacionais brasileiros no utilitário de datas.
3. **Casamento com Extrato OFX (Auto-Match):**
   - Para Transferências: no extrato do Itaú aparecem como `TED...`, `TEF...`, `TRANSF...`, `DOC...` ou nomes de empresas.
   - Para Boletos: aparecem como `LIQ.COBRANCA`, `DEP.BOLETO`, `TIT.COBRANCA`.
   - A RPC de auto-match deve varrer essas transações e ligar ao ID do recebível.
