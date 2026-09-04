# 📋 Proposta: Correção de Divergências de Saídas OFX por Filial (Kennedy e Santo André)

**Spec ID:** `370-correcao-divergencia-lojas-saidas-ofx`  
**Data:** 04/09/2026  
**Status:** Concluído / Aplicado  
**Área:** Conciliação Bancária / RPCs Postgres / Fechamento por Filial  

---

## 1. O Problema

Ao analisar os cards de fechamento por filial na tela principal de conciliação (`/conciliacao`), o usuário identificou divergências artificiais na linha de **SAÍDAS** de filiais que, na verdade, já estão devidamente tratadas na visualização analítica individual (`/conciliacao/:lojaId`):

### 1.1 Caso Kennedy - MP (`st-04`)
* **Sintoma:** O card exibe **Saídas OFX: R$ 6.429,95**, **Contas / Boletos: R$ 1.340,75** e **Dif. a Justificar: R$ 5.089,20** (Status: *Divergência* em vermelho).
* **Contradição:** Ao clicar e abrir a tela interna de Kennedy (`/conciliacao/st-04`), o extrato bancário exibe **100% Conciliado** com **0 pendências**!
* **Causa Raiz:** 
  1. Kennedy possui 8 débitos no OFX totalizando exatamente R$ 6.429,95.
  2. Na tabela `daily_manual_bills`, apenas 2 contas possuem `store_id = 'st-04'` (`FEMATH AUTO PEÇAS` de R$ 1.252,91 e `BANCO ITAÚ` de R$ 87,84 = R$ 1.340,75).
  3. As outras 6 contas correspondentes aos outros 6 débitos de Kennedy foram importadas com `store_id IS NULL` (despesas corporativas/matriz: `MP MASTER` 2.000 + 1.000 + 1.000, `SKY AUTOMOTIVE` 699,20, `DAVID DE OLIVEIRA SILVEIRA` 300,00 e `BROOOW TECNOLOGIA` 90,00 = **R$ 5.089,20**).
  4. Na tela interna da filial, o frontend executa o algoritmo fuzzy em memória `matchExpenseWithOfxDebit` puxando contas com `.or('store_id.eq.st-04,store_id.is.null')`. Ele pareia perfeitamente os 8 débitos com as 8 contas. Porém, **este pareamento nunca foi persistido no banco** (`ofx_transactions.matched_bill_id = NULL` e `daily_manual_bills.matched_ofx_id = NULL`).
  5. Na RPC Postgres `get_daily_reconciliation_summary`, a CTE `bills_store_agg` agrupa estritamente por `WHERE store_id = s.id`. Ela ignora qualquer conta onde `store_id IS NULL`, gerando a falsa divergência de R$ 5.089,20.

### 1.2 Caso Santo André - HD (`st-08`)
* **Sintoma:** O card exibe **Saídas OFX: R$ 12.944,29**, **Contas / Boletos: R$ 17.888,58** e **Dif. a Justificar: -R$ 4.944,29** (Status: *Divergência* em vermelho).
* **Contradição:** O usuário entrou no extrato da filial e justificou ambos os débitos como `Transferência Matriz` (R$ 4.944,29 e R$ 8.000,00). Todos os centavos saídos do banco foram explicados, mas o card gerou uma diferença negativa de quase R$ 5 mil!
* **Causa Raiz:** Dupla contagem matemática na RPC `get_daily_reconciliation_summary`. A RPC calcula:
  ```sql
  'contas_conciliadas', (COALESCE(bst.contas_loja_total, 0) + COALESCE(sofx.saidas_justificadas, 0)),
  'dif_saidas', (COALESCE(sofx.ofx_saidas_total, 0) - (COALESCE(bst.contas_loja_total, 0) + COALESCE(sofx.saidas_justificadas, 0)))
  ```
  Em Santo André:
  - `contas_loja_total` (boletos cadastrados na filial: Nova Daniel 4.594,29 + PH Imports 350,00) = **R$ 4.944,29**.
  - `saidas_justificadas` (débitos bancários justificados pelo usuário) = **R$ 12.944,29**.
  - A RPC somou cegamente ambos: `4.944,29 + 12.944,29 = R$ 17.888,58`!
  - E subtraiu de Saídas OFX: `12.944,29 - 17.888,58 = -R$ 4.944,29`!
  O débito bancário de 4.944,29 é uma remessa em lote (SISPAG) justamente para pagar aquelas contas! Ao somar as contas com as saídas justificadas, a RPC cobrou a mesma saída duas vezes.

### 1.3 Caso Planalto - BRASICAR (`st-06`)
* **Sintoma:** Saídas OFX R$ 5.270,00, Contas/Boletos R$ 10.270,00, Dif. a Justificar: **-R$ 5.000,00**.
* **Causa Raiz:** Mesma dupla contagem. 4 saques de R$ 5.000,00 justificados como despesa extra foram inseridos em `daily_manual_bills` E mantiveram `manual_category` em `ofx_transactions`. A RPC somou os R$ 5.000 duas vezes.

---

## 2. Solução Proposta

### 2.1 Sanear a Regra Contábil de Saídas na RPC `get_daily_reconciliation_summary`
A coluna **"Dif. a Justificar"** na linha de saídas do card deve responder à pergunta contábil elementar:
> *"Existem débitos no extrato bancário desta filial que ainda não foram conciliados (não pareados com boletos e nem justificados pelo gestor)?"*

1. **Débitos Órfãos (`saidas_orfas`):**
   Débitos no OFX da filial onde `matched_bill_id IS NULL AND manual_category IS NULL` (e sem pareamento válido com contas).
2. **Débitos Conciliados (`saidas_conciliadas`):**
   `ofx_saidas_total - saidas_orfas`.
3. **Diferença de Saídas a Justificar (`dif_saidas`):**
   $$\text{dif\_saidas} = \text{saidas\_orfas}$$
   - Se todos os débitos bancários foram pareados com contas ou justificados: `dif_saidas = 0` $\to$ **100% Conciliado** (Verde).
   - Se há um débito não tratado de R$ 270,00: `dif_saidas = 270,00` $\to$ **Débito Órfão** (Vermelho).
4. **Contas / Boletos (`contas_conciliadas`):**
   Deve exibir o total de saídas bancárias explicadas/cobertas (`ofx_saidas_total - saidas_orfas`), garantindo a equação visual límpida no card:
   $$\text{Saídas OFX} - \text{Contas Conciliadas} = \text{Dif. a Justificar}$$

### 2.2 Vínculo e Atribuição de Contas Corporativas (`store_id IS NULL`) à Loja Pagadora
1. Na CTE `bills_store_agg` da RPC, contas que tenham `store_id IS NULL`, mas cujo pagamento foi realizado por uma filial (`ot.matched_bill_id = b.id` ou `b.matched_ofx_id = ot.id`), devem ser agrupadas na filial pagadora (`ot.store_id`).
2. Executar migration / backfill determinístico para as 6 contas corporativas de Kennedy (`st-04`) do dia 04/09/2026, atribuindo `store_id = 'st-04'` e amarrando `matched_bill_id` e `matched_ofx_id`.

### 2.3 Persistência de Pareamento no Frontend (`StoreExtratoBancarioView.tsx`)
Quando o usuário abre a tela da loja e o matcher em memória identifica despesas correspondentes a débitos bancários (match com 90%+ de confiança), o sistema deve permitir persistir o vínculo no banco com 1 clique (ou sincronizar automaticamente ao salvar justificativas), evitando que o banco permaneça cego aos matches já validados na interface.

---

## 3. Contratos de Dados

### 3.1 RPC `get_daily_reconciliation_summary(p_date text, p_force_dynamic boolean)`
No retorno de cada loja em `stores` / `stores_detail`:
* `ofx_saidas_total`: Soma real dos débitos do OFX da filial (`type = 'out'`).
* `contas_loja_total`: Total das contas atribuídas à filial em `daily_manual_bills`.
* `saidas_justificadas`: Soma dos débitos justificados ou pareados.
* `saidas_orfas`: Soma dos débitos bancários sem qualquer vínculo ou categoria.
* `contas_conciliadas`: `ofx_saidas_total - saidas_orfas`.
* `dif_saidas`: `saidas_orfas`.
* `status`: `'approved'` se `ABS(dif_entradas) <= 0.05` E `ABS(dif_saidas) <= 0.05`, senão `'divergence'`.

---

## 4. Risco Principal e Mitigação

* **Risco:** Alterar `contas_loja_total` ou `subtotal_contas` afetar a DRE global do dia (`valor_disp_contas - subtotal_contas`).
* **Mitigação:** O DRE global apura `daily_manual_bills` globalmente (`WHERE date = v_target_date AND contabilizar_no_subtotal = true`), sem filtro de loja. Portanto, reatribuir o `store_id` das contas de Kennedy de `NULL` para `'st-04'` tem **impacto zero** na soma total global do DRE, sanando exclusivamente a visão analítica por filial.
