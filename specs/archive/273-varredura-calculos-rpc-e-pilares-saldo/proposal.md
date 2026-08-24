# Proposal: Ajuste Matemático Estrito da RPC de Conciliação (Spec 273)

## Problema
1. **Omissão de Dinheiro no Cofre e Maquininhas no Card Principal de Saldo:**
   * No card `SALDO BANCOS + DINHEIRO` (`ResumoDiaPanel.tsx`), o valor principal exibia apenas o `saldo_bancos_ofx` (`R$ 61.456,10`), desconsiderando o `Dinheiro no Cofre` (`+ R$ 1.845,00`) e as `Maquininhas a Compensar` (`R$ 0,00`). O valor total do pilar é `R$ 63.301,10`.
2. **Omissão de Dinheiro no Cofre no Caixa Atual da RPC:**
   * A apuração de `Caixa Atual` na RPC `get_daily_reconciliation_summary` somava apenas `v_saldo_bancos + v_dinheiro_mp + v_a_receber + v_na_loja_os`, deixando de fora os `R$ 1.845,00` de dinheiro físico no cofre das lojas.
   * Isso gerava um descompasso no Fluxo de Caixa e no Valor Disponível de Contas.
3. **Preservação Absoluta dos Snapshots:**
   * Os dados salvos em `daily_snapshots` (inputs manuais do usuário) **NÃO serão alterados**. Toda a correção é realizada **exclusivamente dentro da RPC de cálculo dinâmico**, garantindo que a memória física do usuário permaneça intocada.

## Solução Proposta
1. **Ajuste Exclusivo na RPC `get_daily_reconciliation_summary`:**
   * `v_total_saldo_banco := v_saldo_bancos + v_dinheiro_em_lojas + v_cartoes_a_compensar;`
   * `v_caixa_atual := v_total_saldo_banco + v_dinheiro_mp + v_a_receber + v_na_loja_os;`
   * `v_fluxo_caixa := v_caixa_atual - v_caixa_anterior;`
   * `v_valor_disp_contas := v_faturamento_periodo - v_fluxo_caixa;`
   * `total_saldo_banco: v_total_saldo_banco` (retornado no JSON).
2. **Harmonização do Card 1 em `ResumoDiaPanel.tsx`:**
   * O valor principal do Card `SALDO BANCOS + DINHEIRO` passa a consumir `summary.total_saldo_banco` (R$ 63.301,10).

## Contratos de Dados
- **RPC `get_daily_reconciliation_summary`:**
  - `total_saldo_banco`: `numeric` (OFX + Dinheiro Cofre + Maquininhas a Compensar)
  - `caixa_atual`: `numeric` (Total Saldo Bancos + Dinheiro MP + A Receber + Na Loja OS)
  - `fluxo_caixa`: `numeric` (Caixa Atual - Caixa Anterior)
  - `valor_disp_contas`: `numeric` (Faturamento - Fluxo Caixa)

## Risco Principal
- Nenhum risco de perda ou alteração de dados, pois a tabela `daily_snapshots` não sofrerá mutações.
