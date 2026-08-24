# Proposal: Apuração Automática de Dinheiro no Cofre das Lojas por Janela Contábil (Spec 272)

## Problema
1. **Dinheiro no Cofre Zerado (`-`):** No modal de Raio-X dos Bancos (`SaldoBancosDetailModal.tsx`), o dinheiro no cofre aparecia zerado para todas as lojas, omitindo o dinheiro recebido na janela atual (ex: **R$ 1.845,00** da Dom Pedro, OS #586).
2. **Necessidade de Automação Total (Sem Intervenção Manual):**
   * O sistema deve identificar **SOZINHO**, de forma 100% automática, o que é dinheiro novo desta conciliação versus dinheiro de conciliações passadas.
   * Não deve exigir que o operador venha manualmente lembrar ou configurar quais OSs já tiveram baixa.

## Regra Automática de Janela Contábil (Single Source of Truth)
O sistema calcula a janela da conciliação atual automaticamente:
$$\text{Janela Atual} = (\text{Data do Último Fechamento Consolidado}, \text{Data Alvo}]$$
* **Exemplo para Segunda-feira (24/08/2026):**
  * Último Fechamento Consolidado: Sexta-feira (21/08/2026).
  * OSs com pagamento em dinheiro recebido ou finalizado **dentro da janela** (21/08 pós-fechamento até 24/08):
    * 🚗 **Dom Pedro (st-01):** OS #586 (R$ 1.845,00) $\rightarrow$ Entrou na janela $\rightarrow$ **Dinheiro no Cofre: R$ 1.845,00** (`status: 'em_transito'`).
  * OSs com pagamento em dinheiro de datas anteriores (ex: 18/08 Rudge R$ 1.900 e 20/08 Beretta R$ 2.988,26):
    * Foram finalizadas antes do último fechamento consolidado $\rightarrow$ O sistema classifica **automaticamente como já baixadas** (`status: 'depositado'`), sem duplicar saldo.

## Apuração de Maquininhas a Compensar
* Vendas em cartão da adquirente (Rede) passadas na maquininha da filial que ainda não caíram no extrato OFX Itaú daquela filial na data alvo figuram automaticamente na coluna `Maquininhas (Rede)` como **A Compensar**.

## Contratos de Dados
- **`store_cash_vault`:**
  - `id`: uuid
  - `store_id`: string
  - `amount`: numeric
  - `entry_date`: date
  - `status`: `'em_transito' | 'depositado'`
  - `os_number`: string
- **RPC `get_daily_reconciliation_summary`:**
  - Apuração automática de `dinheiro_loja` (apenas `em_transito`) e `nao_entrou_valor` (maquininhas a compensar).
  - Cálculo consolidado de `dinheiro_em_lojas` no header principal.

## Risco Principal
- Identificação precisa da data âncora do fechamento anterior para garantir que nenhuma OS da janela do fim de semana seja ignorada e nenhuma OS anterior seja duplicada.
