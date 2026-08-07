# Proposal: CorreçÁo de Saldo Bancário e Extrato

## VisÁo Geral
Atualmente, o painel de lojas está tratando as transações OFX de maneira fluida (Fluxo de Caixa), calculando os saldos como "Soma de Entradas - Soma de Saídas". O usuário identificou que o "Saldo da Loja" e a métrica de conciliaçÁo "Extrato Banco" nÁo devem ser uma soma cumulativa das entradas do dia, mas sim refletir o **Saldo Final real do banco (posiçÁo absoluta)**.

## Requisitos
1. **O "Saldo da Loja" (globalBalance)** nÁo deve ser calculado subtraindo saídas de entradas globais. Ele deve buscar o último `bank_total` (Saldo do Dia) importado para a loja na tabela `reconciliations` (ou em um registro de saldo diário se houver).
2. **A métrica "Extrato Banco"** no card de conciliaçÁo nÁo deve exibir a soma das "Entradas" (atualmente mostrando R$ 5.337,36). Ela deve exibir o saldo consolidado (bank_total) daquele período, ou a variaçÁo líquida do banco (Entradas OFX - Saídas OFX = R$ 2.058,44). 

*Nota de Negócio:* Se o "Extrato Banco" passar a exibir o Saldo Absoluto (ex: R$ 50.000 que tem na conta), o "Apurado Sistema" também precisará exibir o Saldo Absoluto do Sistema, do contrário a "Diferença" será sempre gigantesca. Se o "Extrato Banco" exibir apenas a VariaçÁo do Dia (R$ 2.058,44), a diferença baterá com o "Apurado Sistema" (que é a VariaçÁo do Dia: Pátio + Maq - Despesas).

## User Stories
- **Como gerente da loja**, eu quero que o "Saldo da Loja" mostre exatamente o valor que eu tenho no banco hoje (com base no último fechamento), para nÁo me confundir com cálculos de fluxo que podem estar com histórico faltando.
- **Como auditor**, eu quero que a "ConciliaçÁo do Período" compare a variaçÁo de saldo bancário líquido com o apurado líquido do sistema, e nÁo apenas a soma de entradas brutas do banco contra as vendas brutas do sistema.

## BDD Scenarios

### Cenário: Calculando Saldo da Loja (Global)
- **Given (Dado):** Que a loja teve várias transações importadas, e o último fechamento (OFX) importado registrou um `bank_total` de R$ 15.000,00 no dia 09/06.
- **When (Quando):** O painel da loja for carregado hoje.
- **Then (EntÁo):** O card "Saldo da Loja" deve mostrar "R$ 15.000,00" (o saldo absoluto reportado pelo banco), em vez de calcular todo o fluxo histórico de entradas e saídas.

### Cenário: Calculando a ConciliaçÁo do Período (Aba Esquerda)
- **Given (Dado):** Que no dia 09/06 o banco teve R$ 5.337,36 de Entradas e R$ 3.278,92 de Saídas (Fluxo Líquido = R$ 2.058,44).
- **When (Quando):** O usuário olhar o card "🏦 Extrato Banco" na seçÁo de ConciliaçÁo.
- **Then (EntÁo):** O card deve mostrar "R$ 2.058,44" (Entradas - Saídas), permitindo que seja comparado diretamente contra o "Apurado Sistema" (que também é Entradas - Saídas do sistema), para que a "Diferença" seja precisa. (A menos que o usuário explicitamente prefira comparar Saldos Absolutos Totais).
