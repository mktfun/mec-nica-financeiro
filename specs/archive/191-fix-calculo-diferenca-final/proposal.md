# Proposal: fix-calculo-diferenca-final-e-expurgo-provisao (191)

## Problema
A Diferença Final da conciliação global está sendo calculada incorretamente em cenários onde o "Valor Disp. Contas" assume um valor nominal negativo.
Como a fórmula do fechamento calcula `Diferença Final = Valor Disp. Contas - Subtotal: Valor Contas`, o sistema subtrai uma despesa positiva de um saldo negativo, o que gera uma aberração dobrada (somando as magnitudes) ao invés de balancear o débito contra o crédito.
Além disso, o painel de conciliação diária exibe o rótulo "Juros (REDE) + Pagar + Provisão", embora o conceito de provisão tenha sido desencorajado/removido do núcleo.

## Solução Proposta
1. **Confronto de Sinais (Diferença Final):** Alterar a lógica matemática em `src/lib/modulo1Calculations.ts` para: `Diferença Final = ABS(Valor Disp. Contas) - Subtotal: Valor Contas`. Desta forma, o disponível sempre será tratado como a magnitude do fundo disponível (positivo) subtraído das despesas.
2. **Limpeza de Nomenclatura (Provisão):** Em `src/components/conciliacao/ResumoDiaPanel.tsx` e `modulo1Calculations.ts`, atualizar os comentários e os rótulos do Frontend. Alterar de "Juros (REDE) + Pagar + Provisão" para "Juros (REDE) + Contas (Manual)".

## Contratos de Dados
- **Interfaces Impactadas:** Nenhuma mudança na estrutura de dados enviada ou recebida do banco. Alteração estritamente de visualização e cálculo front-end/local.

## Risco Principal
- **Impacto:** O cálculo corrigido deve ser validado para garantir que, se "Valor Disp. Contas" for de fato um ganho, ele subtraia as despesas. E se for negativo originalmente, o uso do valor absoluto reverterá o sinal adequadamente.
- **Mitigação:** Trataremos o ABS() de modo que a diferença sempre exprima de forma clara: O quanto eu tenho vs O quanto eu preciso pagar.
