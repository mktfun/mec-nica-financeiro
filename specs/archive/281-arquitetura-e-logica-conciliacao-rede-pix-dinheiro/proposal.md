# Proposal: Arquitetura & Lógica de Match da Rede, PIX, Dinheiro e Contabilização do Saldo Total (281)

## 1. Visão Geral & Problema
Para operar o sistema com total segurança e clareza, é fundamental entender exatamente como o motor matemático do sistema concilia:
1. **Cartões de Maquininha (Rede):** Como o sistema sabe se a venda passou na maquininha e se o dinheiro já **ENTROU** ou **NÃO ENTROU** no banco?
2. **Dinheiro em Espécie (Cofre da Loja):** O que acontece quando o cliente paga uma OS em dinheiro? Como o sistema evita duplicar o dinheiro com o extrato bancário?
3. **PIX das OSs:** Como o PIX recebido no banco é vinculado à respectiva Ordem de Serviço?
4. **Saldo Total (Pilar 1 e Caixa Atual):** Qual é a fórmula exata de consolidação patrimonial?

---

## 2. A Lógica de Match de Maquininha (Rede) — "Entrou" vs "Não Entrou"

A conciliação de cartões é uma **Conciliação Tripla**:
$$\text{Relatório da Rede (Vendas)} \quad \longleftrightarrow \quad \text{Extrato Bancário OFX (Depósitos)} \quad \longleftrightarrow \quad \text{Ordens de Serviço (ERP)}$$

### Passo a Passo da Lógica:
1. **Passo 1: O que a Loja Vendeu na Maquininha (`pos_transactions`)**
   - O arquivo do portal da Rede traz cada transação individual com `gross_amount` (bruto), `fee_amount` (taxa MDR da maquininha) e `net_amount` (líquido).
   - O sistema calcula o **Líquido Esperado por Loja**:
     $$\text{Rede Líquido}_{\text{loja}} = \sum (\text{Vendas Brutas} - \text{Taxas Rede})$$

2. **Passo 2: O que o Banco Itaú Creditou (`ofx_transactions`)**
   - O extrato OFX da conta bancária da respectiva loja recebe depósitos de lote identificados por `RECEBIMENTO REDE`, `REDECARD`, `REDE MAST`, `REDE VISA`, etc.
   - O sistema soma todas as entradas da Rede no OFX:
     $$\text{OFX Maquininhas}_{\text{loja}} = \sum \text{Entradas OFX do tipo Rede}$$

3. **Passo 3: O Teste de Compensação (Entrou vs Não Entrou)**
   - O motor compara o Líquido das Vendas com o Depósito no Banco:
     $$\text{Diferença Maquininha} = \text{Rede Líquido}_{\text{loja}} - \text{OFX Maquininhas}_{\text{loja}}$$
   
   * **Se Diferença $\le 0.05$:** Todas as vendas foram depositadas no banco Itaú.
     $\rightarrow$ **Status:** `ENTROU` (Valor a Compensar = `R$ 0,00`).
   * **Se Diferença $> 0.05$:** A loja passou cartões na maquininha que o banco **ainda não creditou** (vendas de crédito a compensar em D+1/D+30 ou fechamento de lote pendente).
     $\rightarrow$ **Status:** `NÃO ENTROU` ou `PARCIAL`.
     $\rightarrow$ **Valor Não Entrou:** `R$ Diferença` vai para **Cartões a Compensar**!

---

## 3. A Lógica de Dinheiro em Espécie (Cofre vs Banco)

Quando um cliente paga uma OS em dinheiro na loja:
1. **No Relatório de OS (ERP):** A OS é registrada com método `Dinheiro` (ex: OS #586 R$ 1.845,00 ou OS #1808 R$ 200,00).
2. **Onde está esse dinheiro fisicamente?**
   - **Cenário A (Depositado no mesmo dia):** O gerente pegou o dinheiro e depositou na boca do caixa/lotérica. O dinheiro entrou no extrato Itaú (OFX) no próprio dia.
     - **Regra:** O registro em `store_cash_vault` é marcado como `depositado`. Ele **NÃO** entra como "Dinheiro no Cofre" para não somar 2 vezes (pois já está dentro do saldo do banco!).
   - **Cenário B (Ficou no cofre da loja / Em trânsito):** O dinheiro ainda está no cofre da loja e não foi depositado no banco.
     - **Regra:** O registro em `store_cash_vault` fica como `status = 'em_transito'`. Ele **SOMA** no Caixa Atual no card **"Dinheiro no Cofre (+ R$ 2.045,00)"**.

---

## 4. A Lógica do PIX

1. **No Extrato OFX:** Entradas bancárias com `PIX RECEBIDO`, `PIX TRANSF`, `PIX QR CODE`.
2. **Auto-Match com OS:**
   - O motor cruza o valor da entrada PIX com o saldo pago da OS daquela filial.
   - Ao encontrar a OS com valor idêntico, preenche `matched_os_number`.
3. **No Fechamento da Loja:**
   - O valor do PIX é exibido na métrica `PIX` da filial.
   - Como o PIX cai direto na conta bancária instantaneamente, ele já compõe o `Saldo Bancos OFX` do Itaú!

---

## 5. Como Tudo se Consolida no Saldo Total e no Caixa Atual

### Fórmula 1: Pilar 1 — Total Saldo Bancos + Dinheiro
$$\text{Total Saldo Banco} = \underbrace{\text{Saldo Bancos OFX}}_{\text{10 contas Itaú (R\$ 61.456,10)}} + \underbrace{\text{Dinheiro no Cofre}}_{\text{Lojas em trânsito (R\$ 2.045,00)}} + \underbrace{\text{Cartões a Compensar}}_{\text{Maquininhas pendentes (R\$ 0,00)}} = \mathbf{R\$ 63.501,10}$$

### Fórmula 2: Caixa Atual (Patrimônio Total Disponível)
O Caixa Atual consolida os 5 pilares do negócio:
$$\text{Caixa Atual} = \text{Total Saldo Banco (63.501,10)} + \text{Dinheiro MP (13.278,00)} + \text{A Receber (10.694,50)} + \text{Pátio OSs (88.212,39)} = \mathbf{R\$ 175.685,99}$$

### Fórmula 3: Fluxo de Caixa Líquido
$$\text{Fluxo de Caixa} = \text{Caixa Atual (175.685,99)} - \text{Caixa Anterior (150.600,29)} = \mathbf{+R\$ 25.085,70}$$

### Fórmula 4: Batimento Final (Diferença de Caixa)
1. **Valor Disponível p/ Contas:**
   $$\text{Valor Disponível} = \text{Faturamento Total (70.811,56)} - \text{Fluxo de Caixa (+25.085,70)} = \mathbf{R\$ 45.725,86}$$
2. **Subtotal de Contas a Cobrir:**
   $$\text{Subtotal Contas} = \text{Contas Manual (40.069,51)} + \text{Juros Rede (5.650,15)} = \mathbf{R\$ 45.719,66}$$
3. **Diferença Final:**
   $$\text{Diferença Final} = 45.725,86 - 45.719,66 = \mathbf{+R\$ 6,20} \quad (\text{Status: APPROVED / CONCILIADO})$$
