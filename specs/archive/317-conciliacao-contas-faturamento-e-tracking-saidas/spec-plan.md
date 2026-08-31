# Spec Plan: Conciliação de Contas, Faturamento com Aportes e Tracking de Saídas (Contas x Débitos OFX) (317)

## Tasks

- [x] [BACKEND] Criar migration `20260831000003_fix_faturamento_aportes_and_saidas_tracking.sql` adicionando colunas `contabilizar_no_subtotal` e chaves de match em `daily_manual_bills` e `ofx_transactions`
- [x] [BACKEND] Atualizar a RPC `get_daily_reconciliation_summary` para somar aportes de `ofx_transactions` em `v_faturamento_ajustes` e respeitar `contabilizar_no_subtotal`
- [x] [FRONTEND] Ajustar card `Faturamento do Dia` em `ResumoDiaPanel.tsx` para exibir `faturamento_periodo` total com sub-chips de base e aportes
- [x] [FRONTEND] Equalizar card `Contas (Manual)` em `ResumoDiaPanel.tsx` exibindo `contas_manual` consolidado (Base + Extras) e harmonizar com `subtotalContasCalculado`
- [x] [FRONTEND] Implementar a aba "Batimento de Saídas (Contas x Débitos OFX)" em `ContasManualModal.tsx` com toggle de `Contabilizar no Fechamento`
- [x] [TEST] Executar Cenário 1 (Faturamento com aporte de R$ 5.000) e verificar se o total e valor disponível sobem corretamente
- [x] [TEST] Executar Cenário 2 (Contas base R$ 46.394,05 + Extras R$ 5.000 + Juros R$ 3.932,35 = Subtotal R$ 55.326,40) e validar via Playwright
