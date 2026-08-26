# Proposal: Vinculação Correta de Dinheiro no Cofre e Saldo Consolidado por Filial (295)

## Problema
1. **Dinheiro no Cofre não aparece na filial correta na tabela detalhada:**
   - No card consolidado do topo ("SALDO BANCOS + DINHEIRO"), o sistema exibe corretamente `+ R$ 350,00` de Dinheiro no Cofre (totalizando R$ 52.914,85).
   - Porém, ao abrir o modal *"Ver Lojas ↗"* (`SaldoBancosDetailModal.tsx`), a coluna **"Dinheiro no Cofre / Loja"** exibe traço (`-`) em todas as 10 lojas e o rodapé totaliza `R$ 0,00`.
   - **Causa Raiz:** Na RPC `get_daily_reconciliation_summary`, no array `stores`, o campo `'dinheiro_loja'` estava hardcoded como `0` e não realizava o JOIN com a CTE `store_vault` (`store_cash_vault`).
2. **Saldo Consolidado por Loja Desalinhado:**
   - Na tabela do modal, a coluna "Saldo Consolidado" estava exibindo apenas o saldo do extrato OFX puro, sem somar o Dinheiro no Cofre e as Maquininhas a compensar daquela loja.
   - O rodapé da tabela exibia `R$ 30.188,72` em vez do total consolidado real de `R$ 52.914,85`.

## Solução Proposta
1. **Agregação de `store_cash_vault` por Loja no Backend:**
   - Na RPC `get_daily_reconciliation_summary`, criar a CTE `store_vault` agregando por `store_id` o valor de `dinheiro_loja` e a lista `vault_entries` para a data de corte.
   - Vincular cada loja ao seu respectivo cofre (ex: Santo André - HD `st-08` receberá os `R$ 350,00` em trânsito com o botão "Dar Baixa" ativo).
2. **Cálculo Canônico do Saldo Consolidado por Filial:**
   - Para cada loja: `saldo_banco := saldo_banco_ofx + dinheiro_loja + nao_entrou_valor`.
   - Exemplo Dom Pedro: `-R$ 1.165,43 (OFX) + R$ 5.884,23 (Maquininha) = +R$ 4.718,80 (Consolidado)`.
   - Exemplo Santo André: `-R$ 12.311,55 (OFX) + R$ 350,00 (Dinheiro) + R$ 213,77 (Maquininha) = -R$ 11.747,78 (Consolidado)`.
   - O total do rodapé da tabela baterá $100\%$ com o card do topo: **R$ 52.914,85**.

## Contratos de Dados & Backend
- **Tabela:** `store_cash_vault`.
- **RPC:** `get_daily_reconciliation_summary`.
- **Componente:** `src/components/conciliacao/SaldoBancosDetailModal.tsx`.

## Risco Principal
- **Risco:** Desalinhamento temporal entre a data do lançamento no cofre e a data de depósito bancário.
- **Mitigação:** Utilizar o mesmo filtro temporal canônico (`entry_date <= target_date AND (status IN ('em_transito', 'pending') OR deposited_at > target_date)`).
