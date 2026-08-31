# Spec Plan: Wizard Onboarding Pós-Matching — Revisão de Órfãos e Validação de Diferença Final (324)

## Tasks

- [x] [FRONTEND] Atualizar `src/components/importacoes/wizard/Step1UnregisteredPayments.tsx` para suporte a lista vazia graciosa com badge de sucesso e botão de avançar sempre ativo
- [x] [FRONTEND] Refatorar `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx` para atuar como Painel de Validação e Pré-Fechamento (consumo direto da RPC `useDailyReconciliationSummary`, semáforo dos 5 pilares, botão "Recalcular" e botão "Conciliar e Selar o Dia")
- [x] [FRONTEND] Atualizar `src/components/importacoes/CentralImportWizard.tsx` com auto-avanço garantido pós-gravação (Step 8 -> Step 4), remoção de pulos indevidos de tela, navegação fluida bidirecional (Voltar/Avançar) e redirecionamento final para `/conciliacao`
- [x] [TEST] Executar Cenário 1: Fluxo de onboarding pós-matching com revisão de PIX/Rede órfãos, justificativas de saídas, cofre e validação de diferença no Step 7
- [x] [TEST] Executar Cenário 2: Validação de retorno para correção, recálculo em tempo real do semáforo da Diferença Final e fechamento definitivo com `npm run build` limpo
