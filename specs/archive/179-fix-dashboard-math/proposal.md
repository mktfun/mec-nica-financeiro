# Proposal: Correção da Matemática Financeira do Dashboard e Conciliação (179)

## Problema
A lógica atual do backend (no `get_dashboard_metrics` e outras RPCs) contém distorções na matemática financeira que não refletem a realidade operacional da oficina, conforme apontado na revisão rigorosa. Especificamente:

1. **Saldo Banco Itaú:** O sistema estava usando um input manual de "saldo negativo" em vez de simplesmente **somar todos os saldos bancários finais** informados no próprio OFX de cada loja.
2. **A Receber:** Estava misturando indevidamente com os valores de OS no pátio. O "A Receber" deve ser estritamente o valor do **Input Manual**, sem somar as OSs (pois as OSs já têm a métrica própria "Na Loja OS").
3. **Caixa Atual:** Estava subtraindo um "saldo negativo itaú" de forma redundante/incorreta. O caixa atual é a simples soma física: `Saldo Bancos (soma OFX) + Dinheiro/MP + A Receber`.
4. **Diferença Final:** A equação da diferença estava incorreta. A diferença real da oficina deve ser medida entre o dinheiro que "sobrou" (Valor Disponível para Contas) e o dinheiro que "tinha que sair" (Subtotal Valor Contas).

## Solução Proposta (Fórmulas Corrigidas)

A RPC `get_dashboard_metrics(p_date date)` e a estrutura visual serão reescritas para espelhar EXATAMENTE as seguintes equações matemáticas imutáveis:

* **SALDO BANCO ITAÚ** = `SUM(reconciliations.bank_total)` (A soma do saldo final de TODAS as lojas no último fechamento importado via OFX).
* **DINHEIRO MP** = `daily_snapshots.dinheiro_mp` (Input manual).
* **A RECEBER** = `daily_snapshots.a_receber_manual` (Apenas input manual, SEM somar as OSs do Pátio!).
* **NA LOJA OS** = A unificação total do Pátio Atual (`patio_os`) + Pátio Antigo/Marco Zero (`estoque_os_pendente`). Uma única métrica consolidada de passivo.
* **CONTAS** = `daily_snapshots.contas_a_pagar` (Input) + Despesas puras do OFX (`transactions WHERE type='out' AND source='ofx'`).

#### Os 4 Cálculos Vitais (O Coração da Oficina):

1. **Caixa Atual** = `(Saldo Banco Itaú + Dinheiro MP + A Receber)`. *Não subtrai mais nada. Se o saldo bancário estiver negativo, a própria soma (X + -Y) já fará a subtração natural.*
2. **Fluxo de Caixa** = `Caixa Atual de Hoje` - `Caixa Atual da Última Conciliação Anterior`.
3. **Valor Disp. Contas** = `Faturamento Líquido (Entradas OFX)` - `Fluxo de Caixa`.
4. **Subtotal: Valor Contas** = `Contas` + `Juros Rede`.
5. **Diferença Final** = `Valor Disp. Contas` - `Subtotal: Valor Contas`.

## Contratos de Dados
- **Backend:** A migration irá sobrescrever `get_dashboard_metrics` aplicando essa nova matemática cirúrgica. E vai ignorar a coluna `saldo_negativo_itau` (não será mais subtraída na conta de caixa).
- **Conciliação Diária:** A RPC `calculate_daily_conciliation` não sofre grandes alterações, mas consolidará a visão de que o "Faturam. Banco" de cada loja é puxado de forma independente para formar o "SALDO BANCO ITAÚ" global.

## Riscos
- **Risco:** Baixo, pois simplifica e limpa a matemática do sistema. A remoção da dedução artificial do "saldo negativo itau" fará o fluxo de caixa bater 100% com a realidade caso a conta entre no cheque especial (o próprio OFX já informa o saldo negativo).
