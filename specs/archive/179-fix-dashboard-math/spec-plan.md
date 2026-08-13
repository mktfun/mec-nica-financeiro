# Spec Plan: Correção da Matemática Financeira do Dashboard e Conciliação (179)

## Tasks

- [x] [BACKEND] Criar nova migration `20260813085500_fix_dashboard_math.sql`.
- [x] [BACKEND] Reescrever a RPC `get_dashboard_metrics`:
  - Desacoplar `veiculos_patio_valor` da variável `v_a_receber`. `v_a_receber` deve ser igual apenas a `v_a_receber_manual`.
  - Remover a subtração `- v_saldo_negativo_itau` do cálculo de `v_caixa_atual`.
  - Atualizar o cálculo de `v_diferenca` para usar a lógica exata: `(Faturamento_Atual - Fluxo_Caixa) - (Contas_a_Pagar + Juros_Rede)`.
- [x] [BACKEND] Aplicar a migration no banco de dados.
- [x] [FRONTEND] Revisar o componente `src/components/conciliacao/ResumoDiaPanel.tsx` para assegurar que ele não adicione ou subtraia variáveis redundantes por cima dos retornos da RPC.
- [x] [TEST] Verificar visualmente no Dashboard se o Fluxo de Caixa e a Diferença fecham exatamente conforme as novas equações.
