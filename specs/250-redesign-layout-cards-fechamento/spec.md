# Spec 250: Conciliação Estrita de Maquininhas & Redesign de Cards do Fechamento

---

## 1. 🎯 Visão Geral e Contexto

Esta especificação resolve dois problemas centrais na tela de Conciliação Diária:
1. **Regra Contábil de Maquininhas (Zero Falso Positivo):** Elimina a duplicação indevida de saldo onde valores da Rede que já haviam caído no extrato bancário (inclusive em contas cruzadas entre filiais) eram marcados como "não entrou", somando duas vezes o mesmo valor.
2. **Harmonização Visual da Grade de Métricas:**
   * Transforma o card de Saldo Bancos em um componente **horizontal e amplo (`col-span-2`)**, exibindo as sub-métricas de OFX e Cofre lado a lado em vez de empilhadas verticalmente.
   * Move o card **Contas (Manual)** da linha de ativos para a seção de **Consolidação do Dia**, organizando o fluxo contábil de apuração.

---

## 2. 🏛️ Arquitetura e Modelagem de Dados

### A. Validação de Maquininhas no PostgreSQL (`get_daily_reconciliation_summary`)
* **Entrada:** `p_date text` (Data da conciliação).
* **Regra Determinística:**
  $$\text{nao\_entrou\_valor} = \max(0, \text{Rede Líquido} - \text{Total Creditado no OFX})$$
* Se $\text{OFX Creditado} \ge \text{Rede Líquido} - \text{Tolerância}$, o status da filial é `entrou` e $\text{nao\_entrou\_valor} = 0$.
* A variável consolidada `cartoes_a_compensar` é $0$ em dias onde todos os créditos já ocorreram no banco.

---

## 3. 🎨 Estrutura do Layout da Interface (`ResumoDiaPanel.tsx`)

### A. Linha Superior: Grid de 4 Pilares de Patrimônio (Caixa Atual)
* **Card 1: Saldo Bancos + Cofre (`col-span-2`):**
  * Topo: `R$ 26.503,63` | Link `Ver Lojas ↗`.
  * Base horizontal:
    * `[Extrato OFX: R$ 24.603,63]` | `[Dinheiro no Cofre: + R$ 1.900,00]` | `[A Compensar (se > 0)]`
* **Card 2: Dinheiro MP (`col-span-1`):** `R$ 8.466,00`
* **Card 3: A Receber (`col-span-1`):** `R$ 10.694,50`
* **Card 4: Na Loja OS (`col-span-1`):** `R$ 103.023,72` | Link `Ver OSs ↗`

### B. Seção Inferior: Consolidação do Dia & Diferença Final
* **Grid da Consolidação (Esquerda - 2/3):**
  1. `Caixa Atual`: `R$ 148.687,35`
  2. `Caixa Anterior`: `R$ 271.922,90`
  3. `Fluxo de Caixa`: `-R$ 123.235,55`
  4. `Faturamento do Dia`: `R$ 76.858,12` | Link `Ver Detalhes ↗`
  5. `Contas a Pagar (Manual)`: `R$ 195.066,04` | Link `Ver Contas ↗`
  6. Subtotal de Batimento: `Valor Disp. Contas` vs `Subtotal Contas`
* **Card de Destaque (Direita - 1/3):**
  * `Diferença Final`: `-R$ 0,72` com badge de status aprovado dentro da tolerância.
