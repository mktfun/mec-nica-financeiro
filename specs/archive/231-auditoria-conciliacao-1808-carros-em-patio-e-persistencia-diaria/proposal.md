# Proposal: Soma de Cartões Não Liquidados, Saldo de Pátio OS e Persistência por Data (231)

## 1. O que foi alinhado e confirmado:

1. **Faturamento Atual (Mapa de Metas):**
   - Mantido 100% como está: O delta `Odômetro Atual - Odômetro Anterior` já funciona e bate com o esperado.

2. **Soma de Cartões que "NÃO ENTRARAM" no Banco (Maquininhas a Compensar):**
   - No fechamento diário, as vendas de cartão processadas nas maquininhas que ainda não foram liquidadas na conta bancária no mesmo dia entram somando no **Saldo Total Disponível / Ativo do Caixa**, exatamente como na fórmula `G13 = SUM(Saldo Bancos + Cartões Não Entraram)` da sua planilha.

3. **Carros em Pátio (Saldo de OSs):**
   - O Pátio (Na Loja OS) consolida o valor retido de ordens que continuam na oficina física **abatendo os pagamentos recebidos no dia** (cartões e PIX) para refletir o saldo pendente real.

4. **Persistência e Isolamento por Data (`daily_snapshots`):**
   - Ao trocar de data na conciliação (`< 17/08/2026 >` vs `< 18/08/2026 >`), a tela inteira deve carregar os dados específicos e a Diferença Final salva de cada dia, sem manter a mesma diferença ou dados misturados.
