# Spec Plan: Motor Inteligente de Matching de Saídas OFX x Contas a Pagar e Sincronização Reativa (323)

## Tasks

- [ ] [BACKEND] Criar migration com RPC `public.auto_match_saidas` com motor heurístico de 4 camadas
- [ ] [FRONTEND] Adicionar chamada de `auto_match_saidas` no pipeline de ingestão de `CentralImportWizard.tsx`
- [ ] [FRONTEND] Atualizar `Step2NonRevenueJustifications.tsx` para carregar transações pendentes reativamente do Supabase
- [ ] [TEST] Executar Cenário 1: Auto-match em lote das 47 saídas de 2026-08-28 e verificar redução drástica de órfãos
- [ ] [TEST] Executar Cenário 2: Validação de idempotência e conferência no DRE
