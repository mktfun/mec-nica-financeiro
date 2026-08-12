# Design: Refatoração de UI/UX do Wizard e JSON Trail (172)

## Arquitetura Técnica
(Nenhuma mudança estrutural no Backend/API)
- `CentralImportWizard` (React Component) -> State: `importStages` -> Render `AgentStageItem`
- Remoção do gatilho automático de `setIsAgentModalOpen(true)` no método `onDrop`.
- Adição da função `generateJSONTrail` acoplada ao sucesso do `handleConfirm`.

## Componentes / Hooks / Funções
1. **`CentralImportWizard.tsx`**:
   - Modificado para inicializar `processFiles(pendingFiles)` diretamente no `onDrop` ou em um Step secundário, sem abrir modal.
   - Refatorar a visualização de Steps e do Dropzone (aplicar tailwind classes mais sofisticadas, backgrounds sútis, borders glow).
   - Refatorar o render do Step 4 (Salvamento) para não exibir a string box (text logs). Instanciar manualmente a cadeia visual `AgentStageItem` e atrelar os eventos de `addLog` a atualizações do array de stages.

2. **UI Auxiliar**:
   - Botão "Download JSON de Auditoria" usando o componente `<Button variant="secondary">` e um ícone `FileJson`.

## Fluxo de UI (Frontend)
Passo a passo da jornada do usuário atualizada:
- **Step 1 (Upload)**: Interface de upload muito mais limpa. Usuário arrasta arquivos. O processamento ocorre com um spinner na própria tela, indo imediatamente para a exibição dos resultados (Step 3/3.5). Sem janelas pop-up invasivas de "Robô".
- **Step 3 (Revisão)**: Usuário preenche as integrações ou inputs manuais. Clica em Avançar.
- **Step 4 (Salvamento Automático)**: A UI limpa a tela e exibe um painel central animado. Vários `AgentStageItem` aparecem listando as ações sendo feitas (ex: "Gravando OS do Pátio...", "Gravando Redes..."). Cada um ganha um spinner `loading`, e depois `completed`.
- **Step 5 (Sucesso)**: O painel brilha verde (Sucesso!). Um botão "Baixar JSON de Auditoria" aparece ao lado de "Ir para Conciliação". O usuário clica e baixa os dados completos de debugging.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1**: Upload manual de planilhas.
  - *Resultado esperado*: Arquivos são lidos e os totais vão direto pro Step 3 (Preview) sem renderizar o modal de Sincronização Nuvem.
- **Cenário 2**: Término do fluxo e Salvamento.
  - *Resultado esperado*: Os itens de salvamento piscam e processam com animação na página. Ao fim, botão para baixar JSON fica disponível. JSON gerado contém arrays preenchidos de OS, extratos e logs.
