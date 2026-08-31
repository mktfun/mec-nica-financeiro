# Spec Plan: Alinhamento Integral dos 5 Pilares e Erradicação das Divergências de Conciliação (Spec 327)

## Tasks

- [x] [BACKEND] Criar migration `20260831000010_align_5_pillars_and_intra_store_offset.sql` com a nova RPC canônica `get_daily_reconciliation_summary`
- [x] [BACKEND] Aplicar a migration no Supabase via script seguro com Service Role Key
- [x] [FRONTEND] Atualizar `src/hooks/useBackendConciliacao.ts` com os novos campos tipados (`saldo_devedor_real`, `saldo_positivo_real`, `total_saldo_banco_positivo`, `total_saldo_banco_negativo`)
- [x] [FRONTEND] Adaptar `src/components/conciliacao/SaldoBancosDetailModal.tsx` para exibir os 5 cards com compensação intra-loja
- [x] [FRONTEND] Atualizar `src/components/conciliacao/ResumoDiaPanel.tsx` para calcular DRE com Faturamento Total (R$ 60.420,95), Subtotal Contas (R$ 57.496,14) e Diferença Final de R$ 8,94
- [x] [FRONTEND] Atualizar `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx` para paridade com a tela principal de conciliação
- [x] [TEST] Executar teste de carga dos 10 extratos e validar apuração matemática exata do dia 31/08/2026
- [x] [TEST] Validar build de produção (`npm run build`) e capturar screenshot com Playwright
