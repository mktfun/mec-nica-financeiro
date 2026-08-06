# Proposal: Faturamento Baseado em Conciliação Real (OFX Vinculado) (092-fix-faturamento-math)

## Problema
Atualmente a tabela de conciliação tenta construir o Faturamento de forma teórica, somando expectativas (Maquininha e OS) ou completando buracos com variáveis residuais (Faturamento Outros). Como apontado pelo usuário, a matemática de conciliação não é uma soma de intenções, mas uma balança de verificação: Expectativa vs Realidade.

## Solução Proposta
A tabela sofrerá um "cavalo de pau" em seu conceito, passando a operar como uma verdadeira balança contábil.
1. **Maquininha (Expectativa 1)**: O valor líquido que a adquirente (Rede) diz que a loja tem a receber.
2. **PIX (Expectativa 2)**: O valor total de PIX que o sistema (Pátio OS) gerou para aquele dia.
3. **Faturamento (A Realidade)**: A soma exclusiva do dinheiro que pingou no OFX (`type = 'in'`) E que foi comprovadamente vinculado/conciliado a uma OS ou Maquininha (presente na tabela `conciliation_matches`).
4. **Diferença**: O validador final da balança. O cálculo será `(Maquininha + PIX) - Faturamento`.

Se a Diferença for R$ 0,00, significa que tudo que a maquininha e o sistema prometeram efetivamente caiu na conta e foi rastreado.

## Contratos de Dados
- Será feito um JOIN implícito/adição de query na tabela `conciliation_matches` no hook `useModulo1StoresData` para identificar quais `transactions` do OFX estão vinculadas.

## API / Interface
- `src/hooks/useConciliacao.ts`: O hook `useModulo1StoresData` exportará `pix_os_expected` (total de PIX gerado) e `faturamento_real_ofx` (total de entradas do OFX vinculadas).
- `src/routes/conciliacao.index.tsx` e `src/components/conciliacao/ResumoDiaPanel.tsx`: A matemática da Diferença será alterada para seguir o cálculo: `Diferença = (Maquininha + PIX) - Faturamento`. O residual `faturamento_outros` será fixado em 0.

## Risco Principal
Pode haver pequenas divergências de centavos em dias anteriores se os vínculos (`conciliation_matches`) não foram persistidos de maneira íntegra nas importações do passado, mas isso forçará a adoção da transparência e mostrará a saúde real do vínculo.
