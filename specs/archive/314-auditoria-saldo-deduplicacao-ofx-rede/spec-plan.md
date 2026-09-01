# Spec Plan: Auditoria de Integridade de Saldos, Deduplicação OFX Multi-Dias e Ciclo Rede (314)

## Tasks

- [x] [BACKEND] Criar migration 20260901000001_fix_bank_balances_ofx_and_rede_reconciliation.sql
  - [x] [BACKEND] Dropar trigger legada update_reconciliation_bank_total e função update_bank_total_from_transactions
  - [x] [BACKEND] Atualizar RPC get_store_pos_triple_reconciliation removendo hardcodes e calculando 
ao_entrou_valor dinâmico
  - [x] [BACKEND] Atualizar RPC get_dashboard_metrics alinhando com a fórmula canônica dos 5 Pilares e dedução de Cheque Especial
  - [x] [BACKEND] Aplicar migration no banco Supabase e verificar integridade
- [x] [PARSER] Corrigir atribuição de 	arget_date em CentralImportWizard.tsx para usar a data real <DTPOSTED> de cada transação OFX
- [x] [FRONTEND] Corrigir cálculo de saldo bancário em src/hooks/useConciliacao.ts (useModulo1StoresData) eliminando soma de 	ype === in
- [x] [FRONTEND] Alinhar cálculo de caixa_atual em src/lib/modulo1Calculations.ts e src/hooks/useDashboardV2.ts com dedução de Cheque Especial
- [x] [FRONTEND] Blindar upsert de 
econciliations em src/components/conciliacao/ResumoDiaPanel.tsx preservando ank_total
- [x] [TEST] Executar Cenário 1: Testar ingestão de extrato OFX multi-dias e validar partição de datas sem sobreposição
- [x] [TEST] Executar Cenário 2: Testar liquidação e cálculo de cartões a compensar sem dupla contagem
- [x] [TEST] Validar build (
pm run build) e consistência de tipos TypeScript
