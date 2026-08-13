# Proposal: Fix Wizard Stages Tracking (175)

## Problema
Durante a execução do import no `CentralImportWizard.tsx`, a interface visual (as bolinhas animadas de progresso baseadas em `INITIAL_STAGES`) fica travada, e não reflete corretamente as etapas executadas. O processo todo roda no backend com sucesso ("Lote Importado com Sucesso!"), mas a UI permanece em estados inconsistentes (ex: Stage 3 pendente, Stage 2 rodando infinitamente).

Isso ocorre porque os índices usados nas chamadas da função `updateStage(index, status)` no bloco `handleConfirm` não estão sincronizados com a constante `INITIAL_STAGES` e várias atualizações de progresso (incluindo todo o fluxo do OFX e gravação no banco) ainda estão usando apenas logs textuais `addLog` em vez de atualizarem os stages visuais.

## Solução Proposta
1. Reordenar a constante `INITIAL_STAGES` para refletir a ordem exata de execução do código, para que o usuário veja a UI avançar de cima para baixo corretamente:
   - 0: Importando OS do pátio
   - 1: Lendo maquininha / Rede
   - 2: Processando extratos OFX
   - 3: Salvando conciliação no banco
2. Varrer toda a função `handleConfirm` e inserir chamadas `updateStage(index, status)` em cada bloco chave, garantindo que todo estágio comece com `running` e termine com `success` (ou erro) antes do próximo iniciar.
3. Assegurar que o sub-step de "Gerando snapshot de OSs" seja atrelado ao Stage correto e finalizado de forma apropriada.

## Contratos de Dados
- Não há mudanças de banco de dados, tabelas ou RPCs.
- Alteração puramente no gerenciamento do React state local de `importStages`.

## API / Interface
- `CentralImportWizard.tsx`: Constante `INITIAL_STAGES` terá os itens reordenados.
- Chamadas dentro de `handleConfirm` serão corrigidas:
  - `updateStage(0, ...)` para OSs
  - `updateStage(1, ...)` para Maquininha/Rede
  - `updateStage(2, ...)` para OFX
  - `updateStage(3, ...)` para Banco/Transações e Snaphsot Diário

## Features Existentes Impactadas
- Redesign Central Import Wizard (Feature 174): Essa proposta consolida e conserta o feedback visual implementado na feature 174.

## Risco Principal
**Probabilidade:** Baixa
**Impacto:** Reversível
O maior risco é a interface travar novamente em "running" caso o código lance um erro interno e caia no `catch` final de `handleConfirm` sem marcar os estágios restantes como erro. 
**Mitigação:** No bloco `catch (error)` global dentro do `handleConfirm`, devemos forçar a falha do último estágio que estiver `running` e parar a execução de forma controlada.
