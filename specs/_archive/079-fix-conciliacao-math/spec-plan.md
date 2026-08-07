# Spec Plan: Fix Global Reconciliation & Manual Overrides

- `[ ]` 1. Atualizar schema/tipagem de `daily_snapshots` para incluir `contas_a_pagar_manual` (opcional).
- `[ ]` 2. Modificar `CentralImportWizard.tsx` para adicionar o `Input` de Contas a Pagar Manual na etapa 4 (Valores Manuais do Dia).
- `[ ]` 3. O valor padrão de Contas a Pagar Manual no UI de Importação deve vir do `totalOfxOut` subtraindo as tarifas conhecidas de maquininha, para servir de baliza para o usuário (exibindo os ~114k iniciais para que o usuário possa digitar 106k por cima).
- `[ ]` 4. Passar o valor digitado no Wizard para a gravação final do Snapshot, salvando como `contas_a_pagar_manual`.
- `[ ]` 5. No `useConciliacao.ts`, priorizar o uso do `currentSnapshot.contas_a_pagar_manual` sobre o cálculo cru do OFX, refletindo o número exato desejado pelo usuário (106k).
- `[ ]` 6. Modificar `ResumoDiaPanel.tsx` para que a prop `na_loja_os` em `inputForCalculation` use o `Object.values(storesData).reduce(...)` em vez de `currentSnapshot?.total_patio`.
- `[ ]` 7. Validar visualmente as matemáticas do Fluxo de Caixa, Valor Disp. Contas e Diferença Final para assegurar aderência.
