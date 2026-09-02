# Spec Plan: Conciliação Canônica Pericial de 01/09/2026 (342)

## Tasks

- [x] [BACKEND] Criar script e migration de sincronização pericial para o dia `2026-09-01` sincronizando as 54 OSs em `patio_os` (R$ 57.780,63), despesas em `daily_manual_bills` (R$ 7.072,24) e ajustes de faturamento em `daily_revenue_adjustments` (R$ 112.271,48)
- [x] [BACKEND] Atualizar snapshot de 01/09/2026 em `daily_snapshots` com `caixa_anterior = 295344.02`, `dinheiro_mp = 24955.00`, `a_receber_manual = 8049.67` e odômetro base de `R$ 54.853,00`
- [x] [BACKEND] Executar a RPC `get_daily_reconciliation_summary('2026-09-01')` e validar que `caixa_atual = 416454.73`, `fluxo_caixa = 121110.71`, `faturamento = 167124.48`, `contas = 46013.65` e `diferenca_final = 0.12`
- [x] [TEST] Executar build gate (`npm run build`) com 0 erros
- [x] [TEST] Validar no frontend a conciliação diária de 01/09/2026 com os 5 pilares e DRE aprovados com sobra de R$ 0,12
