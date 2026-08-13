# Design: fix-calculo-diferenca-final-e-expurgo-provisao (191)

## Arquitetura Técnica
1. **Módulo de Cálculo (`src/lib/modulo1Calculations.ts`)**: 
   - Na função `calculateGlobalConciliacao`, a equação de fechamento diário será calibrada.
   - Atual: `const diferenca = valor_disp_contas - valor_contas;`
   - Modificado: `const diferenca = Math.abs(valor_disp_contas) - valor_contas;`
   - O comentário e tipagem residual de "provisão" serão retirados do escopo visual dessa fórmula para aderir à regra de negócio atual.

2. **Interface do Usuário (`src/components/conciliacao/ResumoDiaPanel.tsx`)**:
   - Apenas mutação de microcopy (strings) no card "Subtotal: Valor Contas".
   - A interface deixará de induzir o usuário ao erro procurando o campo extinto de provisão.

## Componentes / Hooks
- Função pura `calculateGlobalConciliacao`.
- Componente `ResumoDiaPanel`.

## Cenários de Verificação
- **Cenário 1:** `Valor Disp. Contas` = `-97894.38` e `Valor Contas` = `97899.23`.
  - Comportamento anterior: Diferença = `-195793.61`.
  - Novo comportamento: Diferença = `Math.abs(-97894.38) - 97899.23` = `97894.38 - 97899.23` = `-4.85`.
- **Cenário 2:** O texto no card "Subtotal: Valor Contas" diz "Juros (REDE) + Contas (Manual)".
