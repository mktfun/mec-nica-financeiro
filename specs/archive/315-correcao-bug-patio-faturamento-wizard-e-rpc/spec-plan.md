# Spec Plan: Correção Emergencial do Pátio OS, Faturamento e Conciliação dos 5 Pilares no Wizard e RPCs (315)

## Tasks

- [ ] [BACKEND] Criar migration `20260831000001_fix_patio_os_filter_and_odometro_calculation.sql` com correção de `get_daily_reconciliation_summary` e `calculate_daily_conciliation`
- [ ] [BACKEND] Aplicar limpeza no banco corrigindo OSs com valores corrompidos em `patio_os`
- [ ] [FRONTEND] Atualizar `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx` para computar os 5 Pilares e DRE diretamente em memória
- [ ] [FRONTEND] Sincronizar `CentralImportWizard.tsx` para garantir persistência 1:1 de `daily_snapshots` com metadata completo
- [ ] [TEST] Executar teste E2E do Wizard validando Tela D com os 5 Pilares corretos e semáforo verde
- [ ] [TEST] Validar Cockpit `/conciliacao` para 28/08/2026 com diferença contábil $\le \pm \text{R\$} 50,00$
