# Spec Plan: Refatoração de UI/UX do Wizard e JSON Trail (172)

## Tasks

- [ ] [FRONTEND] Alterar `src/components/importacoes/CentralImportWizard.tsx` (Método `onDrop`): Remover `setIsAgentModalOpen(true)` e forçar a execução nativa de `processFiles(acceptedFiles)` imediatamente (com loader local simples).
- [ ] [FRONTEND] Criar interface `WizardSaveStage` para gerenciar os estados de saving no `CentralImportWizard` (id, title, status: 'pending'|'loading'|'completed'|'error').
- [ ] [FRONTEND] Refatorar a visualização de log textual na UI de Step 4 (Remover string text area e injetar mapeamento `importStages.map` usando o componente `AgentStageItem`).
- [ ] [FRONTEND] Modificar `handleConfirm` em `CentralImportWizard.tsx` para sincronizar os disparos dos endpoints/mutações com o array de states de UI, trocando `loading` por `completed` à medida que avançam as promises.
- [ ] [FRONTEND] Melhorar o Design do Dropzone e do cabeçalho de Wizard (Trocar bg flat por painéis modernizados com texturas visuais ou cards mais sofisticados).
- [ ] [FRONTEND] Adicionar método genérico `generateAuditTrail()` em `CentralImportWizard` que compila as states `results`, `manualDinheiroMp`, `manualAReceber`, etc., usa `JSON.stringify`, gera um Blob e aciona o download via link invisível.
- [ ] [FRONTEND] Na caixa de Sucesso do Step 5, renderizar o botão `<Button variant="secondary">Baixar Relatório (JSON)</Button>` que executa o `generateAuditTrail`.
- [ ] [TEST] Verificar no preview do vite (`npm run build`) se nenhuma interface foi quebrada pela falta do modal.
- [ ] [TEST] Garantir que o JSON salva arquivo na máquina ao fim de sucesso.
