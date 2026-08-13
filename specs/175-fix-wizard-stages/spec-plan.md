# Spec Plan: Fix Wizard Stages Tracking (175)

## Tasks

- [x] [FRONTEND] Abrir `CentralImportWizard.tsx` e reordenar o array de `INITIAL_STAGES` na ordem exata da execução: 1. OS do pátio, 2. Lendo maquininha / Rede, 3. Processando extratos OFX, 4. Salvando conciliação no banco.
- [x] [FRONTEND] Ajustar na função `handleConfirm` a chamada `updateStage(0, ...)` para acompanhar as Promises de "OSs do Pátio" (linha 308).
- [x] [FRONTEND] Ajustar a chamada `updateStage(1, ...)` para acompanhar as Promises de "Rede e Maquininhas" (linha 341). Finalizar com `updateStage(0, 'success')` e `updateStage(1, 'success')`. O snapshot na loja OS pode ficar como subStep da etapa 1.
- [x] [FRONTEND] Adicionar `updateStage(2, 'running', ...)` e `updateStage(2, 'success')` em torno do processo de conciliação e tratamento dos Extratos OFX.
- [x] [FRONTEND] Adicionar `updateStage(3, 'running', ...)` para a gravação no banco (`createImportBatch`, `saveTransactions`, `insertConciliationMatches`, Snapshot diário).
- [x] [FRONTEND] Adicionar `updateStage(3, 'success', ...)` logo antes do `setSaveFinished(true)`.
- [x] [FRONTEND] Envolver o conteúdo de `handleConfirm` em um `try / catch` mestre que pegue erros genéricos, encontre se algum stage está `running` na variável de state `importStages` local (usando função pura ou callback) e atualize a etapa atual para `error`, para não travar a UI de loading em caso de quebra silenciosa no script (como um network error no banco).
- [x] [TEST] Verificar cenário 1: Executar fluxo sem rede para confirmar falha controlada na UI.
- [x] [TEST] Verificar cenário 2: Confirmar UI rodando estágios de 0 a 3 sequencialmente em um mock normal.
