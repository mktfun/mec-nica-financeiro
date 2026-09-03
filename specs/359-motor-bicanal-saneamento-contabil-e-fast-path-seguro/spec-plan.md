# Spec Plan: Motor Bicanal, Saneamento Contábil e Fast-Path Seguro (359)

## Tasks

- [x] [FRONTEND] Corrigir o vício de `Math.abs` em `src/lib/modulo1Calculations.ts` (L60, L144, L178), aplicando subtração algébrica direta
- [x] [BACKEND] Criar migration `20260903000025_dual_channel_reconciliation_engine.sql` com RPC `get_daily_reconciliation_summary` bicanal (Tesouraria Real vs Balanço WIP com neutralização temporal $\Delta P_4$) e desativação do `LIMIT 1` cego na RPC `auto_match_daily_transactions`
- [x] [BACKEND] Aplicar migration 25 no Supabase headless e testar via script Node.js garantindo execução perfeita e retrocompatibilidade
- [x] [FRONTEND] Criar componente `src/components/importacoes/wizard/SmartResolutionStrip.tsx` para desambiguação rápida via teclado de colisões de auto-match
- [x] [FRONTEND] Integrar Gatekeeper do Fast-Path de 1-Clique em `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx` e `CentralImportWizard.tsx`, consumindo a SSOT da RPC
- [x] [TEST] Executar Cenário 1 (Validação de Déficit Sem `Math.abs`) e Cenário 2 (Teste de Não-Colisão de Auto-Match) via script de teste pericial
- [x] [TEST] Rodar `cmd.exe /c "npm run build"` garantindo compilação TypeScript limpa com Exit Code 0
