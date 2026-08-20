# 📘 Guia Definitivo: Como Funciona a Conciliação Financeira Diária

> **Objetivo deste documento:** Explicar de forma simples, didática e estruturada em partes toda a lógica matemática, financeira e sistêmica por trás do nosso ecossistema de conciliação diária de 10 lojas mecânicas.

---

## 🧭 PARTE 1: O Conceito Básico (A Metáfora da Carteira)

Imagine que a empresa é uma pessoa que precisa saber se sobrou ou faltou dinheiro no fim do dia:

1. Você olha quanto dinheiro tinha na carteira **ontem à noite** (`Caixa Anterior`).
2. Você soma tudo o que você tem guardado **hoje** (`Caixa Atual` = saldo nas 10 contas de banco + dinheiro na gaveta + ordens de serviço pendentes no pátio + boletos a receber).
3. A diferença entre o que você tem hoje e o que tinha ontem é quanto o seu patrimônio cresceu ou diminuiu (`Fluxo de Caixa`).
4. Você compara o que faturou hoje (`Faturamento do Dia`) com o que pagou de contas (`Contas a Pagar`).
5. **A Equação de Ouro:** O dinheiro que sobrou livre para pagar contas menos as contas que realmente foram pagas deve dar **R$ 0,00** (tolerância de até $\pm \text{R\$} 50,00$).

---

## 🏛️ PARTE 2: Os 5 Pilares do Caixa Atual (O "Cofre" da Empresa)

O `Caixa Atual` é a soma de todos os ativos da empresa apurados no dia:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CAIXA ATUAL CONSOLIDADO                         │
│                                                                        │
│   [Pilar 1: Bancos + Maq]  +  [Pilar 2: Dinheiro MP]                   │
│   + [Pilar 3: A Receber]   +  [Pilar 4: Na Loja OS]                    │
│   - [Saldo Negativo Conta Mãe (se houver)]                             │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. Pilar 1: Saldo Bancos + Cartões a Compensar
* **O que é:** O dinheiro disponível nas 10 contas bancárias Itaú das 10 filiais + os cartões de crédito/débito passados nas maquininhas da Rede que **ainda não caíram no extrato** (`A Compensar / Não Entrou`).
* **Fórmula:** $\text{Saldo Bancos} = \text{Soma dos Extratos OFX das 10 Lojas} + \text{Cartões Não Entrados}$

### 2. Pilar 2: Dinheiro em Espécie (MP / Caixas)
* **O que é:** O dinheiro físico em notas e moedas presente nos caixas das filiais.
* **Origem:** Conferência física diária informada no fechamento.

### 3. Pilar 3: A Receber (Boletos & Títulos)
* **O que é:** Carteira de recebíveis imediatos, boletos emitidos e pendências a liquidar no dia.

### 4. Pilar 4: Na Loja (Estoque de OS no Pátio)
* **O que é:** O valor dos serviços e peças já executados em veículos que estão fisicamente no pátio da oficina, aguardando retirada ou pagamento pelo cliente.
* **Origem:** Relatórios oficiais de Ordens de Serviço (`patio_os`).
* **Fórmula:** $\text{Restante na OS} = \text{Valor Total da OS} - \text{Valor Pago}$

### 5. Pilar 5: Contas a Pagar (Saídas Operacionais)
* **O que é:** O montante de boletos de fornecedores, peças, salários e contas operacionais liquidadas no dia.

---

## ⚙️ PARTE 3: As 5 Equações do Fechamento Diário

A conciliação segue 5 passos matemáticos encadeados:

```
[Passo 1: Fluxo de Caixa]
  Fluxo de Caixa = Caixa Atual (Hoje) - Caixa Anterior (Ontem)

[Passo 2: Faturamento do Dia]
  Faturamento = Entradas Bancárias OFX das 10 Lojas (+ Cartões)

[Passo 3: Disponível para Contas]
  Disponível = Faturamento do Dia - Fluxo de Caixa

[Passo 4: Subtotal de Contas a Pagar]
  Subtotal Contas = Contas Pagas + Juros / Encargos

[Passo 5: Diferença Final (O Veredito)]
  Diferença Final = Disponível para Contas - Subtotal Contas
```

### 🟢 Critério de Aprovação:
* **Diferença entre $-\text{R\$} 50,00$ e $+\text{R\$} 50,00$:** $\rightarrow$ **STATUS APROVADO (Conforme)**
* **Diferença fora da faixa:** $\rightarrow$ **STATUS DIVERGENTE (Alerta para verificação)**

---

## 💳 PARTE 4: A Conciliação Tripla de Maquininhas

Uma das maiores dores em oficinas mecânicas é o descasamento entre a máquina de cartão e o extrato bancário. Criamos a **Conciliação Tripla**:

```
[1. Venda na Máquina Rede] ────► Valor Bruto (-) Taxa MDR = Valor Líquido
                                           │
                                           ▼
                                 [2. Extrato Bancário OFX]
                                           │
                ┌──────────────────────────┴──────────────────────────┐
                ▼                                                     ▼
     [O dinheiro caiu no extrato]                          [Ainda não caiu no extrato]
            STATUS: ENTROU                                      STATUS: NÃO ENTROU
     (Reconciliado normalmente)                         (Sistema soma automaticamente no
                                                         Pilar 1 para não sumir do caixa)
```

1. **Venda na Rede:** O cliente passa o cartão na loja.
2. **Batimento com OFX:** O sistema busca automaticamente o depósito da Rede no extrato Itaú daquela filial.
3. **Se caiu no dia:** Marca como **ENTROU**.
4. **Se a operadora reteve ou só paga no dia seguinte:** Marca como **NÃO ENTROU (A Compensar)**. O sistema adiciona esse valor ao **Pilar 1**, garantindo que o patrimônio da empresa não pareça menor do que realmente é. Quando o dinheiro finalmente cair no extrato do dia seguinte, o sistema muda o status para `ENTROU` sem duplicar faturamento.

---

## ⚓ PARTE 5: O Marco Zero (A Âncora Inicial)

Para o sistema saber quanto a empresa tinha "ontem", ele precisa de um ponto de partida oficial:

* **O que é o Marco Zero:** É a fotografia financeira inicial da empresa (implantada a partir da planilha de partida `CONCILIAÇÃO 1408.xlsx` ou `1808.xlsx`).
* **O que ele grava:**
  * O saldo bancário inicial de cada uma das 10 lojas.
  * O dinheiro físico em caixa.
  * A carteira de boletos a receber.
  * O pátio inicial de veículos em atendimento.
  * O caixa anterior histórico e o faturamento anterior acumulado.
* **Onde fica guardado:** Na tabela `daily_snapshots` com a marcação `metadata.is_marco_zero = true`. Todos os dias futuros usam o snapshot anterior como base!

---

## 🔄 PARTE 6: O Fluxo Operacional no Nosso Sistema

```
[1. IMPORTAÇÕES]
  ├── Extratos OFX das 10 Lojas Itaú
  ├── Relatório de Vendas de Cartão Rede (POS)
  ├── Relatório de Carros no Pátio (OS)
  └── Relatório de Contas Pagas & Metas
            │
            ▼
[2. PROCESSAMENTO NO POSTGRESQL (RPCs Atômicas)]
  ├── Trunca e substitui dados da data alvo de forma idempotente
  ├── Executa automatch entre transações OFX e vendas da Rede
  ├── Reconcilia as 10 lojas individualmente
  └── Consolida os 5 pilares no daily_snapshots
            │
            ▼
[3. COCKPIT DO RESUMO DO DIA]
  ├── Exibe os 5 Pilares com sub-totais de OFX e Maquininhas
  ├── Exibe o Caixa Consolidado, Fluxo de Caixa e Disponível
  ├── Mostra o Veredito da Diferença Final (Aprovado / Divergente)
  └── Lista as 10 Lojas com status individual e botão de Raio-X
```

---

## 📊 PARTE 7: Exemplo Real com Números (14/08/2026)

| Conceito | Valor Real Apurado | Significado |
| :--- | :--- | :--- |
| **Pilar 1 (Saldo Bancos)** | R$ 170.244,95 | Saldo consolidado das 10 lojas |
| **Pilar 2 (Dinheiro MP)** | R$ 13.066,00 | Dinheiro físico nos caixas |
| **Pilar 3 (A Receber)** | R$ 10.694,50 | Boletos a liquidar |
| **Pilar 4 (Na Loja OS)** | R$ 107.229,76 | Veículos em atendimento no pátio |
| **(-) Saldo Negativo** | -R$ 11.849,09 | Compensação conta mãe |
| **= CAIXA ATUAL** | **R$ 289.386,12** | **Patrimônio Total da Empresa Hoje** |
| **Caixa Anterior** | R$ 258.736,15 | Patrimônio do dia anterior |
| **Fluxo de Caixa** | R$ 30.649,97 | Crescimento do caixa no dia |
| **Faturamento do Dia** | R$ 76.187,25 | Entradas operacionais |
| **Disponível p/ Contas** | R$ 45.537,28 | Faturamento - Fluxo de Caixa |
| **Contas a Pagar** | R$ 45.538,06 | Boletos e despesas pagas |
| **DIFERENÇA FINAL** | **-R$ 0,78** | **✅ STATUS APROVADO (Perfeito)** |
