# Round 1 — Analyst

## Análise de Risco Contábil e ROI
A automação de recebíveis é crítica para o fluxo de caixa, mas há um **Risco Primário Gravíssimo de Dupla Contagem** que precisa de blindagem matemática formal.

## Riscos Quantitativos e Fórmulas:
1. **O Risco da Dupla Contagem (Pilar 3 vs Pilar 4):**
   - Se uma OS de R$ 2.000 for parcelada em Boleto (2x R$ 1.000) e continuar no relatório como `total_value = 2000, paid_value = 0`, o Pilar 4 (Na Loja OS) somará +R$ 2.000 e o Pilar 3 (A Receber) somará +R$ 2.000.
   - O Caixa Atual ficaria inflado em R$ 2.000 fictícios, gerando uma falsa divergência gigantesca no fechamento do dia!
   - **Mitigação Mandatória:** A RPC `get_daily_reconciliation_summary` deve isolar: se a OS gerou títulos em `receivables`, o valor pendente no pátio deve ser subtraído ou zerado para aquela OS.
2. **Taxas Bancárias de Cobrança (Diferença de Centavos):**
   - O banco Itaú desconta tarifa de liquidação de boleto (ex: R$ 2,50 a R$ 4,50). Se o boleto é de R$ 1.000, o extrato OFX recebe R$ 996,50.
   - O matcher precisa de tolerância de tarifa bancária ou lançar a tarifa em despesas bancárias (`juros_taxas`) para não travar a conciliação.
3. **Métricas de Sucesso:**
   - Redução a zero da intervenção manual para boletos e transferências.
   - Zero divergência no fechamento diário ($Delta = 0$).
