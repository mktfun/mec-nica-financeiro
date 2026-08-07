# Proposal: Correção da Matemática de Valor Disp. Contas e Diferença (Spec 143)

## Problema
A conta não fecha. O usuário alertou que o "Valor Disp. Contas" não bate. 
Analisando a fórmula (tanto no React `calculateGlobalConciliacao` quanto no SQL `get_dashboard_metrics`), descobri uma falha gravíssima na equação contábil:
O sistema estava somando o **Faturamento** com o **Fluxo de Caixa** para encontrar o "Valor Disp. Contas" e também estava somando o **Caixa Atual** com o **Fluxo de Caixa** na RPC do banco para achar a Diferença.

Na vida real, a conta de padaria para reconciliação é:
`Caixa Gerado (Fluxo) = Receitas (Faturamento) - Despesas (Contas)`
Logo:
`Despesas Esperadas = Receitas (Faturamento) - Caixa Gerado (Fluxo)`

## Solução Proposta
1. Corrigir `src/lib/modulo1Calculations.ts` para que `valor_disp_contas = faturamento - fluxo_cx`.
2. Corrigir o subtítulo na UI `ResumoDiaPanel.tsx` de "Faturamento + Fluxo de Caixa" para "Faturamento - Fluxo de Caixa".
3. Criar uma migration no Supabase `20260807000015_fix_diferenca_math.sql` corrigindo a anomalia bizarra de `v_diferenca := v_caixa_atual + v_fluxo_caixa;` na RPC `get_dashboard_metrics`, alinhando com a matemática correta: `v_diferenca := (v_faturamento_atual - v_faturamento_anterior) - v_fluxo_caixa - v_contas_a_pagar;`.
