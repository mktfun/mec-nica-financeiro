# Design: fix-global-reconciliation-sum-and-keep-manual-inputs (193)

## Arquitetura Técnica
1. **Migration SQL (Correção do RPC `get_dashboard_metrics`)**:
   - A query `get_dashboard_metrics` será corrigida para não somar `maq.v + pix.v` como se fosse o saldo bancário global.
   - Ela voltará a fazer um `SELECT COALESCE(bank_total, 0)` da tabela `reconciliations` (via `recon` CTE) e o `v_total_saldo` global será a verdadeira consolidação (soma matemática simples) desses saldos cravados de cada loja.
   - O manual de `dinheiroMp` e `aReceber` na RPC ficará intocado.

2. **Migration SQL (Saneamento do Banco)**:
   - Para limpar os saldos absurdos das importações legadas, faremos:
     ```sql
     DELETE FROM dashboard_daily_logs WHERE date = '2026-08-11';
     DELETE FROM conciliation_daily_logs WHERE date = '2026-08-11';
     ```
   - Caso `reconciliations` de '2026-08-11' tenha as cifras não mitigadas da Jabaquara/Kennedy (ex: 39851900), faremos `DELETE FROM reconciliations WHERE date = '2026-08-11'` (forçando o recálculo via interface no refresh) OU aplicaremos a redução manual para refletir o saldo real (dividindo por 10 e depois 10 de novo na Jabaquara legada). É mais simples apagar o histórico diário da tela para o dia '2026-08-11' e deixar que a submissão via UI e o uso do parse atualizado gerem registros limpos.

## Cenários de Verificação
- **Cenário 1:** O painel inicial no dia 11/08/2026 renderizará o totalizador principal de `Saldo Banco Itaú` marcando exatos R$ 106.327,07 (que é a soma de DP: 13k + JAB: 39.8k + JB: 28.5k + K: 458 + etc).
- **Cenário 2:** Nenhum dado referente a Dinheiro MP ou A Receber foi multiplicado por erro no cálculo.
