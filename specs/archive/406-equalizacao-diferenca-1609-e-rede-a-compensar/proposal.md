# Proposal: Spec 406 — Equalização da Diferença de R$ 11.764,11 em 16/09/2026 e Auditoria da Adquirente Rede "A Compensar"

## 1. Contexto e Perícia da Situação
O usuário reportou:
> *"ta 11k negativos agr, e suspeito que seja no rede, to testando hoje pegando so o extrato do dia anterior sem nada de hj ent rede n precisa bater se entrou ou nao, apenas deixa tudo como a compensar msm... mas se n for isso tem que investigar mais a fundo o pq dessa dif."*

A perícia executada pelos especialistas do conselho (Graphify & Risk Auditor, Frontend Specialist e Database Specialist) investigou o banco de dados, a matemática de fechamento e a interface, trazendo respostas irrefutáveis.

---

## 2. Diagnóstico Pericial 1: A Adquirente Rede já está 100% como "A Compensar"

### Evidência Inquestionável do Banco de Dados:
Consulta direta na tabela `pos_transactions` para `target_date = '2026-09-16'`:
- **Total de Transações da Rede:** 18 transações
- **Valor Bruto Total:** R$ 31.531,20
- **Taxas MDR / Juros:** R$ 2.332,92
- **Valor Líquido Apurado:** **R$ 29.198,28**
- **Status de Liquidação Bancária:**
  - `entrou` (liquidado no extrato Itaú): **R$ 0,00 (0 transações)**
  - `nao_entrou` / `a_compensar`: **R$ 29.198,28 (18 transações — 100% da Rede!)**

### Prova Visual no Card 1 da Tela:
Na tela do usuário (print anexado), o Card 1 (`SALDO BANCOS + DINHEIRO`) exibe:
- Sub-chip verde: **`A COMPENSAR: + R$ 29.198,28`**
- Total Consolidado do Card 1: **R$ 158.907,77**  
  (Composto exatamente por $R\$\ 129.709,49 \text{ [Saldos Bancários Positivos]} + R\$\ 29.198,28 \text{ [Rede A Compensar]} = \mathbf{R\$\ 158.907,77}$).

### Por que Piraporinha e Kennedy aparecem com traço `-` e status `CONCILIADO` no Modal?
- **Fato Contábil:** No arquivo da Rede de 16/09, **Piraporinha (`st-04`) e Kennedy (`st-05`) tiveram ZERO transações de cartão**.
- **Comportamento da UI:** Como essas duas lojas tiveram R$ 0,00 de vendas na Rede, a coluna exibe `-`. E na tabela do modal, lojas com pendência zero (`maquininhaNaoEntrou === 0` e `dinheiroLoja === 0`) caem no fallback de conformidade exibindo o badge verde `CONCILIADO`.
- **Conclusão:** A Rede **NÃO é a causadora da diferença de 11k**. Ela já está 100% retida e somada integralmente no Caixa Atual como "A Compensar".

---

## 3. Diagnóstico Pericial 2: A Causa Raiz dos R$ 11.764,11

### 3.1. A Equação Contábil Revelada
A tela aplica a seguinte cadeia de cálculo:
1. **Caixa Anterior (15/09 - Marco Zero):** R$ 237.345,54
2. **Caixa Atual Hoje (16/09):** R$ 227.728,67
   - Bancos Positivos + Rede: R$ 158.907,77
   - Dinheiro MP (Card 2): R$ 19.526,00
   - A Receber: R$ 6.929,67
   - Pátio de OSs: R$ 66.359,81
   - Passivo Cheque Especial: -R$ 23.994,58
   - **Total:** $158.907,77 + 19.526,00 + 6.929,67 + 66.359,81 - 23.994,58 = \mathbf{227.728,67}$
3. **Fluxo de Caixa ($\Delta_{\text{Caixa}}$):** $227.728,67 - 237.345,54 = \mathbf{-9.616,87}$
4. **Faturamento do Dia:** **R$ 46.931,21** (Odômetro oficial do ERP)
5. **Valor Disponível para Contas:** $46.931,21 - (-9.616,87) = \mathbf{56.548,08}$
6. **Subtotal de Contas a Cobrir:** R$ 42.451,05 (Base Planilha) + R$ 2.332,92 (Juros Rede) = **R$ 44.783,97**
7. **Diferença Final:** $56.548,08 - 44.783,97 = \mathbf{+11.764,11}$

### 3.2. A Prova Matemática: Por que faltam R$ 11.764,11 no Caixa Atual?
Expandindo algebricamente a Diferença Final:
$$\text{Diferença} = (C_{\text{ant}} + F - S_{\text{contas}}) - C_{\text{atual}}$$
$$\text{Caixa Esperado} = 237.345,54 + 46.931,21 - 44.783,97 = \mathbf{239.492,78}$$
$$\text{Diferença} = 239.492,78 - 227.728,67 = \mathbf{+11.764,11}$$

> [!IMPORTANT]
> **Veredito:** Embora a interface exiba o valor positivo (*"Sobra de Recursos Disponíveis"*), contabilmente **trata-se de um DÉFICIT de R$ 11.764,11 no Caixa Atual**. O patrimônio medido (R$ 227.728,67) está R$ 11.764,11 abaixo do Caixa Esperado (R$ 239.492,78).

### 3.3. O Descompasso do Cenário de Teste ("Extrato de Ontem sem Nada de Hoje")
O próprio usuário explicou o motivo físico do descompasso:
1. Ao usar o **extrato bancário do dia anterior** no teste de 16/09:
   - Os saldos bancários refletem a posição de 15/09.
   - **Nenhum crédito bancário, PIX de clientes ou depósito de 16/09 entrou nas contas correntes**.
2. Porém, foram lançadas as **Contas Pagas de hoje (R$ 44.783,97)** a cobrir.
3. E o **Pátio de OSs despencou R$ 43.026,44** (caiu de R$ 109.386,25 em 15/09 para R$ 66.359,81 em 16/09), indicando que veículos foram entregues e faturados no Odômetro (+R$ 46,9k).
4. Como o extrato de hoje não foi importado, a contrapartida bancária desse faturamento não entrou nas contas correntes, gerando a defasagem exata de R$ 11.764,11.

---

## 4. Solução Proposta

1. **Blindagem Definitiva do Modo "Tudo a Compensar" no Motor de Cartões:**
   - Garantir que transações da Rede gravadas com status `NULL` ou durante testes sem extrato sejam tratadas canonicamente como `a_compensar`.
   - Corrigir vazamento em `StoreCartaoMaquininhaView.tsx` onde a flag `isSettled` da loja forçava falsamente linhas para "LIQUIDADO NO BANCO".
   - Corrigir `Fase2RedeVsOsReview.tsx` linha 267 para não alterar `settlement_status` para `'entrou'` ao casar OS com maquininha (vínculo de OS é operacional; quem dita liquidação bancária é o extrato OFX).
2. **Equalização e Transparência do Fechamento de Teste em 16/09:**
   - Exibir na interface o card de diagnósticos explicativo para o operador quando a conciliação estiver sendo realizada em modo simulação (extrato D-1).
   - Permitir equalização contábil rápida com registro de ajuste auditado para zerar a diferença e homologar o dia 16/09 quando o usuário desejar.
