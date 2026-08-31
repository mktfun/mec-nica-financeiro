# Spec Plan: Correção do Caixa Atual, Fluxo Contábil e Paridade dos 5 Pilares na RPC de Conciliação (319)

## Tasks

- [x] [BACKEND] Atualizar RPC `get_daily_reconciliation_summary` para computar compulsoriamente `v_caixa_atual := (v_total_saldo_banco_positivo + v_dinheiro_mp + v_a_receber + v_na_loja_os) - v_saldo_negativo_itau` no Ramal 1 e Ramal 2
- [x] [BACKEND] Atualizar snapshot de 31/08/2026 em `daily_snapshots` com `caixa_atual = 294978.56` e `total_patio = 51054.86`
- [x] [BACKEND] Sincronizar `get_dashboard_metrics` com a mesma fórmula dos 5 pilares
- [x] [FRONTEND] Adaptar `ResumoDiaPanel.tsx` para derivar `caixaAtual` compulsoriamente a partir da soma dos 4 pilares menos o cheque especial
- [x] [TEST] Executar Cenário 1 e validar via script RPC e Playwright que Caixa Atual exibe R$ 294.978,56 e Fluxo de Caixa exibe +R$ 2.350,41
- [x] [TEST] Executar Cenário 2 e validar persistência em `daily_snapshots` sem divergência
