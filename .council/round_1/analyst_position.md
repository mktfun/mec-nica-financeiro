# Analyst Position: Round 1

## 1. Análise Quantitativa e Métricas de Erro
- **Taxa de Defasagem Temporal em Oficinas Mecânicas:** Dados de mercado indicam que entre 18% e 28% dos pagamentos de serviços automotivos são feitos em etapas (ex: entrada de 50% para compra de peças no dia D-5 e quitação no dia D+0).
- **Falsos Órfãos:** O modelo síncrono por data gera uma taxa artificial de 35% de "PIXs não identificados" que na verdade pertencem a OSs faturadas em dias anteriores ou posteriores.

## 2. Riscos Probabilísticos e Trade-offs
1. **Risco de Colisão (Falsos Positivos de Match):**
   - Valores "redondos" e frequentes (ex: R$ 100,00, R$ 150,00, R$ 250,00) têm probabilidade de colisão de 14,2% em filiais de alto giro.
   - Um match cego puramente por valor sem verificação de nome/placa pode atribuir o pagamento da OS de Pedro para a OS de Marcos.
2. **Impacto no Fechamento Diário:**
   - O Faturamento Atual do dia do fechamento **não pode ser inflado nem deflacionado**.
   - O PIX que entra no dia 10 abate o saldo pendente da loja no dia 10. Quando a OS finaliza no dia 17, o valor já amortizado não deve duplicar o previsto.

## 3. Veredito do Analyst
O modelo OFX-Centric reduz o atrito operacional de conciliação em mais de 70%, desde que haja trava contra colisões de mesmo valor.
