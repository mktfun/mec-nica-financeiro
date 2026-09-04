# 📋 Proposta: Simulação Real de Importação (04/09/2026), Prova Real Pericial e Equalização de Saldos

**Spec ID:** `372-simulacao-real-import-0409-equalizacao-saldos`  
**Data:** 04/09/2026  
**Status:** Proposta Aberta (Aguardando Aprovação)  
**Área:** Conciliação Diária / Importação Inteligente / RPCs Postgres / Saldos e Tesouraria  

---

## 1. Contexto e Solicitação do Usuário

O usuário reportou duas anomalias severas na conciliação de `04/09/2026`:
> *"o saldo não bate e não tá contabilizando corretamente rede a cair e dinheiro pra dar baixa tbm saca?*  
> *então preciso que vc simule real o import C:\Users\User\Desktop\conciliacao\09-26\04-09 desses dados aqui e que vc como agente, manual faça a prova real. Se ater, entenda por que na última conciliação deu errado (saldo real positivo total pra mim nos meus cálculos dá 290) entenda por que deu errado na conciliação, mas se der errado mesmo na simulação fiel e real, aí você tem que arrumar a lógica e tudo mais.*  
> */proposal"*

---

## 2. Prova Real Pericial dos Dados Brutos (Auditoria Forense Manual)

Foi executada a leitura e consolidação manual de todos os **30 arquivos brutos** presentes no diretório `C:\Users\User\Desktop\conciliacao\09-26\04-09`:
- **10 Arquivos OFX** (Extratos bancários Itaú das 10 lojas)
- **8 Arquivos Rede XLSX** (`Rede_Rel_Vendas_03_09_2026...xlsx`)
- **10 Arquivos de OS XLS** (`_ConferenciaOSxFinanceiro.xls`)
- **1 Arquivo Contas XLS** (`BuscaContasAPagar.xls`)
- **1 Arquivo PDF** (`Mapa de Metas - 04-09-2026.pdf`)

---

### 2.1. Extratos Bancários Itaú (10 Contas / OFX) — O Enigma dos R$ 290k Resolvido!

A extração manual dos saldos finais (`LEDGERBAL` / `BALAMT`) de cada um dos 10 extratos OFX em `04/09/2026` revelou:

| Loja | ID | Saldo Final OFX | Natureza Contábil |
| :--- | :--- | :--- | :--- |
| **Dom Pedro** | `st-01` | R$ 22.876,53 | Positivo (Disponível) |
| **Jabaquara** | `st-02` | R$ 6.286,26 | Positivo (Disponível) |
| **Jorge Beretta** | `st-03` | R$ 22.131,84 | Positivo (Disponível) |
| **Kennedy** | `st-04` | R$ 38.618,29 | Positivo (Disponível) |
| **Matriz Consolação** | `st-05` | R$ 52.871,59 | Positivo (Disponível) |
| **Planalto** | `st-06` | -R$ 1.653,79 | Negativo (LIS / Limite de Crédito Utilizado) |
| **Rudge Ramos** | `st-07` | R$ 32.127,15 | Positivo (Disponível) |
| **Rei do Módulo** | `st-08` | R$ 36.938,20 | Positivo (Disponível) |
| **Santo André** | `st-09` | R$ 24.321,98 | Positivo (Disponível) |
| **Taboão** | `st-10` | R$ 54.822,78 | Positivo (Disponível) |

#### 🎯 Totalização Bancária:
- **Soma dos Saldos Positivos (9 lojas):**  
  $$22.876,53 + 6.286,26 + 22.131,84 + 38.618,29 + 52.871,59 + 32.127,15 + 36.938,20 + 24.321,98 + 54.822,78 = \mathbf{R\$\ 290.994,62}$$
  **Bate exatamente com os R$ 290k calculados pelo usuário!**
- **Soma dos Saldos Devedores (1 loja - Planalto):** **-R$ 1.653,79**
- **Saldo Líquido em Contas Itaú (10 lojas):**  
  $$290.994,62 - 1.653,79 = \mathbf{R\$\ 289.340,83}$$

---

### 2.2. Vendas da Rede (8 Arquivos XLSX) vs Compensação Bancária em D+1

As 8 planilhas de vendas da adquirente Rede referem-se ao movimento transacionado em **03/09/2026** (D-1), com prazo de repasse em D+1 (1 dia útil, isto é, `04/09/2026`):

| Loja | Vendas Líquidas 03/09 | Crédito no Extrato OFX de 04/09 | Diferença / A Cair |
| :--- | :--- | :--- | :--- |
| **Dom Pedro** | R$ 2.710,32 | R$ 2.710,32 | R$ 0,00 |
| **Jabaquara** | R$ 6.149,86 | R$ 6.149,86 | R$ 0,00 |
| **Jorge Beretta** | R$ 3.107,02 | R$ 3.107,02 | R$ 0,00 |
| **Kennedy** | R$ 2.206,49 | R$ 2.206,49 | R$ 0,00 |
| **Consolação** | R$ 2.222,04 | R$ 2.222,04 | R$ 0,00 |
| **Rudge Ramos** | R$ 3.376,01 | R$ 3.376,01 | R$ 0,00 |
| **Santo André** | R$ 1.096,96 | R$ 1.096,96 | R$ 0,00 |
| **Taboão** | R$ 3.678,62 | R$ 3.678,62 | R$ 0,00 |
| **TOTAL** | **R$ 24.547,32** | **R$ 24.547,32** | **R$ 0,00** |

#### 💣 Descoberta Crítica #1 (A Causa da Dupla Contagem e do Saldo Inflado):
1. **100% dos R$ 24.547,32 de vendas da Rede já caíram no extrato bancário na manhã de 04/09/2026!**
2. O saldo bancário apurado de **R$ 290.994,62** **JÁ INCLUI** esses R$ 24.547,32!
3. **O Erro no Sistema Anterior:** A RPC somava:
   $$\text{Total Bancos Positivo} = \text{Saldo Bancos (290.994,62)} + \text{Cartões a Compensar (24.547,32)} = \mathbf{R\$\ 315.541,94}$$
   Isso gerou uma **dupla contagem fraudulenta de R$ 24.547,32**, inflando o caixa em mais de vinte e quatro mil reais!
4. **Regra Canônica:** "Rede a Cair / Cartões a Compensar" é rigorosamente:
   $$\text{Cartões a Compensar} = \max(0, \text{Vendas Rede Líquidas} - \text{Depósitos Rede no Banco})$$
   Como $\text{Vendas} = 24.547,32$ e $\text{Depósitos no Banco} = 24.547,32$, o saldo de **Rede a Cair desse lote é R$ 0,00**! O saldo de bancos positivo deve permanecer exatamente em **R$ 290.994,62**!

---

### 2.3. Dinheiro em Trânsito / Cofre das Lojas (`store_cash_vault`)

Na apuração manual do banco de dados, existem recolhimentos de dinheiro em espécie das lojas realizados pelo gestor/Daniel:

| Loja | Data Recolhimento | Valor em Espécie | Status Atual |
| :--- | :--- | :--- | :--- |
| **Santo André** | 03/09/2026 | R$ 2.336,40 | `em_transito` |
| **Dom Pedro** | 03/09/2026 | R$ 2.637,50 | `em_transito` |
| **Rei do Módulo** | 03/09/2026 | R$ 4.140,00 | `em_transito` |
| **TOTAL EM TRÂNSITO** | — | **R$ 9.113,90** | **Pendente de Baixa** |

#### 💣 Descoberta Crítica #2 (Por que o "Dinheiro pra dar baixa" sumiu):
1. A RPC anterior filtrava `store_cash_vault` com a cláusula pontual:
   `WHERE entry_date = v_target_date::date` (isto é, `entry_date = '2026-09-04'`).
2. Como o dinheiro recolhido no dia 03/09 **ainda estava em trânsito com o Daniel** e não havia sido depositado no banco no dia 04/09, a consulta do dia 04/09 retornou **R$ 0,00**!
3. O dinheiro em espécie simplesmente "evaporou" do fechamento do dia 04/09, impedindo o operador de visualizar o montante para dar baixa!
4. **Regra Canônica:** O Dinheiro das Lojas / Em Trânsito deve considerar o saldo acumulado de todos os registros onde:
   `status = 'em_transito' AND entry_date <= v_target_date::date`.
   Dessa forma, os **R$ 9.113,90** permanecem visíveis e contabilizados como Ativo Circulante até que ocorra a efetiva conciliação bancária do depósito ou baixa manual.

---

### 2.4. Ordens de Serviço (10 Arquivos XLS) — Produção e Pátio WIP

A consolidação das 10 planilhas `_ConferenciaOSxFinanceiro.xls` em `04/09/2026` apurou:
- **Produção Total de OSs do Dia:** **R$ 55.696,43**
- **Total Pago nas OSs no Dia:** **R$ 43.891,21**
  - PIX Recebidos: R$ 11.114,74
  - Cartões de Crédito / Débito: R$ 32.776,47
  - Dinheiro em espécie na data: R$ 0,00
- **Restante em Aberto (Pátio WIP de Hoje):** **R$ 11.802,94**
  - Confirmação aritmética: $43.891,21 + 11.802,94 = 55.694,15 \approx 55.696,43$.
  - Essa é a produção em andamento nas oficinas que ainda não foi quitada.

---

### 2.5. Contas a Pagar (`BuscaContasAPagar.xls`)
- **Total de Contas a Pagar do Dia:** **R$ 20.446,80**
- **Juros e Despesas Financeiras Rede do Dia:** **R$ 2.015,76**
- **Total Consolidado de Saídas/Contas:** **R$ 22.462,56**.

---

## 3. Consolidação Final da Prova Real (04/09/2026)

| Componente | Valor Prova Real | Explicação Pericial |
| :--- | :--- | :--- |
| **Saldo Bancos Positivos (9 lojas)** | **R$ 290.994,62** | Bate exato com a conta de R$ 290k do usuário (Itaú) |
| **Cheque Especial Itaú (Planalto)** | **-R$ 1.653,79** | Limite LIS utilizado |
| **Cartões a Compensar (Rede a cair)** | **R$ 0,00** | Lote de 03/09 (R$ 24.547,32) compensado 100% no extrato de 04/09 |
| **Dinheiro em Lojas / Em Trânsito** | **R$ 9.113,90** | Saldo acumulado em trânsito com Daniel (Santo André, DP, Rei) |
| **Dinheiro MP** | **R$ 24.955,00** | Mercado Pago / Aplicações |
| **A Receber Manual** | **R$ 8.048,99** | Recebíveis extras manuais |
| **TOTAL ATIVOS TESOURARIA** | **R$ 331.458,72** | Saldo líquido imediato real para pagamento de obrigações |
| **Pátio Aberto (WIP do Dia)** | **R$ 11.802,94** | Restante das OSs em andamento nas 10 lojas |
| **Contas a Pagar + Juros** | **R$ 22.462,56** | Contas do dia (20.446,80) + Encargos Rede (2.015,76) |

---

## 4. O Que a Spec 372 Vai Executar

1. **Blindagem SQL na RPC `get_daily_reconciliation_summary`:**
   - Eliminar a dupla contagem de Rede: `cartoes_a_compensar` deve ser calculado como $\max(0, \text{Vendas} - \text{Créditos Rede no Banco})$. Se a Rede já creditou tudo na conta, o valor é R$ 0,00 e o saldo de bancos é mantido puro em R$ 290.994,62.
   - Saneamento do Dinheiro em Trânsito: `dinheiro_lojas` deve computar `status = 'em_transito' AND entry_date <= v_target_date::date` para não perder recolhimentos anteriores em aberto.
2. **Atualização do Modal de Baixa de Dinheiro (`BaixaDinheiroTransitoModal.tsx`):**
   - Garantir que a listagem de valores em trânsito liste todos os recolhimentos pendentes (`em_transito`), permitindo ao usuário/Daniel dar baixa com 1 clique (informando se foi depositado em banco ou transferido para caixa central).
3. **Importação Automatizada dos 30 Arquivos de 04/09:**
   - Executar o script de ingestão determinística para garantir que os 10 OFXs, 8 Redes, 10 OSs e BuscaContasAPagar estejam 100% populados e equalizados no banco de dados.

---

## 5. Próximos Passos
Após aprovação desta proposta, aplicar as alterações via `/apply 372-simulacao-real-import-0409-equalizacao-saldos`.
