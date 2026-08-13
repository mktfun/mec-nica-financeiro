# Design: Fix Wizard Stages Tracking (175)

## Arquitetura Técnica
Nenhuma mudança arquitetural. Apenas manipulação de estado React via `updateStage` sincronizada com as Promises.
Fluxo Sequencial:
1. Stage 0: `updateStage(0, 'running')` -> Process OSs -> `updateStage(0, 'success')`
2. Stage 1: `updateStage(1, 'running')` -> Process Rede -> Snapshot OSs -> `updateStage(1, 'success')`
3. Stage 2: `updateStage(2, 'running')` -> Process OFX -> `updateStage(2, 'success')`
4. Stage 3: `updateStage(3, 'running')` -> Batch Transactions -> Conciliação -> Daily Snapshot -> `updateStage(3, 'success')`

## Interfaces TypeScript
Mantém `INITIAL_STAGES` com tipagem `AgentStage[]`.

## Componentes / Hooks / Funções
- Componente afetado: `src/components/importacoes/CentralImportWizard.tsx`

## Fluxo de UI
1. O usuário vê as 4 bolinhas da UI em estado "pending" quando clica em importar (ou antes).
2. O agente processa passo a passo de forma linear, girando o spinner de uma etapa e marcando a anterior como concluída ("success", com check verde).
3. Todas as 4 etapas são completadas, e então a mensagem de "Lote Importado com Sucesso!" aparece.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Importar 1 extrato OFX e 1 arquivo de OS do Pátio → Wizard avança sequencialmente por todos os 4 estágios até que todos fiquem com a cor verde.
- **Cenário 2:** Alguma Promise lançar erro → O catch global do `handleConfirm` captura a exceção, encontra o `importStages` que estiver `running` e marca como `error`, destravando a UI.
