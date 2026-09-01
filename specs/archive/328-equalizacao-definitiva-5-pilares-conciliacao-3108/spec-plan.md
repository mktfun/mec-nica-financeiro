# Spec Plan: Equalização Definitiva dos 5 Pilares e Fechamento Canônico de 31/08/2026 (Spec 328)

## Tasks

- [x] [BACKEND] Criar migration `20260831000011_spec_328_forensic_reconciliation_3108.sql` com saneamento de pátio, aporte, pró-labore e nova RPC
- [x] [BACKEND] Aplicar migration no Supabase via Service Role Key
- [x] [FRONTEND] Atualizar `src/hooks/useBackendConciliacao.ts` com tipagens completas
- [x] [FRONTEND] Atualizar `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx` com refetch compulsório e exibição fiel de +R$ 8,94
- [x] [FRONTEND] Atualizar `src/components/conciliacao/SaldoBancosDetailModal.tsx` com 5 Header Cards segregados
- [x] [FRONTEND] Atualizar `src/components/conciliacao/ResumoDiaPanel.tsx` para paridade visual
- [x] [TEST] Validar retorno exato da RPC no Supabase para 31/08/2026 (+R$ 8,94)
- [x] [TEST] Executar build de produção (`npm run build`) e capturar screenshot com Playwright
