# Arquitetura de Conciliação Cruzada e DRE

Este documento detalha o funcionamento e a arquitetura do motor financeiro de conciliação diária da aplicação.

## Introdução
O sistema atua como um DRE (Demonstrativo de Resultado do Exercício) dinâmico, processando quatro fontes distintas de informações. O objetivo principal é garantir que a diferença entre o **Sistema (Operação)** e o **Extrato Bancário** seja de exatos R$ 0,00.

## As 4 Fontes de Dados

### 1. Pátio / OS (Fonte de Receitas Reais)
* **Função:** Alimentar o sistema com todo o dinheiro que os clientes estão pagando pelo serviço.
* **Comportamento:** Se o cliente parcela no cartão e assume os juros, o valor registrado na OS é o valor Bruto (Valor Base + Juros do Cliente). 
* **Impacto no Sistema:** Aumenta o saldo do sistema. Registra-se como Entrada.

### 2. Juros Rede / Taxas Maquininha (Fonte de Despesas Indiretas)
* **Função:** Computar as tarifas cobradas pela operadora do cartão de crédito por processar os pagamentos.
* **Comportamento:** A tarifa nunca abate diretamente o valor da OS. Em vez disso, ela entra como um "custo de operação".
* **Impacto no Sistema:** Diminui o saldo do sistema. Registra-se como Saída (Despesa).

### 3. Contas a Pagar / Despesas Gerais (Fonte de Despesas Diretas)
* **Função:** Registrar todos os custos físicos da loja (água, luz, compra de peças para as OS).
* **Impacto no Sistema:** Diminui o saldo do sistema. Registra-se como Saída.

### 4. Extrato Bancário (A Fonte da Verdade Líquida)
* **Função:** Espelhar passivamente o que realmente caiu na conta corrente do banco.
* **Impacto no Sistema:** Não se mistura com os cálculos matemáticos do sistema. Serve única e exclusivamente para ser a "balança" contra a qual o Saldo do Sistema será pesado.

## A Matemática da Conciliação

O sistema só alcança a perfeição (**Divergência = R$ 0,00**) quando a seguinte equação matemática é comprovada:

> **Extrato Bancário (Net) = Pátio (Receita Bruta com Juros do Cliente) - Juros Rede (Taxa da Maquininha) - Contas a Pagar (Despesas)**

*Exemplo Prático:*
Uma OS de R$ 1.000,00 é paga em 12x. O cliente assume juros do parcelamento e paga R$ 1.140,00. A maquininha cobra uma taxa operacional de R$ 40,00 da loja.
1. O sistema recebe uma ENTRADA de R$ 1.140,00.
2. O sistema recebe uma SAÍDA de R$ 40,00.
3. O Saldo do Sistema calcula R$ 1.100,00.
4. O Extrato do Banco mostra o recebimento de R$ 1.100,00.
5. **Divergência:** Zero.

## Relatório Consolidado das Lojas
Cada transação recebe a identificação de sua loja de origem (ID da Loja). Durante o agrupamento noturno, o robô isola todas as Entradas e Saídas por Loja e compara contra o pedaço do Extrato que também pertence a essa Loja. Isso garante que a Matriz consiga identificar falhas de recebimento ou lançamentos errados separadamente em cada filial.

---

*(Fim do Relatório)*
