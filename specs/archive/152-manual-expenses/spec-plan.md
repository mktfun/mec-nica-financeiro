# Spec Plan: Desacoplamento OFX Saídas vs Contas (152)

## Tasks

- [x] [FRONTEND] Atualizar `ResumoDiaPanel.tsx` para adicionar o estado local `manualContas` hidratado com `currentSnapshot?.contas_a_pagar`.
- [x] [FRONTEND] Atualizar `ResumoDiaPanel.tsx` para usar `manualContas` na constante `inputForCalculation.contas_a_pagar` em vez de `totalOfxOut`.
- [x] [FRONTEND] Atualizar `ResumoDiaPanel.tsx` para renderizar o grid item "Valor Contas" como um campo de input monetário, similar a "A Receber", desabilitado se `!isEditing`.
- [x] [FRONTEND] Atualizar `ResumoDiaPanel.tsx` para que a prop `totalOfxOut` (vinda de `useGlobalOfxOut`) seja ignorada pela matemática, mas ainda exiba o "Raio-X (Divergência OFX Saídas)" apenas como tooltip ou texto de apoio.
- [x] [TEST] Verificar cenário 1: Digitar um valor manual no campo "Valor Contas" e checar se o card "Diferença" e "Fluxo de Caixa" mudam imediatamente.
- [x] [TEST] Verificar cenário 2: Salvar o fechamento, mudar de dia, voltar para o mesmo dia e verificar se o valor digitado foi salvo e restaurado (hidratação correta).
