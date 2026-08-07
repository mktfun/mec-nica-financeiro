# Design: Correção de Matemática (Diferença)

## Front-End
Em `src/lib/modulo1Calculations.ts`, alteraremos a linha 35 de:
`const valor_disp_contas = faturamento + fluxo_cx;`
Para:
`const valor_disp_contas = faturamento - fluxo_cx;`

Em `src/components/conciliacao/ResumoDiaPanel.tsx`:
Substituir o texto literal "Faturamento + Fluxo de Caixa" por "Faturamento - Fluxo de Caixa".

## Back-End
Criar a migration `20260807000015_fix_diferenca_math.sql` que dá REPLACE FUNCTION em `get_dashboard_metrics(p_date date)`.
Localizar e modificar a equação de `v_diferenca`:
De:
`v_diferenca := v_caixa_atual + v_fluxo_caixa;`
Para:
`v_diferenca := (v_faturamento_atual - v_faturamento_anterior) - v_fluxo_caixa - v_contas_a_pagar;`
(Que é exatamente a transposição de `valor_disp_contas - valor_contas`).
