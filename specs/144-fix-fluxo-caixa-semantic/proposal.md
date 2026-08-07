# Proposal: Fluxo de Caixa Semântico e Diferença (Spec 144)

## Contexto e Problema
O usuário identificou que o modelo mental do dashboard divergia da contabilidade prática de sua oficina.
1. O termo "Fluxo de Caixa" foi implementado como uma variável de variação (Caixa Atual - Caixa Anterior). Contudo, na regra de negócio da oficina, **Fluxo de Caixa significa literalmente o "Caixa Anterior" (o saldo total fechado da conciliação do dia anterior)**.
2. Com isso, o cálculo da Diferença Final deve ser: `Caixa Atual - (Caixa Anterior + Faturamento - Valor Contas)`. 
3. O usuário levantou a dúvida se as despesas OFX estavam sendo incluídas em "Valor Contas" (onde aparecia apenas 739,55). Confirmamos que esse valor **é** exatamente a soma de despesas do OFX. (A parcela de Juros Rede local está zerada).
4. O usuário mencionou ter importado de 04 a 07 para ter histórico. No entanto, o `Caixa Anterior` estava zerado no print. O motivo técnico é que a importação bruta não salva snapshots de conciliação. Para que o dia 07 enxergue o Caixa do dia 06, é obrigatório clicar em "Gravar Fechamento Diário" na tela do dia 06.

## Solução Proposta
1. **Frontend (`modulo1Calculations.ts` & `ResumoDiaPanel.tsx`)**:
   - Renomear logicamente e visualmente o "Fluxo de Caixa" para refletir e exibir apenas o `caixa_anterior`.
   - Modificar a fórmula do `valor_disp_contas` para `Faturamento + Caixa Anterior`.
   - Modificar a fórmula da `diferenca` para `caixa_atual - (valor_disp_contas - valor_contas)`.
2. **Backend (`get_dashboard_metrics` na migration `20260807000015_...`)**:
   - Ajustar o retorno e o cálculo para devolver o Fluxo de Caixa (agora semântico) igual ao Caixa Anterior.
   - Ajustar a `v_diferenca` para refletir `v_caixa_atual - (v_faturamento_atual + v_caixa_anterior - v_contas_a_pagar)`.
