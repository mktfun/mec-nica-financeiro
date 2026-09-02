# Spec Plan: Persistência Atômica de OSs OCR, Botão Único no Step 3 e Herança de Dinheiro MP (Feature 348)

## Tasks

- [x] [BACKEND/PERSISTENCE] No `handleSaveAndAdvanceOcr` do `CentralImportWizard.tsx`, acionar a persistência imediata de `patio_os`, `receivables` e `store_cash_vault` via `savePatioOsAndReceivables` e executar `auto_match_daily_transactions`
- [x] [FRONTEND] No `CentralImportWizard.tsx`, integrar a herança automática do `previousSnapshot.dinheiro_mp` no estado `manualDinheiroMp` com proteção contra sobrescrita manual
- [x] [FRONTEND] No Step 3 do `CentralImportWizard.tsx`, exibir a badge `Saldo de ontem: R$ ...` no card de Dinheiro MP e uniformizar o alinhamento visual dos 4 inputs manuais (Dark Zinc-950)
- [x] [FRONTEND] No rodapé do Step 3, remover o botão concorrente "Gravar Direto (sem Wizard)" e unificar em UM ÚNICO botão de ação primário: `Processar e Avançar Conciliação →`
- [x] [TEST] Executar teste Playwright validando a persistência de OSs no banco no Step 1.5, o preenchimento automático do Dinheiro MP e o clique no botão único avançando para o Step 4
- [x] [VERIFY] Executar `npm run build` garantindo zero erros de compilação
