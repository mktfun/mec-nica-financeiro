# Spec Plan: Bifurcação Inicial da Central de Fechamento — Modo Manual Passo a Passo (Sem IA) vs Modo Conversacional Hydra (Com IA) (361)

## Tasks

- [x] [CLEANUP] Remover o banner espúrio *"Virada de Mês / OCR e Carro"* de `CentralImportWizard.tsx` (linhas 2193 a 2219)
- [x] [BACKEND] Criar migration `20260903000027_reconciliation_pipeline_sessions.sql` com tabela de sessões e RLS
- [x] [BACKEND] Implementar RPCs: `get_pipeline_session_state`, `save_pipeline_step_progress` e `match_stage2_rede_os` (100% determinísticas sem IA)
- [x] [FRONTEND] Criar componente `FechamentoModeSelector.tsx` em `src/components/importacoes/bifurcacao/` com Date Picker e 2 Cards de Modalidade
- [x] [FRONTEND] Criar container `FechamentoManualWizard.tsx` em `src/components/importacoes/manual/` com Stepper das 4 Fases (ZERO IA)
- [x] [FRONTEND] Implementar `Fase1PatioOsReview.tsx` (Dropzone exclusiva de OSs + embed de `PatioExcelStoreAccordion.tsx` com ajuste de OS manual 1 a 1)
- [x] [FRONTEND] Implementar `Fase2RedeVsOsReview.tsx` (Dropzone exclusiva de Rede + batimento imediato com OSs + tabela de sobras + `SmartResolutionStrip.tsx`)
- [x] [FRONTEND] Implementar `Fase3OfxReconciliation.tsx` (Dropzone exclusiva de 10 OFX + batimento PIX x OS + apuração de lotes Rede que entraram vs a compensar)
- [x] [FRONTEND] Implementar `Fase4ContasVsSaidasReview.tsx` (Dropzone exclusiva de Contas + batimento saídas + receitas extras com `RevenueAdjustmentsCard.tsx` + selagem do dia)
- [x] [FRONTEND] Adaptar `src/routes/importacoes.tsx` para chaveamento entre `FechamentoModeSelector`, `FechamentoManualWizard` e `ReconciliationChatWorkspace`
- [x] [FRONTEND] Adaptar `ReconciliationChatWorkspace.tsx` com botão `[ ↩ Voltar para Escolha de Modo ]`
- [x] [TEST] Executar Cenário 1: Fechamento Manual Completo em 4 fases (ZERO IA) com upload sequencial, conferência loja a loja e selagem
- [x] [TEST] Executar Cenário 2: Escolha do Modo Conversacional Hydra, interação no chat com proposta inline e retorno ao seletor
