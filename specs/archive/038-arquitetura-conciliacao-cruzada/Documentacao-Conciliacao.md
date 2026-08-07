# Arquitetura de ConciliaçÁo Cruzada e DRE

Este documento detalha o funcionamento e a arquitetura do motor financeiro de conciliaçÁo diária da aplicaçÁo.

## IntroduçÁo
O sistema atua como um DRE (Demonstrativo de Resultado do Exercício) dinâmico, processando quatro fontes distintas de informações. O objetivo principal é garantir que a diferença entre o **Sistema (OperaçÁo)** e o **Extrato Bancário** seja de exatos R$ 0,00.

## As 4 Fontes de Dados

### 1. Pátio / OS (Fonte de Receitas Reais)
* **FunçÁo:** Alimentar o sistema com todo o dinheiro que os clientes estÁo pagando pelo serviço.
* **Comportamento:** Se o cliente parcela no cartÁo e assume os juros, o valor registrado na OS é o valor Bruto (Valor Base + Juros do Cliente). 
* **Impacto no Sistema:** Aumenta o saldo do sistema. Registra-se como Entrada.

### 2. Juros Rede / Taxas Maquininha (Fonte de Despesas Indiretas)
* **FunçÁo:** Computar as tarifas cobradas pela operadora do cartÁo de crédito por processar os pagamentos.
* **Comportamento:** A tarifa nunca abate diretamente o valor da OS. Em vez disso, ela entra como um "custo de operaçÁo".
* **Impacto no Sistema:** Diminui o saldo do sistema. Registra-se como Saída (Despesa).

### 3. Contas a Pagar / Despesas Gerais (Fonte de Despesas Diretas)
* **FunçÁo:** Registrar todos os custos físicos da loja (água, luz, compra de peças para as OS).
* **Impacto no Sistema:** Diminui o saldo do sistema. Registra-se como Saída.

### 4. Extrato Bancário (A Fonte da Verdade Líquida)
* **FunçÁo:** Espelhar passivamente o que realmente caiu na conta corrente do banco.
* **Impacto no Sistema:** NÁo se mistura com os cálculos matemáticos do sistema. Serve única e exclusivamente para ser a "balança" contra a qual o Saldo do Sistema será pesado.

## A Matemática da ConciliaçÁo

O sistema só alcança a perfeiçÁo (**Divergência = R$ 0,00**) quando a seguinte equaçÁo matemática é comprovada:

> **Extrato Bancário (Net) = Pátio (Receita Bruta com Juros do Cliente) - Juros Rede (Taxa da Maquininha) - Contas a Pagar (Despesas)**

*Exemplo Prático:*
Uma OS de R$ 1.000,00 é paga em 12x. O cliente assume juros do parcelamento e paga R$ 1.140,00. A maquininha cobra uma taxa operacional de R$ 40,00 da loja.
1. O sistema recebe uma ENTRADA de R$ 1.140,00.
2. O sistema recebe uma SAÍDA de R$ 40,00.
3. O Saldo do Sistema calcula R$ 1.100,00.
4. O Extrato do Banco mostra o recebimento de R$ 1.100,00.
5. **Divergência:** Zero.

## Relatório Consolidado das Lojas
Cada transaçÁo recebe a identificaçÁo de sua loja de origem (ID da Loja). Durante o agrupamento noturno, o robô isola todas as Entradas e Saídas por Loja e compara contra o pedaço do Extrato que também pertence a essa Loja. Isso garante que a Matriz consiga identificar falhas de recebimento ou lançamentos errados separadamente em cada filial.

---

*(Fim do Relatório)*
