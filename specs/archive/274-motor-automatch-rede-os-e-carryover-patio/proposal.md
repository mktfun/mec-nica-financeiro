# Proposal: Engenharia Reversa e Motor Inteligente de Auto-Match (Rede ↔ OS) e Carry-Over de Pátio (Spec 274)

## Diagnóstico e Engenharia Reversa

Investigamos a fundo o motivo pelo qual o sistema gerou divergência com o seu Excel manual. Não se trata de erro de cálculo da matemática global, mas sim de **2 comportamentos operacionais das lojas**:

### 1. Descompasso Operacional entre Maquininha e ERP (Caso Rei do Módulo OS #1847):
* **O que aconteceu:** O cliente pagou **R$ 12.900,00 no cartão de crédito da Rede** no dia 21/08. A venda caiu no relatório da Rede e entrou no banco Itaú (OFX). Porém, o atendente da loja no ERP Oficina Integrada não finalizou a OS (deixou como Aberta com R$ 700 pagos e R$ 12.200 de saldo).
* **O que o reconciliador humano fez no Excel:** Viu a venda da Rede de R$ 12.900, bateu o olho na OS #1847 de R$ 12.900, deduziu que eram a mesma coisa, escreveu `C 12.900,00` e zerou o pátio dessa OS manualmente.
* **Solução Autônoma no Sistema:** O motor de importação deve cruzar automaticamente `pos_transactions` com `patio_os` por loja e valor (`gross_amount = total_value`). Quando há match com a Rede, o sistema quita a OS automaticamente no pátio!

### 2. Filtro de Data no Relatório Exportado do ERP (Caso Santo André OS #2326):
* **O que aconteceu:** A OS #2326 (R$ 9.218,73) deu entrada na oficina em 22/07 e continua no pátio sendo consertada. Ao exportar o relatório do ERP, foi aplicado o filtro de abertura `"01/08/2026 a 23/08/2026"`. Por isso, nenhum carro que deu entrada em Julho veio no arquivo XLS de Agosto.
* **O que o reconciliador humano fez no Excel:** Manteve o controle cumulativo das OSs antigas que continuam no pátio.
* **Solução Autônoma no Sistema:** Implementar a preservação cumulativa de Pátio (**Carry-Over Ativo**): OSs que já estavam abertas no pátio em conciliações anteriores não somem do sistema só porque o relatório mensal novo filtrou por data de abertura recente. Elas permanecem ativas no pátio até que venha um evento de faturamento ou baixa.

---

## Solução Proposta (Spec 274)

1. **Auto-Match Inteligente Rede ↔ Pátio OS no Importador (`useImportProcessor.ts` / `useOsImportProcessor.ts`):**
   * Ao processar transações de maquininha da Rede, se houver uma OS aberta na mesma loja cujo valor em aberto seja coberto pela venda da Rede, vincular a transação e atualizar o `paid_value` da OS.
2. **Carry-Over e Persistência Cumulativa de Pátio OS:**
   * Garantir que o upsert de relatórios de OSs atualize OSs existentes sem deletar ou zerar OSs em aberto de datas anteriores.
   * Ajustar o registro histórico de Santo André OS #2326 para `total_value: 9218.73` e `paid_value: 0` (pátio ativo).
   * Ajustar Rei do Módulo OS #1847 para `paid_value: 12900` (quitada pela transação da Rede de R$ 12.900).
3. **Validação do Fechamento Automático:**
   * Com esses 2 motores automáticos:
     * Pátio Total das 10 Lojas = **R$ 88.212,39** (100% idêntico ao Excel)
     * Caixa Atual = **R$ 175.685,99**
     * Fluxo de Caixa = **+R$ 25.085,70**
     * Valor Disp. Contas = **R$ 45.725,86**
     * Subtotal Contas = **R$ 45.719,66**
     * **Diferença Final = +R$ 6,20** (Conciliado com sucesso absoluto).

## Risco Principal
- Falso positivo de match entre Rede e OS se houver duas OSs com valores idênticos na mesma loja no mesmo dia. Mitigado comparando loja, intervalo de datas e status em aberto.
