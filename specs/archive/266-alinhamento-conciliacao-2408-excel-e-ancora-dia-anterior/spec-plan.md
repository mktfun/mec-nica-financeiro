# Spec Plan: Alinhamento da Conciliação 24/08 com Excel Oficial, Âncora do Dia Anterior (21/08) e Fallbacks (266)

## Tasks

- [x] [BACKEND] Atualizar snapshot do dia 21/08 no banco: `caixa_atual = 150600.29`, `faturamento = 746804.77`
- [x] [BACKEND] Atualizar snapshot do dia 24/08 no banco com todos os valores oficiais do Excel (Saldo Positivo 102.999,61, Negativo Itaú 39.498,51, Dinheiro MP 13.278,00, A Receber 10.694,50, Pátio 88.212,39, Caixa Atual 175.685,99, Odômetro 817.526,33, Contas Base 29.999,51, Juros Rede 5.650,15, Sucatas 90,00)
- [x] [BACKEND] Atualizar item de pró-labore em `daily_manual_bills` para R$ 10.070,00 (conforme Excel)
- [x] [BACKEND] Inserir ajustes de faturamento em `daily_revenue_adjustments`: Sucata HD (R$ 60,00) e Sucata JB (R$ 30,00)
- [x] [BACKEND] Criar migration atualizando a RPC `get_daily_reconciliation_summary` para buscar o último snapshot consolidado anterior com `caixa_atual > 0`
- [x] [FRONTEND] Atualizar `src/hooks/useDailySnapshot.ts` (`usePreviousDaySnapshot`) com filtro `.gt('caixa_atual', 0)`
- [x] [TEST] Testar chamada da RPC `get_daily_reconciliation_summary('2026-08-24')` e verificar que `diferenca_final` é `+R$ 6,20` e `caixa_anterior` é `R$ 150.600,29`
- [x] [TEST] Executar `npm run build` para garantir integridade do build
