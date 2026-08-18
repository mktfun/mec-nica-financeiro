# Proposal: Correção do Dashboard, Gráfico de Evolução Macro e Métricas por Loja (227)

## Diagnóstico Completo dos Problemas Apontados no Dashboard

1. **Tabela "Resultado por Loja" com Saldo Bancário R$ 0 e Pátio zerado:**
   - **Causa Raiz:** O hook `useBackendDashboard.ts` mapeava `saldoAtual = s.saldo_banco` e `veiculosPatio = s.veiculos_patio`. No entanto, a RPC do Supabase devolvia as chaves `saldoAtual`, `veiculosPatio` e `veiculosPatioValor`. Com a divergência de chave, o frontend sobrescrevia os valores válidos com `0`.
   - **Solução:** Normalizar o mapeamento para aceitar fallback duplo (`s.saldoAtual ?? s.saldo_banco`), restaurando os R$ 186.496,03 de saldo distribuídos nas 10 lojas e os 33 veículos (R$ 92.746,71) de pátio.

2. **Gráfico de Evolução Macro quebrado ("0 dias processados / Sem dados para este mês"):**
   - **Causa Raiz:** A RPC `get_dashboard_metrics` retornava `historicoMacro: []` vazio.
   - **Solução:** Em `useBackendDashboard.ts`, consultar diretamente a tabela `daily_snapshots` ordenada por data no mês atual, gerando os pontos da série temporal de Saldo Bancário, Faturamento Odômetro e Contas a Pagar (ex: 14/08 e 17/08).

3. **Discrepância no Card de Faturamento (Atual vs Anterior):**
   - **Causa Raiz:** O card comparava o Faturamento incremental diário com o Odômetro acumulado de 496k do Marco Zero, gerando distorções grosseiras.
   - **Solução:**
     - Exibir no card:
       - **Faturamento Odômetro Acumulado:** `R$ 592.969,88` (Atual) vs `R$ 496.797,82` (Marco Zero).
       - **Faturamento Incremental do Período:** `+R$ 96.172,06` (+19.4% de avanço).
       - Ou opção de alternar com Faturamento Diário Operacional das Lojas (`R$ 70.820,43` / `R$ 168.497,81`).

4. **Card de Diferença Final no Topo:**
   - **Causa Raiz:** O card exibia uma diferença bruta residual sem abater as conciliações.
   - **Solução:** Sincronizar com `summary.diferenca_final` da conciliação oficial.
