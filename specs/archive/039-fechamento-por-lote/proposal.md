# Spec 039 - Arquitetura de Pagamentos Parciais (Pátio) e Fechamento Diário

## Requisitos e Contexto
O usuário relatou duas necessidades críticas para a tela de Conciliação e para a leitura de OS (Pátio):
1. **Deltas de Pagamento (Carros no Pátio):** Como as planilhas de Pátio são importadas repetidas vezes (pois os carros ficam dias na loja), o sistema não pode simplesmente registrar toda a OS no dia em que ela é finalizada. Se o cliente pagar metade hoje (crédito) e metade daqui a 3 dias (PIX), o sistema deve identificar **quando o saldo pago mudou** e registrar apenas essa "fração" de pagamento na data atual da importação.
2. **Visão de Fechamento Diário:** A Conciliação de um dia deve olhar estritamente para o que ocorreu/foi processado para aquele dia, sem acumular sujeiras. O valor de "Sistema" negativo excessivo relatado pelo usuário provavelmente ocorreu porque despesas em massa foram importadas, mas as OSs (receitas) não entraram no extrato pois ainda não estavam `finalizadas`.
3. **Textos Legados:** Os alertas visuais da Conciliação ainda mencionam "(Físico + Maquininha)", que era a lógica antiga. Precisam ser atualizados para refletir a nova DRE (Sistema vs Extrato).

## BDD Scenarios

### Cenário: Cliente Paga Parcialmente uma OS Aberta
- **Given (Dado):** O carro "ABC-1234" (OS #100) está no pátio. Ontem, o `paid_value` importado era R$ 0.
- **When (Quando):** O gerente importa o Pátio hoje com `paid_value` igual a R$ 500,00 e status `em_aberto`.
- **Then (Então):** O motor de importação deve detectar a diferença (`500 - 0 = 500`), e criar imediatamente uma transação de ENTRADA de R$ 500,00 no sistema com a data de competência de hoje, sem esperar a OS ser finalizada.

### Cenário: Cliente Quita a OS Dias Depois
- **Given (Dado):** A OS #100 do carro "ABC-1234" já tinha R$ 500,00 pagos registrados.
- **When (Quando):** O gerente importa o Pátio hoje com `paid_value` igual a R$ 1.200,00 e status `finalizado`.
- **Then (Então):** O motor detecta a diferença (`1200 - 500 = 700`) e cria uma transação de ENTRADA de R$ 700,00 para hoje. A soma real (500 de dias atrás + 700 de hoje) bate com o valor total da OS, e nada é duplicado no sistema.
