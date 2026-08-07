# Spec 069: ReadequaçÁo do Conceito de "Faturamento" para "Recebimentos (Cash-In)"

## 1. VisÁo Geral (O Mal-entendido)
No modelo contábil clássico, "Faturamento" é a soma do Valor Bruto das Notas/OSs emitidas (`total_value`). Foi por isso que a Spec 068 direcionou o cálculo para a soma do valor total das OSs finalizadas.
No entanto, o usuário deixou claro que a regra de negócio dele é focada em **Caixa Real**. Para ele, "Faturamento" significa o **Dinheiro que Entrou no Dia (Pix + Maquininha que bateu com a OS)**, ou seja, a mesma lógica de Recebimentos da tela de ConciliaçÁo.

## 2. A SoluçÁo (A Proposta)
Para que o Dashboard reflita exatamente o valor da ConciliaçÁo ("Maquininha e Pix que entraram"):
1. **Abandonaremos a tabela `patio_os` para o cálculo principal do Faturamento.** O `patio_os` armazena o valor global da OS, mas nÁo registra um extrato diário de "quanto foi pago hoje" de forma isolada.
2. **A nova Fonte de Verdade será a tabela `transactions` (Entradas).**
   - Na tela de ConciliaçÁo, o Bot/Extrato salva todas as entradas de PIX (via OFX) e Maquininha (via Rede) na tabela `transactions` com `type = 'in'`.
   - O "Faturamento Atual" passará a ser a soma de `amount` dessas transações, mais os lançamentos manuais eventuais.
3. Isso garante que o valor exibido no card de Faturamento e na Tabela de Lojas seja **exatamente o dinheiro rastreado e conciliado** naquele dia (Pix e Maquininha), resolvendo a queixa de que "tem que ser o Pix e Maquininha que bate com a OS".

## 3. Impacto no Dashboard
- O Faturamento (Card, Tabela e Gráfico) passará a ler da tabela `transactions` (`type = 'in'`, `amount > 0`).
- Os valores retroativos no Gráfico Macro voltarÁo a bater perfeitamente com os extratos consolidados.
- O campo Faturamento será, na prática, um "Total de Recebimentos Conciliados".
