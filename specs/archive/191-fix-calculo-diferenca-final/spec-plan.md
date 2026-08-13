# Spec Plan: fix-calculo-diferenca-final-e-expurgo-provisao (191)

## Tasks

- [x] [FRONTEND] Em `src/lib/modulo1Calculations.ts`, na função `calculateGlobalConciliacao`, alterar a fórmula `const diferenca = valor_disp_contas - valor_contas;` para `const diferenca = Math.abs(valor_disp_contas) - valor_contas;`.
- [x] [FRONTEND] Em `src/lib/modulo1Calculations.ts`, atualizar os comentários da variável `valor_contas` removendo " + provisão".
- [x] [FRONTEND] Em `src/components/conciliacao/ResumoDiaPanel.tsx`, localizar o texto "Juros (REDE) + Pagar + Provisão" e alterar para "Juros (REDE) + Contas (Manual)".
- [x] [TEST] Verificar no console ou visualmente se a diferença final de um caixa negativo descontando contas se torna próxima de 0 ao invés de duplicar o débito.
