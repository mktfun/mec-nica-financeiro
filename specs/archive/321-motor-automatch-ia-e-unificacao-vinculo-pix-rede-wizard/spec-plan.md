# Spec Plan: Inversão do Pipeline de Ingestão com Motor Automático + IA e Unificação do Vínculo Manual PIX & REDE (321)

## Tasks

- [x] [BACKEND] Criar migration com RPCs atômicas `public.link_manual_pix_to_os`, `public.link_manual_rede_to_os` e `public.unlink_manual_os_match`
- [x] [FRONTEND] Atualizar `useManualMatch.ts` para suportar vinculação de transações da Rede e PIX via novas RPCs
- [x] [FRONTEND] Atualizar `ManualMatchOsModal.tsx` para suportar tanto transações OFX (PIX) quanto REDE (Cartões)
- [x] [FRONTEND] Atualizar `CentralImportWizard.tsx` para gravar no banco e rodar auto-matches + IA antes da etapa manual
- [x] [FRONTEND] Atualizar `Step1UnregisteredPayments.tsx` para usar `ManualMatchOsModal` com isolamento por `store_id` e candidatos ordenados
- [x] [TEST] Executar Cenário 1: Validar execução das automações e IA antes da etapa manual
- [x] [TEST] Executar Cenário 2: Validar vínculo manual de PIX e REDE via modal com isolamento por filial
